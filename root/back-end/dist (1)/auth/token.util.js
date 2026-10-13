"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TOKEN_TTL_MS = void 0;
exports.signToken = signToken;
exports.verifyToken = verifyToken;
exports.bearerFrom = bearerFrom;
const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
exports.TOKEN_TTL_MS = 12 * 60 * 60 * 1000;
function loadSecret() {
    if (process.env.AUTH_SECRET)
        return Buffer.from(process.env.AUTH_SECRET, 'utf8');
    const file = path.join(__dirname, '..', '..', '.auth-secret');
    try {
        if (fs.existsSync(file)) {
            const existing = fs.readFileSync(file, 'utf8').trim();
            if (existing.length >= 32)
                return Buffer.from(existing, 'utf8');
        }
    }
    catch { }
    const generated = crypto.randomBytes(48).toString('hex');
    try {
        fs.writeFileSync(file, generated, { encoding: 'utf8', mode: 0o600 });
    }
    catch (err) {
        console.warn('[auth] Could not persist the signing key; sessions will not survive a restart:', err.message);
    }
    return Buffer.from(generated, 'utf8');
}
const SECRET = loadSecret();
function b64url(input) {
    return Buffer.from(input)
        .toString('base64')
        .replace(/\+/g, '-')
        .replace(/\//g, '_')
        .replace(/=+$/, '');
}
function fromB64url(input) {
    const padded = input.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(padded + '='.repeat((4 - (padded.length % 4)) % 4), 'base64');
}
function signature(body) {
    return b64url(crypto.createHmac('sha256', SECRET).update(body).digest());
}
function signToken(user, roleName) {
    const now = Date.now();
    const payload = {
        sub: user.user_id,
        role_id: user.role_id,
        role: roleName,
        iat: now,
        exp: now + exports.TOKEN_TTL_MS,
    };
    const body = b64url(JSON.stringify(payload));
    return `${body}.${signature(body)}`;
}
function verifyToken(token) {
    if (!token || typeof token !== 'string')
        return null;
    const dot = token.indexOf('.');
    if (dot <= 0 || dot === token.length - 1)
        return null;
    const body = token.slice(0, dot);
    const provided = token.slice(dot + 1);
    const expected = signature(body);
    const a = Buffer.from(provided);
    const b = Buffer.from(expected);
    if (a.length !== b.length || !crypto.timingSafeEqual(a, b))
        return null;
    try {
        const payload = JSON.parse(fromB64url(body).toString('utf8'));
        if (typeof payload?.exp !== 'number' || Date.now() > payload.exp)
            return null;
        if (typeof payload.sub !== 'number' || typeof payload.role !== 'string')
            return null;
        return payload;
    }
    catch {
        return null;
    }
}
function bearerFrom(headerValue) {
    if (typeof headerValue !== 'string')
        return null;
    const match = /^Bearer\s+(.+)$/i.exec(headerValue.trim());
    return match ? match[1].trim() : null;
}
//# sourceMappingURL=token.util.js.map