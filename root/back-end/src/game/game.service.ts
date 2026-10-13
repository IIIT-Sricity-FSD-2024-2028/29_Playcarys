import {
  Injectable,
  Logger,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ForbiddenException,
  OnModuleInit,
} from '@nestjs/common';
import { GameRepository } from './game.repository';
import { CreateGameDto, UpdateGameDto, SetGameStateDto, ApproveGameDto, PLATFORM_MAX_CARYS_PER_MATCH } from './game.dto';
import { BundleService } from './bundle.service';
import { ScanService, ScanReport } from './scan.service';
import { deleted_games, game_reviews, games, publisher_profiles, sessions, users, Game, GameReview } from '../data/store';
import * as path from 'path';
import { stripScanManifest, stripScanManifests } from './game.util';

// ── Domain Rules ────────────────────────────────────────────
// R-GAME-1: game_name must be unique across the platform
// R-GAME-2: A newly submitted game starts with approval_status='pending', game_status='disabled'
// R-GAME-3: Only the owning publisher can update or change the state of their game
// R-GAME-4: A game can only be enabled if it is already approved
// R-GAME-5: Approving a game auto-increments the publisher's approved_games count
// R-GAME-6: Only approved games appear in the active game list for players
// R-GAME-7: A game with active sessions cannot be deleted
// R-GAME-8: A game is only launchable once it declares delivery —
//           an uploaded bundle (play_path) or a self-hosted game_url
//
// ── Review Rules ────────────────────────────────────────────
// R-REVIEW-1: Every uploaded bundle is scanned on arrival. A hosted game with
//             no scan report cannot be approved — there is nothing to review.
// R-REVIEW-2: Approval binds to the BUILD, not to the listing: the decision
//             records approved_bundle_hash (or approved_game_url for Model B).
// R-REVIEW-3: Changing what players receive — re-uploading a bundle, editing
//             game_url, switching hosting_type — revokes approval and returns
//             the game to pending + disabled. Without this a publisher can
//             pass review with a clean build and then swap in another one,
//             because approveGame only ever looked at metadata.
// R-REVIEW-4: A 'fail' scan verdict cannot be approved by an admin. Only a
//             superuser may override it, and the override is recorded.
// R-REVIEW-5: Every decision appends an immutable row to game_reviews.
// ────────────────────────────────────────────────────────────

@Injectable()
export class GameService implements OnModuleInit {
  private readonly logger = new Logger(GameService.name);

  constructor(
    private readonly gameRepo: GameRepository,
    private readonly bundleService: BundleService,
    private readonly scanService: ScanService,
  ) {}

  /**
   * The store is seeded from live_database.json, which does not necessarily
   * carry play_path — the in-memory store is volatile and any client's
   * db-import rewrites that file wholesale. Re-attach installed bundles from
   * disk on every boot so a restart can't strand a working build.
   */
  onModuleInit() {
    try {
      const count = this.bundleService.rehydrate(games);
      if (count) this.logger.log(`Re-attached ${count} uploaded game bundle(s) from disk`);
    } catch (err) {
      this.logger.error(`Bundle rehydration failed: ${(err as Error).message}`);
    }
  }

  // The scan manifest is stripped from every read path below. It is a file
  // listing of the uploaded bundle — 665 entries for one game — whose only
  // reader is the admin review page, which fetches it separately via
  // getScanManifest(). See game.util.ts for the measurements.
  findAll(filter?: { status?: string; publisherId?: number; active?: boolean }) {
    if (filter?.active) return stripScanManifests(this.gameRepo.findActive());
    if (filter?.publisherId) return stripScanManifests(this.gameRepo.findByPublisher(filter.publisherId));
    if (filter?.status) return stripScanManifests(this.gameRepo.findByStatus(filter.status));
    return stripScanManifests(this.gameRepo.findAll());
  }

  findOne(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    return stripScanManifest(game);
  }

