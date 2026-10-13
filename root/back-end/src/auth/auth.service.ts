import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import { AuthRepository } from './auth.repository';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SessionPingDto,
} from './auth.dto';
import {
  notifications,
  password_resets,
  player_profiles,
  publisher_profiles,
  roles,
  User,
  grantDefaultKit,
} from '../data/store';
import { signToken } from './token.util';

// ── Domain Rules ────────────────────────────────────────────
// R-AUTH-1: Password must be at least 8 characters
// R-AUTH-2: Email must be unique PER ROLE, not globally. One address may hold
//           a player account and a publisher account — the same person can
//           play games and run a studio — but never two of the same kind.
//           Username remains globally unique; it is the login identifier.
// R-AUTH-3: Banned users cannot log in
// R-AUTH-4: Registration only allowed for player (4) or publisher (5) roles
// R-AUTH-5: On register, matching profile row is auto-created
// R-AUTH-6: Changing a password requires the current one, checked server-side
// R-AUTH-7: The one-account-one-session claim is minted HERE, atomically with
//           the password check — never by the client. A client-generated
//           token could never actually reach this store: db-import strips
//           active_session_token/active_session_at from every row on the way
//           in (see the comment there), so a token minted in the browser was
//           pure fiction that the very next heartbeat or sync would catch and
//           immediately sign the real, only, signed-in user back out.
// ────────────────────────────────────────────────────────────

// Matches the frontend's own SESSION_STALE_MS (js/utils.js). A claim whose
// last heartbeat is older than this is treated as abandoned — a crashed tab,
// a closed laptop lid — rather than a session worth protecting.
const SESSION_STALE_MS = 15_000;

// How long a recovery code stays usable. Short, because it travels through a
// human (an admin) rather than a mailbox.
const RESET_TTL_MS = 15 * 60 * 1000;

@Injectable()
export class AuthService {
  constructor(private readonly authRepository: AuthRepository) {}

  /**
   * Claim the one-account-one-session slot for `user`, atomically with
   * whatever just proved this caller owns the account (password check on
   * login, brand-new row on register).
   *
   * Throws ConflictException({code:'SESSION_ACTIVE'}) when another session is
   * both claimed AND still heartbeating, unless `force` is set — `force` is
   * only meant to be sent after a human has confirmed the takeover (device
   * handoff approval, or an explicit "sign in anyway").
   */
  private claimSession(user: User, force: boolean | undefined): string {
    const now = Date.now();
    const lastBeat = user.active_session_at ? Date.parse(user.active_session_at) : NaN;
    const isFree =
      !user.active_session_token || isNaN(lastBeat) || now - lastBeat > SESSION_STALE_MS;

    if (!isFree && !force) {
      throw new ConflictException({
        code: 'SESSION_ACTIVE',
        message: 'This account is signed in on another device.',
      });
    }

    const sessionToken = crypto.randomUUID();
    user.active_session_token = sessionToken;
    user.active_session_at = new Date(now).toISOString();
    return sessionToken;
  }

  // Workflow: Login
  login(dto: LoginDto) {
    // An email can now belong to a player account AND a studio account
    // (R-AUTH-2), so resolving by email can return more than one candidate.
    // The password is what selects between them; role_id narrows first when
    // the caller states which account it wants.
    let candidates: any[] = [];
    if (dto.email) {
      candidates = this.authRepository.findAllByEmail(dto.email);
      if (dto.role_id != null) {
        const scoped = candidates.filter((u) => u.role_id === dto.role_id);
        if (scoped.length) candidates = scoped;
      }
    } else if (dto.username) {
      const byName = this.authRepository.findByUsername(dto.username);
      if (byName) candidates = [byName];
    }

    if (!candidates.length) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Checked before the banned test on purpose: with several accounts sharing
    // an address, "which account is this?" can only be answered once the
    // password matches. Testing status first could report another account's
    // ban to someone signing in to their own.
    const user = candidates.find((u) => u.password === dto.password);
    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    // R-AUTH-3
    if (user.status === 'banned') {
      throw new UnauthorizedException('Account is banned. Contact support.');
    }

    this.authRepository.updateLastSeen(user.user_id);

    // R-AUTH-7. Deliberately after the password/ban checks and before the
    // response is built: a failed login must never touch the session claim,
    // and a caller that isn't really this account can't use `force` to boot
    // the real session off by guessing a username.
    const sessionToken = this.claimSession(user, dto.force);

    const role = roles.find((r) => r.role_id === user.role_id);
    const roleName = role?.role_name ?? 'player';

    return {
      user_id: user.user_id,
      user_name: user.user_name,
      username: user.user_name,
      email: user.email,
      role: roleName,
      role_id: user.role_id,
      avatar: user.avatar,
      status: user.status,
      // Signed here, by the server, from the account we just authenticated.
      // This is what the guard trusts — never the caller's `role` header.
      token: signToken(user, roleName),
      // The one-account-one-session claim, also minted server-side (see
      // claimSession above) — never by the client.
      session_token: sessionToken,
    };
  }

