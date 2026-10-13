"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var GameService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.GameService = void 0;
const common_1 = require("@nestjs/common");
const game_repository_1 = require("./game.repository");
const game_dto_1 = require("./game.dto");
const bundle_service_1 = require("./bundle.service");
const scan_service_1 = require("./scan.service");
const store_1 = require("../data/store");
const path = require("path");
let GameService = GameService_1 = class GameService {
    constructor(gameRepo, bundleService, scanService) {
        this.gameRepo = gameRepo;
        this.bundleService = bundleService;
        this.scanService = scanService;
        this.logger = new common_1.Logger(GameService_1.name);
    }
    onModuleInit() {
        try {
            const count = this.bundleService.rehydrate(store_1.games);
            if (count)
                this.logger.log(`Re-attached ${count} uploaded game bundle(s) from disk`);
        }
        catch (err) {
            this.logger.error(`Bundle rehydration failed: ${err.message}`);
        }
    }
    findAll(filter) {
        if (filter?.active)
            return this.gameRepo.findActive();
        if (filter?.publisherId)
            return this.gameRepo.findByPublisher(filter.publisherId);
        if (filter?.status)
            return this.gameRepo.findByStatus(filter.status);
        return this.gameRepo.findAll();
    }
    findOne(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        return game;
    }
    create(dto) {
        const publisher = store_1.users.find((u) => u.user_id === dto.game_publisher && u.role_id === 5);
        if (!publisher) {
            throw new common_1.BadRequestException(`User ${dto.game_publisher} is not a registered publisher`);
        }
        if (this.gameRepo.nameExists(dto.game_name)) {
            throw new common_1.ConflictException(`Game name "${dto.game_name}" is already taken`);
        }
        const newId = this.gameRepo.nextId();
        const game = this.gameRepo.create({
            game_id: newId,
            game_name: dto.game_name,
            game_type: dto.game_type,
            game_status: 'disabled',
            game_approval_status: 'pending',
            game_publisher: dto.game_publisher,
            desc: dto.desc,
            players: dto.players,
            img: dto.img ?? '',
            rating: 0,
            views: 0,
            submittedDate: new Date().toISOString().split('T')[0],
            sessions: 0,
            hosting_type: dto.hosting_type,
            game_url: dto.hosting_type === 'selfhosted' ? dto.game_url : undefined,
            webhook_url: dto.hosting_type === 'selfhosted' ? dto.webhook_url : undefined,
            max_carys_per_match: dto.max_carys_per_match == null
                ? undefined
                : Math.max(0, Math.min(game_dto_1.PLATFORM_MAX_CARYS_PER_MATCH, Math.floor(dto.max_carys_per_match))),
        });
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === dto.game_publisher);
        if (pubProfile)
            pubProfile.total_games += 1;
        return game;
    }
    update(id, dto, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only update your own games');
        }
        if (dto.game_name && this.gameRepo.nameExists(dto.game_name, id)) {
            throw new common_1.ConflictException(`Game name "${dto.game_name}" is already taken`);
        }
        const changesDelivery = (dto.game_url !== undefined && dto.game_url !== game.game_url) ||
            (dto.hosting_type !== undefined && dto.hosting_type !== game.hosting_type);
        const updated = this.gameRepo.update(id, dto);
        if (changesDelivery) {
            this.revokeApproval(id, dto.hosting_type !== undefined && dto.hosting_type !== game.hosting_type
                ? 'The publisher switched how this game is delivered.'
                : 'The publisher changed the self-hosted game URL after approval.');
        }
        return this.gameRepo.findById(id) ?? updated;
    }
    revokeApproval(id, reason) {
        const game = this.gameRepo.findById(id);
        if (!game)
            return;
        const wasApproved = game.game_approval_status === 'approved';
        this.gameRepo.update(id, {
            game_approval_status: 'pending',
            game_status: 'disabled',
            approved_bundle_hash: undefined,
            approved_game_url: undefined,
            approved_by: undefined,
            approved_at: undefined,
            review_required_reason: reason,
        });
        if (wasApproved) {
            const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
            if (pubProfile) {
                pubProfile.approved_games = Math.max(0, pubProfile.approved_games - 1);
                pubProfile.active_games = Math.max(0, pubProfile.active_games - 1);
            }
            this.logger.warn(`Game ${id} returned to review: ${reason}`);
        }
    }
    setGameState(id, dto, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only change the state of your own games');
        }
        if (dto.game_status === 'enabled' && game.game_approval_status !== 'approved') {
            throw new common_1.BadRequestException('Game must be approved before it can be enabled');
        }
        const updated = this.gameRepo.update(id, { game_status: dto.game_status });
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
        if (pubProfile) {
            const publisherGames = this.gameRepo.findByPublisher(game.game_publisher);
            pubProfile.active_games = publisherGames.filter((g) => g.game_approval_status === 'approved' && g.game_status === 'enabled').length;
        }
        return updated;
    }
    approveGame(id, dto, callerRole = 'admin') {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_approval_status !== 'pending') {
            throw new common_1.BadRequestException('Only pending games can be approved or rejected');
        }
        const reviewer = store_1.users.find((u) => u.user_id === dto.reviewer_id);
        if (!reviewer) {
            throw new common_1.BadRequestException(`Reviewer ${dto.reviewer_id} is not a known user`);
        }
        if (![1, 2].includes(reviewer.role_id)) {
            throw new common_1.ForbiddenException('Only an admin or superuser can decide a game review');
        }
        const isSuperuser = callerRole.toLowerCase() === 'superuser' || reviewer.role_id === 1;
        let override = false;
        if (dto.game_approval_status === 'approved') {
            this.assertReviewable(game);
            if (game.scan?.verdict === 'fail') {
                if (!isSuperuser) {
                    const worst = game.scan.findings.find((f) => f.severity === 'critical');
                    throw new common_1.ForbiddenException(`This build failed its security scan${worst ? ` (${worst.code} in ${worst.file})` : ''} and cannot be approved. ` +
                        `Reject it, or escalate to a superuser if you believe the finding is wrong.`);
                }
                if (!dto.override_note?.trim()) {
                    throw new common_1.BadRequestException('Approving a failed scan requires an override_note explaining why the finding is acceptable.');
                }
                override = true;
            }
        }
        else if (!dto.note?.trim()) {
            throw new common_1.BadRequestException('A rejection must include a note telling the publisher what to fix.');
        }
        const approving = dto.game_approval_status === 'approved';
        const updated = this.gameRepo.update(id, {
            game_approval_status: dto.game_approval_status,
            game_status: approving ? 'enabled' : 'disabled',
            approved_bundle_hash: approving ? game.bundle_hash : undefined,
            approved_game_url: approving && game.hosting_type === 'selfhosted' ? game.game_url : undefined,
            approved_by: approving ? reviewer.user_id : undefined,
            approved_at: approving ? new Date().toISOString() : undefined,
            review_note: (override ? dto.override_note : dto.note)?.trim() || undefined,
            review_required_reason: undefined,
        });
        this.recordReview(game, reviewer, dto, override);
        if (approving) {
            const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
            if (pubProfile) {
                pubProfile.approved_games += 1;
                pubProfile.active_games += 1;
            }
        }
        this.logger.log(`Game ${id} ${dto.game_approval_status} by ${reviewer.user_name}` +
            (override ? ' (SCAN OVERRIDE)' : '') +
            (approving && game.bundle_hash ? ` — build ${game.bundle_hash.slice(0, 12)}` : ''));
        return updated;
    }
    assertReviewable(game) {
        if (game.hosting_type === 'selfhosted') {
            if (!game.game_url) {
                throw new common_1.BadRequestException('This self-hosted game has no game_url yet — there is nothing to review.');
            }
            return;
        }
        if (!game.play_path) {
            throw new common_1.BadRequestException('This game has no uploaded build yet. Ask the publisher to upload their .zip before approving the listing.');
        }
        if (!game.scan) {
            throw new common_1.BadRequestException('This build has not been scanned. Run a re-scan (POST /games/:id/rescan) before deciding.');
        }
        if (game.scan.bundle_hash !== game.bundle_hash) {
            throw new common_1.BadRequestException('The scan on file does not match the installed build. Re-scan before deciding.');
        }
    }
    recordReview(game, reviewer, dto, override) {
        const row = {
            review_id: store_1.game_reviews.length ? Math.max(...store_1.game_reviews.map((r) => r.review_id)) + 1 : 1,
            game_id: game.game_id,
            reviewer_id: reviewer.user_id,
            reviewer_name: reviewer.user_name,
            decision: dto.game_approval_status,
            bundle_hash: game.bundle_hash,
            game_url: game.hosting_type === 'selfhosted' ? game.game_url : undefined,
            scan_verdict: game.scan?.verdict,
            scan_summary: game.scan?.summary,
            note: (override ? dto.override_note : dto.note)?.trim() || '',
            override,
            decided_at: new Date().toISOString(),
        };
        store_1.game_reviews.push(row);
    }
    installBundle(id, buffer, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only upload a bundle for your own games');
        }
        const result = this.bundleService.install(buffer, game.game_name, game.game_id);
        const report = this.scanService.scanDirectory(this.bundleDir(result.slug));
        this.gameRepo.update(id, {
            hosting_type: 'hosted',
            play_path: result.playPath,
            bundle_size: result.totalBytes,
            bundle_uploaded_at: new Date().toISOString(),
            scan: report,
            bundle_hash: report.bundle_hash,
            game_url: undefined,
        });
        if (game.approved_bundle_hash && game.approved_bundle_hash !== report.bundle_hash) {
            this.revokeApproval(id, 'The publisher uploaded a new build after approval. The previous review applied to a different set of files.');
        }
        else if (game.game_approval_status === 'approved' && !game.approved_bundle_hash) {
            this.revokeApproval(id, 'A new build was uploaded for a listing that was approved without a build fingerprint.');
        }
        return this.gameRepo.findById(id);
    }
    bundleDir(slug) {
        return path.join(this.bundleService.getGamesRoot(), slug);
    }
    rescan(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (!game.play_path) {
            throw new common_1.BadRequestException('This game has no uploaded build to scan.');
        }
        const slug = game.play_path.replace(/^games\//, '');
        const report = this.scanService.scanDirectory(this.bundleDir(slug));
        this.gameRepo.update(id, { scan: report, bundle_hash: report.bundle_hash });
        return { game_id: id, scan: report };
    }
    getReview(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        const publisher = store_1.users.find((u) => u.user_id === game.game_publisher);
        const history = store_1.game_reviews
            .filter((r) => r.game_id === id)
            .sort((a, b) => b.decided_at.localeCompare(a.decided_at));
        const previous = history.find((r) => r.decision === 'approved' && r.bundle_hash);
        return {
            game,
            publisher: publisher
                ? { user_id: publisher.user_id, user_name: publisher.user_name, email: publisher.email, status: publisher.status }
                : null,
            scan: game.scan ?? null,
            history,
            changed_since_approved: previous && previous.bundle_hash !== game.bundle_hash
                ? this.diffAgainst(game, previous.bundle_hash)
                : null,
            review_required_reason: game.review_required_reason ?? null,
            blockers: this.reviewBlockers(game),
        };
    }
    diffAgainst(game, previousHash) {
        const previousReview = store_1.game_reviews.find((r) => r.game_id === game.game_id && r.bundle_hash === previousHash);
        return {
            previous_bundle_hash: previousHash,
            current_bundle_hash: game.bundle_hash ?? null,
            previously_approved_at: previousReview?.decided_at ?? null,
            note: 'This is a different build from the one that was approved. Every file below is unreviewed.',
        };
    }
    reviewBlockers(game) {
        const blockers = [];
        if (game.hosting_type === 'selfhosted') {
            if (!game.game_url)
                blockers.push('No game URL has been provided.');
            return blockers;
        }
        if (!game.play_path)
            blockers.push('No build has been uploaded yet.');
        else if (!game.scan)
            blockers.push('This build has never been scanned.');
        else if (game.scan.bundle_hash !== game.bundle_hash)
            blockers.push('The scan is stale — re-scan before deciding.');
        else if (game.scan.verdict === 'fail')
            blockers.push('The security scan failed. Only a superuser can override.');
        return blockers;
    }
    removeBundle(id, requestingPublisherId) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        if (game.game_publisher !== requestingPublisherId) {
            throw new common_1.ForbiddenException('You can only remove a bundle from your own games');
        }
        if (!game.play_path) {
            throw new common_1.BadRequestException('This game has no uploaded bundle');
        }
        this.bundleService.uninstall(game.play_path.replace(/^games\//, ''));
        this.gameRepo.update(id, {
            play_path: undefined,
            bundle_size: undefined,
            bundle_uploaded_at: undefined,
            scan: undefined,
            bundle_hash: undefined,
        });
        this.revokeApproval(id, 'The publisher removed the uploaded build.');
        return this.gameRepo.findById(id);
    }
    remove(id) {
        const game = this.gameRepo.findById(id);
        if (!game)
            throw new common_1.NotFoundException(`Game ${id} not found`);
        const hasActiveSessions = store_1.sessions.some((session) => session.game_id === id && session.status !== 'ended');
        if (hasActiveSessions) {
            throw new common_1.BadRequestException('Games with active sessions cannot be removed');
        }
        if (game.play_path) {
            this.bundleService.uninstall(game.play_path.replace(/^games\//, ''));
        }
        this.gameRepo.remove(id);
        if (!store_1.deleted_games.some((d) => String(d?.game_id ?? d) === String(id))) {
            store_1.deleted_games.push({ game_id: String(id), deleted_at: new Date().toISOString() });
        }
        const pubProfile = store_1.publisher_profiles.find((p) => p.user_id === game.game_publisher);
        if (pubProfile) {
            pubProfile.total_games = Math.max(0, pubProfile.total_games - 1);
            if (game.game_approval_status === 'approved') {
                pubProfile.approved_games = Math.max(0, pubProfile.approved_games - 1);
            }
            if (game.game_status === 'enabled') {
                pubProfile.active_games = Math.max(0, pubProfile.active_games - 1);
            }
        }
        return { message: `Game ${id} removed` };
    }
};
exports.GameService = GameService;
exports.GameService = GameService = GameService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [game_repository_1.GameRepository,
        bundle_service_1.BundleService,
        scan_service_1.ScanService])
], GameService);
//# sourceMappingURL=game.service.js.map