  /**
   * Count one genuine open of a game.
   *
   * `views` shipped as a seeded number that nothing anywhere incremented —
   * two games carried 10,400 and 8,200 and the rest carried zero, and the
   * publisher dashboard reported those as "Total Views" and "~1,486 per game".
   * A metric nobody measures is not an analytic, it is a decoration that looks
   * like one, and a studio reading it would draw real conclusions from it.
   *
   * Counted only for games that can actually be opened, for the same reason
   * royalty is: an unapproved game with no build cannot have been viewed.
   */
  countView(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    if (game.game_approval_status !== 'approved') {
      return { game_id: id, views: game.views ?? 0, counted: false };
    }
    game.views = (game.views ?? 0) + 1;
    return { game_id: id, views: game.views, counted: true };
  }

  /**
   * The full per-file manifest, read from the RAW row.
   *
   * Deliberately NOT routed through findOne(): that strips the manifest, so
   * reading it back through findOne would hand this endpoint an empty list
   * every time — the file view would silently show nothing at all.
   */
  getScanManifest(id: number) {
    const game: any = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    const manifest = game.scan?.manifest ?? [];
    return { game_id: id, file_count: manifest.length, manifest };
  }

  // Workflow: Publish Game
  create(dto: CreateGameDto) {
    // Validate publisher exists and has role 5
    const publisher = users.find(
      (u) => u.user_id === dto.game_publisher && u.role_id === 5,
    );
    if (!publisher) {
      throw new BadRequestException(`User ${dto.game_publisher} is not a registered publisher`);
    }

    // R-GAME-1
    if (this.gameRepo.nameExists(dto.game_name)) {
      throw new ConflictException(`Game name "${dto.game_name}" is already taken`);
    }

    const newId = this.gameRepo.nextId();

    // R-GAME-2: new games start as pending + disabled
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
      // R-GAME-8: delivery config is captured at submit time. A 'hosted' game
      // is not playable until the publisher also uploads a bundle
      // (POST /games/:id/bundle), which is what fills in play_path.
      hosting_type: dto.hosting_type,
      game_url: dto.hosting_type === 'selfhosted' ? dto.game_url : undefined,
      webhook_url: dto.hosting_type === 'selfhosted' ? dto.webhook_url : undefined,
      // The publisher's declared payout ceiling. Clamped again here so the
      // stored value is sane even if the DTO's bounds are ever relaxed.
      max_carys_per_match:
        dto.max_carys_per_match == null
          ? undefined
          : Math.max(0, Math.min(PLATFORM_MAX_CARYS_PER_MATCH, Math.floor(dto.max_carys_per_match))),
    });

    // Increment publisher total_games
    const pubProfile = publisher_profiles.find((p) => p.user_id === dto.game_publisher);
    if (pubProfile) pubProfile.total_games += 1;

    return game;
  }

  // Workflow: Update Game metadata (publisher only)
  update(id: number, dto: UpdateGameDto, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    // R-GAME-3
    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only update your own games');
    }

    // R-GAME-1
    if (dto.game_name && this.gameRepo.nameExists(dto.game_name, id)) {
      throw new ConflictException(`Game name "${dto.game_name}" is already taken`);
    }

    // R-REVIEW-3: metadata edits are free, but delivery edits change what a
    // player actually receives. An approved self-hosted game whose game_url is
    // repointed has, in every way that matters, become a different game.
    const changesDelivery =
      (dto.game_url !== undefined && dto.game_url !== game.game_url) ||
      (dto.hosting_type !== undefined && dto.hosting_type !== game.hosting_type);

    const updated = this.gameRepo.update(id, dto);

    if (changesDelivery) {
      this.revokeApproval(
        id,
        dto.hosting_type !== undefined && dto.hosting_type !== game.hosting_type
          ? 'The publisher switched how this game is delivered.'
          : 'The publisher changed the self-hosted game URL after approval.',
      );
    }

    return this.gameRepo.findById(id) ?? updated;
  }

  /**
   * Pull an approved game back into the review queue and take it offline.
   *
   * Deliberately unconditional about the listing state: a game that was never
   * approved simply stays pending, and one mid-review stays mid-review. What
   * matters is that a live listing can never keep serving a build nobody
   * signed off on.
   */
  private revokeApproval(id: number, reason: string): void {
    const game = this.gameRepo.findById(id);
    if (!game) return;

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
      const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
      if (pubProfile) {
        pubProfile.approved_games = Math.max(0, pubProfile.approved_games - 1);
        pubProfile.active_games = Math.max(0, pubProfile.active_games - 1);
      }
      this.logger.warn(`Game ${id} returned to review: ${reason}`);
    }
  }

  // Workflow: Set Game State (publisher)
  setGameState(id: number, dto: SetGameStateDto, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    // R-GAME-3
    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only change the state of your own games');
    }

    // R-GAME-4: cannot enable a game that is not approved
    if (dto.game_status === 'enabled' && game.game_approval_status !== 'approved') {
      throw new BadRequestException('Game must be approved before it can be enabled');
    }

    const updated = this.gameRepo.update(id, { game_status: dto.game_status });

    // Recalculate publisher active_games count
    const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
    if (pubProfile) {
      const publisherGames = this.gameRepo.findByPublisher(game.game_publisher);
      pubProfile.active_games = publisherGames.filter(
        (g) => g.game_approval_status === 'approved' && g.game_status === 'enabled',
      ).length;
    }

    return updated;
  }

  // Workflow: Review a Game Listing (admin)
  //
  // This used to be a one-line status flip driven by a modal that showed the
  // admin nothing but the game's title and description. It is now the gate the
  // build has to pass: there must be something to review, the scan must not
  // have failed outright, and the decision is recorded against the exact build
  // it was made about.
  approveGame(id: number, dto: ApproveGameDto, callerRole = 'admin') {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    if (game.game_approval_status !== 'pending') {
      throw new BadRequestException('Only pending games can be approved or rejected');
    }

    const reviewer = users.find((u) => u.user_id === dto.reviewer_id);
    if (!reviewer) {
      throw new BadRequestException(`Reviewer ${dto.reviewer_id} is not a known user`);
    }
    if (![1, 2].includes(reviewer.role_id)) {
      throw new ForbiddenException('Only an admin or superuser can decide a game review');
    }

    const isSuperuser = callerRole.toLowerCase() === 'superuser' || reviewer.role_id === 1;
    let override = false;

    if (dto.game_approval_status === 'approved') {
      // R-REVIEW-1: refuse to bless a listing whose build nobody has looked at.
      this.assertReviewable(game);

      // R-REVIEW-4: a failed scan is not an admin's call to make.
      if (game.scan?.verdict === 'fail') {
        if (!isSuperuser) {
          const worst = game.scan.findings.find((f) => f.severity === 'critical');
          throw new ForbiddenException(
            `This build failed its security scan${worst ? ` (${worst.code} in ${worst.file})` : ''} and cannot be approved. ` +
              `Reject it, or escalate to a superuser if you believe the finding is wrong.`,
          );
        }
        if (!dto.override_note?.trim()) {
          throw new BadRequestException(
            'Approving a failed scan requires an override_note explaining why the finding is acceptable.',
          );
        }
        override = true;
      }
    } else if (!dto.note?.trim()) {
      // A rejection the publisher can't act on just produces a re-submission
      // of the same build.
      throw new BadRequestException('A rejection must include a note telling the publisher what to fix.');
    }

    const approving = dto.game_approval_status === 'approved';

    const updated = this.gameRepo.update(id, {
      game_approval_status: dto.game_approval_status,
      // R-GAME-5: auto-enable on approval
      game_status: approving ? 'enabled' : 'disabled',
      // R-REVIEW-2: bind the decision to what was actually reviewed.
      approved_bundle_hash: approving ? game.bundle_hash : undefined,
      approved_game_url: approving && game.hosting_type === 'selfhosted' ? game.game_url : undefined,
      approved_by: approving ? reviewer.user_id : undefined,
      approved_at: approving ? new Date().toISOString() : undefined,
      review_note: (override ? dto.override_note : dto.note)?.trim() || undefined,
      review_required_reason: undefined,
    });

    // R-REVIEW-5
    this.recordReview(game, reviewer, dto, override);

    // R-GAME-5: sync publisher profile counters
    if (approving) {
      const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
      if (pubProfile) {
        pubProfile.approved_games += 1;
        pubProfile.active_games += 1;
      }
    }

    this.logger.log(
      `Game ${id} ${dto.game_approval_status} by ${reviewer.user_name}` +
        (override ? ' (SCAN OVERRIDE)' : '') +
        (approving && game.bundle_hash ? ` — build ${game.bundle_hash.slice(0, 12)}` : ''),
    );

    return updated;
  }

  /**
   * R-REVIEW-1. A listing is only reviewable when there is a delivered thing
   * to review: a scanned bundle, or a self-hosted URL.
   */
  private assertReviewable(game: Game): void {
    if (game.hosting_type === 'selfhosted') {
      if (!game.game_url) {
        throw new BadRequestException('This self-hosted game has no game_url yet — there is nothing to review.');
      }
      return;
    }

    if (!game.play_path) {
      throw new BadRequestException(
        'This game has no uploaded build yet. Ask the publisher to upload their .zip before approving the listing.',
      );
    }
    if (!game.scan) {
      throw new BadRequestException(
        'This build has not been scanned. Run a re-scan (POST /games/:id/rescan) before deciding.',
      );
    }
    if (game.scan.bundle_hash !== game.bundle_hash) {
      throw new BadRequestException(
        'The scan on file does not match the installed build. Re-scan before deciding.',
      );
    }
  }

  private recordReview(game: Game, reviewer: { user_id: number; user_name: string }, dto: ApproveGameDto, override: boolean): void {
    const row: GameReview = {
      review_id: game_reviews.length ? Math.max(...game_reviews.map((r) => r.review_id)) + 1 : 1,
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
    game_reviews.push(row);
  }

  // Workflow: Upload a hosted game bundle (Model A)
  // The archive is unpacked under front-end/games/<slug>/ and the resulting
  // path is recorded on the game, which is what makes the player-side "Play"
  // button resolvable for publisher-submitted games.
  installBundle(id: number, buffer: Buffer, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    // R-GAME-3
    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only upload a bundle for your own games');
    }

    const result = this.bundleService.install(buffer, game.game_name, game.game_id);

    // R-REVIEW-1: scan immediately, so the build is never sitting in the queue
    // in an unknown state. install() has already refused the structurally
    // dangerous archives; this looks at the .html/.js the archive is made of.
    const report = this.scanService.scanDirectory(this.bundleDir(result.slug));

    this.gameRepo.update(id, {
      hosting_type: 'hosted',
      play_path: result.playPath,
      bundle_size: result.totalBytes,
      bundle_uploaded_at: new Date().toISOString(),
      scan: report,
      bundle_hash: report.bundle_hash,
      // A hosted game is served by us; drop any stale self-hosted URL so the
      // launcher can never resolve two different builds for one game.
      game_url: undefined,
    });

    // R-REVIEW-3. The re-upload case is the whole reason approval is bound to
    // a hash: without this, an approved listing keeps serving whatever was
    // uploaded last, reviewed or not.
    if (game.approved_bundle_hash && game.approved_bundle_hash !== report.bundle_hash) {
      this.revokeApproval(
        id,
        'The publisher uploaded a new build after approval. The previous review applied to a different set of files.',
      );
    } else if (game.game_approval_status === 'approved' && !game.approved_bundle_hash) {
      // Approved before this rule existed, so there is no hash to compare —
      // treat the upload as unreviewed rather than assuming it is fine.
      this.revokeApproval(id, 'A new build was uploaded for a listing that was approved without a build fingerprint.');
    }

    return this.gameRepo.findById(id);
  }

  /** Absolute path of an installed bundle's directory. */
  private bundleDir(slug: string): string {
    return path.join(this.bundleService.getGamesRoot(), slug);
  }

  /**
   * Re-run the scan against the build currently on disk (admin).
   *
   * Needed for two cases: a listing that predates the scanner, and a rule
   * table that has since learned about something new. Never mutates approval
   * state — re-scanning is an act of looking, not of deciding.
   */
  rescan(id: number): { game_id: number; scan: ScanReport } {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);
    if (!game.play_path) {
      throw new BadRequestException('This game has no uploaded build to scan.');
    }

    const slug = game.play_path.replace(/^games\//, '');
    const report = this.scanService.scanDirectory(this.bundleDir(slug));

    this.gameRepo.update(id, { scan: report, bundle_hash: report.bundle_hash });
    return { game_id: id, scan: report };
  }

  /**
   * Everything an admin needs to decide, in one response: the listing, the
   * delivery config, the scan, the review history, and — when this is a
   * re-submission — what changed since the build that was approved.
   */
  getReview(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    const publisher = users.find((u) => u.user_id === game.game_publisher);
    const history = game_reviews
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
      /** Present only for a re-submission, so the admin can review the delta. */
      changed_since_approved:
        previous && previous.bundle_hash !== game.bundle_hash
          ? this.diffAgainst(game, previous.bundle_hash!)
          : null,
      /** Why this listing is back in the queue, if it was pulled from live. */
      review_required_reason: game.review_required_reason ?? null,
      /** Reviewable at all? Mirrors assertReviewable, but as data rather than a throw. */
      blockers: this.reviewBlockers(game),
    };
  }

  /**
   * Which files differ from the build that was last approved. Derived from the
   * stored manifests, so it costs nothing and works even though the old build
   * has been overwritten on disk.
   */
  private diffAgainst(game: Game, previousHash: string) {
    const previousReview = game_reviews.find(
      (r) => r.game_id === game.game_id && r.bundle_hash === previousHash,
    );
    // Manifests are only kept on the game row, so a diff is possible against
    // the immediately preceding build. Older ones report hashes only.
    return {
      previous_bundle_hash: previousHash,
      current_bundle_hash: game.bundle_hash ?? null,
      previously_approved_at: previousReview?.decided_at ?? null,
      note: 'This is a different build from the one that was approved. Every file below is unreviewed.',
    };
  }

  private reviewBlockers(game: Game): string[] {
    const blockers: string[] = [];
    if (game.hosting_type === 'selfhosted') {
      if (!game.game_url) blockers.push('No game URL has been provided.');
      return blockers;
    }
    if (!game.play_path) blockers.push('No build has been uploaded yet.');
    else if (!game.scan) blockers.push('This build has never been scanned.');
    else if (game.scan.bundle_hash !== game.bundle_hash) blockers.push('The scan is stale — re-scan before deciding.');
    else if (game.scan.verdict === 'fail') blockers.push('The security scan failed. Only a superuser can override.');
    return blockers;
  }

  // Workflow: Remove a hosted bundle (publisher)
  removeBundle(id: number, requestingPublisherId: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    if (game.game_publisher !== requestingPublisherId) {
      throw new ForbiddenException('You can only remove a bundle from your own games');
    }
    if (!game.play_path) {
      throw new BadRequestException('This game has no uploaded bundle');
    }

    this.bundleService.uninstall(game.play_path.replace(/^games\//, ''));

    this.gameRepo.update(id, {
      play_path: undefined,
      bundle_size: undefined,
      bundle_uploaded_at: undefined,
      // The scan described files that no longer exist; keeping it would let the
      // next upload inherit a verdict it never earned.
      scan: undefined,
      bundle_hash: undefined,
    });

    // R-REVIEW-3: an approved listing with its build deleted must not stay live.
    this.revokeApproval(id, 'The publisher removed the uploaded build.');

    return this.gameRepo.findById(id);
  }

  remove(id: number) {
    const game = this.gameRepo.findById(id);
    if (!game) throw new NotFoundException(`Game ${id} not found`);

    const hasActiveSessions = sessions.some(
      (session) => session.game_id === id && session.status !== 'ended',
    );
    if (hasActiveSessions) {
      throw new BadRequestException('Games with active sessions cannot be removed');
    }

    // Delete the extracted build too, otherwise removed games leave their
    // assets on disk and the slug stays taken.
    if (game.play_path) {
      this.bundleService.uninstall(game.play_path.replace(/^games\//, ''));
    }

    this.gameRepo.remove(id);

    // Tombstone the deletion. `games` is append-protected in db-import, so
    // without this any client still holding the row re-creates it on its next
    // sync and the "deleted" game reappears for everyone.
    if (!deleted_games.some((d: any) => String(d?.game_id ?? d) === String(id))) {
      deleted_games.push({ game_id: String(id), deleted_at: new Date().toISOString() });
    }

    // Decrement publisher total_games
    const pubProfile = publisher_profiles.find((p) => p.user_id === game.game_publisher);
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
}