  /**
   * R-AUTH-8: Start a password recovery.
   *
   * Always answers the same, whether or not the address exists — otherwise this
   * endpoint becomes a way to enumerate which emails hold accounts.
   *
   * There is no mail server, so the code goes to the ADMINS as a notification.
   * They confirm who they are talking to and hand it over. That is a deliberate
   * choice, not a shortcut: emailing it is impossible here, and showing it to
   * the anonymous caller would hand every account to whoever asked for it.
   */
  forgotPassword(dto: ForgotPasswordDto) {
    const generic = {
      status: 'ok',
      message:
        'If that address has an account, a one-time code has been sent to the ' +
        'PlayCarys admins. Contact them to receive it.',
    };

    let candidates = this.authRepository.findAllByEmail(dto.email);
    if (dto.role_id != null) {
      const scoped = candidates.filter((u) => u.role_id === dto.role_id);
      if (scoped.length) candidates = scoped;
    }
    const user = candidates[0];
    if (!user) return generic;
    if (user.status === 'banned') return generic;   // no recovery path into a banned account

    // Throttle: three live codes per account is plenty, and stops this being
    // used to spam the admin notification list.
    const now = Date.now();
    const live = password_resets.filter(
      (r) => r.user_id === user.user_id && !r.used_at && Date.parse(r.expires_at) > now,
    );
    if (live.length >= 3) return generic;

    const code = String(crypto.randomInt(0, 1_000_000)).padStart(6, '0');
    password_resets.push({
      id: now,
      user_id: user.user_id,
      // Hashed: a db-export is served unauthenticated, and a plaintext code
      // sitting in it would be an account takeover waiting to happen.
      code_hash: crypto.createHash('sha256').update(code).digest('hex'),
      requested_at: new Date(now).toISOString(),
      expires_at: new Date(now + RESET_TTL_MS).toISOString(),
      used_at: null,
    });

    notifications.push({
      id: now + 1,
      toUser: null,
      toRole: 'admin',
      from: 'PlayCarys Security',
      fromUserId: 0,
      avatar: '🔑',
      fromRole: 'system',
      type: 'password_reset',
      msg:
        `Password reset requested for ${user.user_name} (${user.email}). ` +
        `One-time code: ${code} — valid ${RESET_TTL_MS / 60000} minutes. ` +
        `Only give this to someone you have confirmed owns the account.`,
      time: 'Just now',
      read: false,
      replies: [],
    } as any);

    return generic;
  }

  /**
   * R-AUTH-9: Finish a recovery.
   *
   * On success every existing session claim is cleared. That is the point: if
   * somebody else got in first and changed the password, this is what throws
   * them out rather than leaving them signed in alongside the real owner.
   */
  resetPassword(dto: ResetPasswordDto) {
    let candidates = this.authRepository.findAllByEmail(dto.email);
    if (dto.role_id != null) {
      const scoped = candidates.filter((u) => u.role_id === dto.role_id);
      if (scoped.length) candidates = scoped;
    }
    const user = candidates[0];

    // One message for every failure — wrong address, wrong code, expired code —
    // so this cannot be used to learn which of those it was.
    const fail = () =>
      new UnauthorizedException('That code is not valid, or it has expired. Request a new one.');

    if (!user) throw fail();

    const hash = crypto.createHash('sha256').update(String(dto.code).trim()).digest('hex');
    const now = Date.now();
    const row = password_resets.find(
      (r) =>
        r.user_id === user.user_id &&
        !r.used_at &&
        Date.parse(r.expires_at) > now &&
        // timingSafeEqual needs equal lengths; both are sha256 hex, so they are.
        crypto.timingSafeEqual(Buffer.from(r.code_hash, 'hex'), Buffer.from(hash, 'hex')),
    );
    if (!row) throw fail();

    if (String(dto.new_password).length < 8) {
      throw new BadRequestException('Password must be at least 8 characters.');   // R-AUTH-1
    }

    user.password = dto.new_password;
    row.used_at = new Date(now).toISOString();

    // Burn every other outstanding code for this account, so a second one
    // obtained earlier cannot be used to take it straight back.
    password_resets.forEach((r) => {
      if (r.user_id === user.user_id && !r.used_at) r.used_at = new Date(now).toISOString();
    });

    // Evict everyone. Whoever is signed in right now did not use this code.
    user.active_session_token = null;
    user.active_session_at = null;

    return { status: 'ok', message: 'Password updated. Sign in with your new password.' };
  }

  /**
   * Workflow: Change password.
   *
   * R-AUTH-6: the current password must be supplied and must match. Without
   * it, anyone who reaches an open session — a shared laptop, an unlocked
   * machine, a borrowed phone — can lock the real owner out of their own
   * account in two clicks, and the profile page offered exactly that.
   *
   * Deliberately does NOT trust the caller's claim about who they are beyond
   * the current password: knowing it is the proof. That keeps this endpoint
   * honest even though the platform's role header is client-asserted.
   */
  changePassword(dto: ChangePasswordDto) {
    const user = this.authRepository.findById(dto.user_id);
    // Same response whether the account is missing or the password is wrong,
    // so this cannot be used to test which user ids exist.
    if (!user || user.password !== dto.current_password) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (user.status === 'banned') {
      throw new UnauthorizedException('Account is banned. Contact support.');
    }

    if (dto.new_password === dto.current_password) {
      throw new BadRequestException('The new password must be different from the current one');
    }

    user.password = dto.new_password;
    // Any other device holding this account is no longer trusted: changing a
    // password is how someone locks out a session they did not authorise.
    user.active_session_token = null;
    user.active_session_at = null;

    return { message: 'Password updated' };
  }

