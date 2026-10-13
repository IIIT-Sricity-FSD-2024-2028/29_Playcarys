"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var BundleService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.BundleService = exports.MAX_BUNDLE_BYTES = void 0;
const common_1 = require("@nestjs/common");
const fs = require("fs");
const path = require("path");
const zip_util_1 = require("./zip.util");
const BLOCKED_EXTENSIONS = new Set([
    '.exe', '.bat', '.cmd', '.com', '.sh', '.dll', '.so', '.dylib',
    '.msi', '.vbs', '.ps1', '.jar', '.php', '.asp', '.aspx', '.jsp', '.py', '.rb',
]);
const BLOCKED_NAMES = new Set(['.htaccess', 'web.config', '.user.ini']);
exports.MAX_BUNDLE_BYTES = 50 * 1024 * 1024;
const MANIFEST_FILE = '.bundles.json';
let BundleService = BundleService_1 = class BundleService {
    constructor() {
        this.logger = new common_1.Logger(BundleService_1.name);
    }
    getGamesRoot() {
        if (process.env.GAMES_DIR)
            return process.env.GAMES_DIR;
        const candidates = [
            path.join(process.cwd(), '..', 'front-end', 'games'),
            path.join(process.cwd(), 'front-end', 'games'),
        ];
        let dir = __dirname;
        for (let i = 0; i < 6; i++) {
            candidates.push(path.join(dir, 'front-end', 'games'));
            dir = path.dirname(dir);
        }
        const existing = candidates.find((c) => fs.existsSync(c));
        if (existing)
            return existing;
        const fallback = candidates[0];
        fs.mkdirSync(fallback, { recursive: true });
        return fallback;
    }
    buildSlug(gameName, gameId) {
        const base = String(gameName || '')
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .slice(0, 40);
        return `${base || 'game'}-${gameId}`;
    }
    install(buffer, gameName, gameId) {
        if (!buffer?.length)
            throw new common_1.BadRequestException('No file was uploaded');
        if (buffer.length > exports.MAX_BUNDLE_BYTES) {
            throw new common_1.BadRequestException(`Bundle is ${(buffer.length / 1024 / 1024).toFixed(1)} MB — the limit is ${exports.MAX_BUNDLE_BYTES / 1024 / 1024} MB. ` +
                `For a build this large, submit it as a self-hosted game instead.`);
        }
        let entries;
        try {
            entries = (0, zip_util_1.readZip)(buffer);
        }
        catch (err) {
            if (err instanceof zip_util_1.ZipError)
                throw new common_1.BadRequestException(err.message);
            throw err;
        }
        entries = this.stripWrapperFolder(entries);
        this.assertSafe(entries);
        const entryFile = entries.find((e) => e.path === 'index.html');
        if (!entryFile) {
            throw new common_1.BadRequestException('No index.html at the root of the archive. Zip the *contents* of your build ' +
                'folder, not the folder itself.');
        }
        const slug = this.buildSlug(gameName, gameId);
        const target = path.join(this.getGamesRoot(), slug);
        const staging = `${target}.incoming-${process.pid}`;
        fs.rmSync(staging, { recursive: true, force: true });
        let totalBytes = 0;
        try {
            for (const entry of entries) {
                const dest = path.join(staging, entry.path);
                if (!this.isInside(staging, dest)) {
                    throw new common_1.BadRequestException(`Entry "${entry.path}" resolves outside the target directory`);
                }
                fs.mkdirSync(path.dirname(dest), { recursive: true });
                fs.writeFileSync(dest, entry.contents);
                totalBytes += entry.contents.length;
            }
            const previous = `${target}.old-${process.pid}`;
            if (fs.existsSync(target))
                fs.renameSync(target, previous);
            fs.renameSync(staging, target);
            fs.rmSync(previous, { recursive: true, force: true });
        }
        catch (err) {
            fs.rmSync(staging, { recursive: true, force: true });
            throw err;
        }
        const record = {
            game_id: gameId,
            slug,
            play_path: `games/${slug}`,
            bundle_size: totalBytes,
            bundle_uploaded_at: new Date().toISOString(),
        };
        this.recordInManifest(record);
        this.logger.log(`Installed bundle for game ${gameId} -> games/${slug} (${entries.length} files)`);
        return {
            slug,
            playPath: record.play_path,
            entryFile: 'index.html',
            fileCount: entries.length,
            totalBytes,
        };
    }
    uninstall(slug) {
        if (!slug || !/^[a-z0-9-]+$/.test(slug))
            return;
        const target = path.join(this.getGamesRoot(), slug);
        if (this.isInside(this.getGamesRoot(), target)) {
            fs.rmSync(target, { recursive: true, force: true });
        }
        this.writeManifest(this.readManifest().filter((e) => e.slug !== slug));
    }
    manifestPath() {
        return path.join(this.getGamesRoot(), MANIFEST_FILE);
    }
    readManifest() {
        try {
            const raw = fs.readFileSync(this.manifestPath(), 'utf8');
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        }
        catch {
            return [];
        }
    }
    writeManifest(entries) {
        try {
            fs.writeFileSync(this.manifestPath(), JSON.stringify(entries, null, 2), 'utf8');
        }
        catch (err) {
            this.logger.error(`Could not write ${MANIFEST_FILE}: ${err.message}`);
        }
    }
    recordInManifest(entry) {
        const entries = this.readManifest().filter((e) => e.game_id !== entry.game_id);
        entries.push(entry);
        this.writeManifest(entries);
    }
    rehydrate(games) {
        const root = this.getGamesRoot();
        const manifest = this.readManifest();
        const byGameId = new Map();
        for (const entry of manifest) {
            if (fs.existsSync(path.join(root, entry.slug, 'index.html'))) {
                byGameId.set(entry.game_id, entry);
            }
            else {
                this.logger.warn(`Pruning manifest entry for missing bundle "${entry.slug}"`);
            }
        }
        let dirs = [];
        try {
            dirs = fs
                .readdirSync(root, { withFileTypes: true })
                .filter((d) => d.isDirectory())
                .map((d) => d.name);
        }
        catch {
            return 0;
        }
        for (const dir of dirs) {
            const match = /^(.*)-(\d+)$/.exec(dir);
            if (!match)
                continue;
            const gameId = parseInt(match[2], 10);
            if (byGameId.has(gameId))
                continue;
            if (!fs.existsSync(path.join(root, dir, 'index.html')))
                continue;
            if (!games.some((g) => g.game_id === gameId))
                continue;
            this.logger.warn(`Adopting unregistered bundle directory "${dir}" for game ${gameId}`);
            byGameId.set(gameId, {
                game_id: gameId,
                slug: dir,
                play_path: `games/${dir}`,
                bundle_size: 0,
                bundle_uploaded_at: new Date().toISOString(),
            });
        }
        let applied = 0;
        for (const game of games) {
            const entry = byGameId.get(game.game_id);
            if (!entry)
                continue;
            game.hosting_type = 'hosted';
            game.play_path = entry.play_path;
            game.bundle_size = entry.bundle_size;
            game.bundle_uploaded_at = entry.bundle_uploaded_at;
            applied++;
        }
        this.writeManifest([...byGameId.values()]);
        return applied;
    }
    stripWrapperFolder(entries) {
        const meaningful = entries.filter((e) => !e.path.startsWith('__MACOSX/') && path.basename(e.path) !== '.DS_Store');
        if (!meaningful.length)
            throw new common_1.BadRequestException('Archive contains no usable files');
        if (meaningful.some((e) => e.path === 'index.html'))
            return meaningful;
        const firstSegments = new Set(meaningful.map((e) => e.path.split('/')[0]));
        if (firstSegments.size !== 1)
            return meaningful;
        const wrapper = `${[...firstSegments][0]}/`;
        const stripped = meaningful
            .filter((e) => e.path.startsWith(wrapper))
            .map((e) => ({ ...e, path: e.path.slice(wrapper.length) }));
        return stripped.some((e) => e.path === 'index.html') ? stripped : meaningful;
    }
    assertSafe(entries) {
        for (const entry of entries) {
            const base = path.basename(entry.path).toLowerCase();
            const ext = path.extname(base);
            if (BLOCKED_EXTENSIONS.has(ext)) {
                throw new common_1.BadRequestException(`Blocked file "${entry.path}" — ${ext} files cannot run in a browser and are not allowed in a game bundle.`);
            }
            if (BLOCKED_NAMES.has(base)) {
                throw new common_1.BadRequestException(`Blocked file "${entry.path}" — server config files are not allowed.`);
            }
        }
    }
    isInside(parent, child) {
        const rel = path.relative(path.resolve(parent), path.resolve(child));
        return !!rel && !rel.startsWith('..') && !path.isAbsolute(rel);
    }
};
exports.BundleService = BundleService;
exports.BundleService = BundleService = BundleService_1 = __decorate([
    (0, common_1.Injectable)()
], BundleService);
//# sourceMappingURL=bundle.service.js.map