  /**
   * Keep-alive for the one-account-one-session claim.
   *
   * The claim used to be refreshed by Presence.beat(), which called DB.save() —
   * a POST of the WHOLE database, ~160 KB. That is far too heavy to run often,
   * so it ran every 45 seconds, and the "is this session dead?" window had to be
   * wider still (100s). The cost of that: close a tab and the account stayed
   * locked for nearly two minutes, reporting "your account is open somewhere"
   * to its actual owner.
   *
   * This is the same signal in a few dozen bytes, so it can run every 5 seconds
   * and the window can close in 15.
   *
   * Returns evicted:true when the token no longer matches — that means another
   * device took the account over, and the caller should sign itself out rather
   * than keep pretending it is signed in.
   */
  heartbeat(dto: SessionPingDto) {
    const user = this.authRepository.findById(dto.user_id);
    if (!user) return { ok: false, evicted: true, reason: 'no such account' };

    if (user.active_session_token && user.active_session_token !== dto.session_token) {
      return { ok: false, evicted: true, reason: 'this account was claimed by another device' };
    }

    const now = new Date().toISOString();
    user.active_session_token = dto.session_token;
    user.active_session_at = now;
    // Presence reads lastSeen, so one ping keeps both the claim and the
    // Online/Playing badge honest.
    user.lastSeen = now;
    return { ok: true };
  }

  /**
   * Drop the claim immediately, so signing out (or closing the last tab) frees
   * the account without waiting out the staleness window.
   *
   * Only the holder of the current token may release it — otherwise anyone
   * could knock a live session off its own account by guessing a user id.
   */
  releaseSession(dto: SessionPingDto) {
    const user = this.authRepository.findById(dto.user_id);
    if (!user) return { ok: true };
    if (user.active_session_token && user.active_session_token !== dto.session_token) {
      return { ok: false, reason: 'not the holder of this session' };
    }
    user.active_session_token = null;
    user.active_session_at = null;
    return { ok: true };
  }

  // Workflow: Register
  register(dto: RegisterDto) {
    // R-AUTH-1
    if (!dto.password || dto.password.length < 8) {
      throw new BadRequestException('Password must be at least 8 characters');
    }

    // R-AUTH-4 — only player or publisher can self-register
    // Resolved before the email check, because that check is now role-scoped.
    const allowedRoles = [4, 5];
    const roleId = dto.role_id ?? 4;
    if (!allowedRoles.includes(roleId)) {
      throw new BadRequestException('Self-registration only available for player or publisher roles');
    }

    // R-AUTH-2
    if (this.authRepository.emailExistsForRole(dto.email, roleId)) {
      throw new ConflictException(
        roleId === 5
          ? 'A publisher account already uses this email'
          : 'A player account already uses this email',
      );
    }

    const newId = this.authRepository.nextId();
    const initials = dto.user_name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    const newUser = this.authRepository.create({
      user_id: newId,
      user_name: dto.user_name,
      role_id: roleId,
      email: dto.email,
      password: dto.password,
      avatar: initials,
      status: 'active',
      joinDate: new Date().toISOString().split('T')[0],
      lastSeen: new Date().toISOString().split('T')[0],
    });

    // R-AUTH-5: auto-create profile
    if (roleId === 4) {
      player_profiles.push({
        user_id: newId,
        player_name: dto.user_name,
        carys_points: 0,
        play_time: 0,
        matches_won: 0,
        player_status: true,
      });
      // Free body + outfit, so the very first profile view shows a dressed
      // character rather than a bare mannequin.
      grantDefaultKit(newId);
    } else if (roleId === 5) {
      publisher_profiles.push({
        user_id: newId,
        total_games: 0,
        approved_games: 0,
        active_games: 0,
      });
    }

    // A brand-new account has no rival session to conflict with — force is
    // irrelevant here, claimSession() just mints the first token for it. Same
    // reason as login (R-AUTH-7): minting this on the client instead would be
    // discarded by db-import as soon as the new row synced down, and the
    // freshly-registered user would be told THEY are "signed in elsewhere".
    const sessionToken = this.claimSession(newUser, true);
    const roleName = roleId === 5 ? 'publisher' : 'player';

    return {
      message: 'Registration successful',
      user_id: newUser.user_id,
      user_name: newUser.user_name,
      username: newUser.user_name,
      email: newUser.email,
      role: roleName,
      role_id: newUser.role_id,
      avatar: newUser.avatar,
      status: newUser.status,
      token: signToken(newUser, roleName),
      session_token: sessionToken,
    };
  }
}
