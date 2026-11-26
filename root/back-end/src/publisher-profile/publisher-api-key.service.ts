import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import * as crypto from 'crypto';
import {
  publisher_api_keys,
  publisher_profiles,
  PublisherApiKey,
  users,
} from '../data/store';
import { appendAudit, saveNow } from '../data/persistence';
import { ReviewPublisherDto } from './publisher-api-key.dto';
import { CreateApiKeyDto, UpdateOnboardingDto } from './publisher-api-key.dto';

const ALLOWED_SCOPES = [
  'telemetry:write',
  'tournaments:read',
  'tournaments:manage',
  'games:read',
  'analytics:read',
];

const ONBOARDING_STAGES = [
  'account_created',
  'email_verified',
  'profile_complete',
  'identity_verified',
  'payment_ready',
  'publishing_eligible',
] as const;

@Injectable()
export class PublisherApiKeyService {
  simulateVerification(userId: number) {
    if (process.env.NODE_ENV === 'production' || process.env.DISABLE_DEMO_VERIFICATION === 'true') {
      throw new BadRequestException('Demo verification is disabled in this environment.');
    }
    const profile = publisher_profiles.find(p => p.user_id === userId);
    if (!profile || !['pending', 'verified'].includes(profile.kyc_status || '')) {
      throw new BadRequestException('Submit your publisher application first.');
    }
    const record = profile as any;
    record.verification_mode = 'sandbox';
    record.contact_verification = 'simulated';
    profile.kyc_status = 'verified';
    profile.onboarding_stage = 'identity_verified';
    if (record.payout_destination) {
      record.payment_review_status = 'approved';
      profile.onboarding_stage = 'payment_ready';
    }
    appendAudit({ type: 'publisher_demo_verification', msg: `Simulated verification for publisher ${userId}`, detail: 'Sandbox only: no contact, identity or bank verification performed.', actor: `user#${userId}`, actor_role: 'publisher' });
    saveNow();
    return this.getOnboardingStatus(userId);
  }
  listApplications() {
    return publisher_profiles.filter(p => p.kyc_status === 'pending' || (p as any).payment_review_status === 'pending').map(p => ({
      user_id: p.user_id, publisher_type: p.publisher_type,
      legal_name: (p as any).legal_name, country: (p as any).country,
      kyc_status: p.kyc_status, payment_review_status: (p as any).payment_review_status,
      payout_method: (p as any).payout_method,
      payout_destination_masked: (p as any).payout_destination ? '••••' + String((p as any).payout_destination).slice(-4) : null,
      org_reg_number: (p as any).org_reg_number,
    }));
  }

  reviewApplication(userId: number, reviewerId: number, dto: ReviewPublisherDto) {
    if (userId === reviewerId) throw new BadRequestException('A reviewer cannot approve their own application.');
    if (dto.reason.trim().length < 10 || dto.evidence_reference.trim().length < 5) {
      throw new BadRequestException('Provide a review reason and the verification evidence reference.');
    }
    const profile = publisher_profiles.find(p => p.user_id === userId);
    if (!profile) throw new NotFoundException('Publisher application not found.');
    const record = profile as any;
    if (dto.kind === 'identity') {
      if (profile.kyc_status !== 'pending') throw new BadRequestException('Only pending applications can be reviewed.');
      profile.kyc_status = dto.decision === 'approve' ? 'verified' : 'rejected';
      profile.onboarding_stage = dto.decision === 'approve' ? 'identity_verified' : 'profile_complete';
    } else {
      if (profile.kyc_status !== 'verified' || record.payment_review_status !== 'pending' || !record.payout_destination) {
        throw new BadRequestException('Identity must be approved and payment details submitted before payment review.');
      }
      record.payment_review_status = dto.decision === 'approve' ? 'approved' : 'rejected';
      profile.onboarding_stage = dto.decision === 'approve' ? 'payment_ready' : 'identity_verified';
    }
    record.last_review = { ...dto, reviewer_id: reviewerId, reviewed_at: new Date().toISOString() };
    appendAudit({ type: 'publisher_review', msg: `Publisher ${userId}: ${dto.kind} ${dto.decision}`, detail: JSON.stringify(record.last_review), actor: `user#${reviewerId}`, actor_role: 'admin' });
    saveNow();
    return this.getOnboardingStatus(userId);
  }
  /**
   * List all API keys belonging to a publisher.
   * Security Invariant: The secret hash is NEVER exposed in responses.
   */
  findAllKeys(userId: number) {
    return publisher_api_keys
      .filter((k) => k.user_id === userId)
      .map((k) => ({
        id: k.id,
        key_id: k.key_id,
        name: k.name,
        scopes: k.scopes,
        created_at: k.created_at,
        last_used_at: k.last_used_at || null,
      }));
  }

  /**
   * Generate a new API key pair.
   * Generates public identifier (pk_live_...) and secret token (sk_live_...).
   * Hashes secret using SHA-256 for persistent storage.
   * Secret token is returned once in response and never retrievable again.
   */
  createKey(userId: number, dto: CreateApiKeyDto) {
    if (!dto.name || !dto.name.trim()) {
      throw new BadRequestException('API key name is required');
    }

    const scopes = Array.isArray(dto.scopes) && dto.scopes.length > 0
      ? dto.scopes.filter((s) => ALLOWED_SCOPES.includes(s))
      : ['telemetry:write', 'tournaments:read'];

    if (scopes.length === 0) {
      throw new BadRequestException(
        `At least one valid scope is required: ${ALLOWED_SCOPES.join(', ')}`,
      );
    }

    const key_id = `pk_live_${crypto.randomBytes(8).toString('hex')}`;
    const secret = `sk_live_${crypto.randomBytes(24).toString('base64url')}`;
    const secret_hash = crypto.createHash('sha256').update(secret).digest('hex');
    const id = `key_${Date.now()}_${crypto.randomBytes(4).toString('hex')}`;
    const created_at = new Date().toISOString();

    const newKeyRecord: PublisherApiKey = {
      id,
      user_id: userId,
      key_id,
      secret_hash,
      name: dto.name.trim(),
      scopes,
      created_at,
      last_used_at: null,
    };

    publisher_api_keys.push(newKeyRecord);

    const userObj = users.find((u) => u.user_id === userId);
    appendAudit({
      type: 'publisher_api_key',
      msg: `Created API key "${newKeyRecord.name}" (${key_id})`,
      detail: `Scopes: ${scopes.join(', ')}`,
      actor: userObj?.user_name || `user#${userId}`,
      actor_role: 'publisher',
    });

    return {
      id,
      key_id,
      name: newKeyRecord.name,
      scopes,
      created_at,
      secret, // Returned exactly once upon generation!
      warning:
        'Save this secret key securely. It will not be shown again and cannot be recovered if lost.',
    };
  }

  /**
   * Revoke an active API key immediately.
   */
  revokeKey(userId: number, keyIdentifier: string) {
    const idx = publisher_api_keys.findIndex(
      (k) =>
        (k.id === keyIdentifier || k.key_id === keyIdentifier) &&
        k.user_id === userId,
    );

    if (idx === -1) {
      throw new NotFoundException(
        `API key '${keyIdentifier}' not found or does not belong to your account`,
      );
    }

    const [removed] = publisher_api_keys.splice(idx, 1);

    const userObj = users.find((u) => u.user_id === userId);
    appendAudit({
      type: 'publisher_api_key',
      msg: `Revoked API key "${removed.name}" (${removed.key_id})`,
      detail: `Scopes were: ${removed.scopes.join(', ')}`,
      actor: userObj?.user_name || `user#${userId}`,
      actor_role: 'publisher',
    });

    return {
      success: true,
      message: `API key '${removed.name}' (${removed.key_id}) has been permanently revoked`,
      revoked_key_id: removed.key_id,
    };
  }

  /**
   * Get 6-Stage Onboarding Checklist & Compliance Status
   */
  getOnboardingStatus(userId: number) {
    let profile = publisher_profiles.find((p) => p.user_id === userId);
    const isDemoAccount = [1, 5, 6].includes(userId) || (profile as any)?.verification_mode === 'sandbox';

    if (!profile) {
      // Default initial state for new publishers
      profile = {
        user_id: userId,
        total_games: 0,
        approved_games: 0,
        active_games: 0,
        onboarding_stage: 'account_created',
        publisher_type: 'individual',
        kyc_status: 'not_submitted',
      };
      publisher_profiles.push(profile);
    }

    // Honest demo vs production states
    let currentStage = profile.onboarding_stage || 'account_created';
    let currentKycStatus = profile.kyc_status || 'not_submitted';

    // If demo account and no specific stage set, give realistic demo states
    if (isDemoAccount && !profile.onboarding_stage) {
      if (userId === 5) {
        currentStage = 'identity_verified';
        currentKycStatus = 'pending';
      } else if (userId === 6) {
        currentStage = 'profile_complete';
        currentKycStatus = 'not_submitted';
      } else {
        currentStage = 'publishing_eligible';
        currentKycStatus = 'verified';
      }
    }

    // Legacy fixtures must not claim completed verification from a stage alone.
    if (currentKycStatus !== 'verified' && ONBOARDING_STAGES.indexOf(currentStage as any) >= 3) currentStage = 'profile_complete';
    const currentStageIdx = ONBOARDING_STAGES.indexOf(currentStage as any);

    const stagesList = [
      {
        id: 'account_created',
        index: 1,
        title: 'Account Created',
        description: 'Publisher credentials established and initial workspace ready.',
        isCompleted: currentStageIdx >= 0,
        isCurrent: currentStage === 'account_created',
      },
      {
        id: 'email_verified',
        index: 2,
        title: 'Email Verified',
        description: 'Developer primary contact address confirmed.',
        isCompleted: currentStageIdx >= 1,
        isCurrent: currentStage === 'email_verified',
      },
      {
        id: 'profile_complete',
        index: 3,
        title: 'Studio Profile Complete',
        description: 'Studio name, display bio, branding, and contact details declared.',
        isCompleted: currentStageIdx >= 2,
        isCurrent: currentStage === 'profile_complete',
      },
      {
        id: 'identity_verified',
        index: 4,
        title: 'Identity Information Review',
        description: isDemoAccount
          ? 'Simulated Verification (Demo Fixture) — In production, requires formal ID/corporate submission.'
          : 'Identity information submitted for compliance review.',
        isCompleted: currentStageIdx >= 3,
        isCurrent: currentStage === 'identity_verified',
      },
      {
        id: 'payment_ready',
        index: 5,
        title: 'Payout Coordinates Configured',
        description: 'Bank account / UPI payout destination registered for sandbox transfers.',
        isCompleted: currentStageIdx >= 4,
        isCurrent: currentStage === 'payment_ready',
      },
      {
        id: 'publishing_eligible',
        index: 6,
        title: isDemoAccount ? 'Eligible (Simulated Demo)' : 'Publishing Eligible 🚀',
        description: 'Platform access, game submission wizard, and studio API keys unlocked.',
        isCompleted: currentStageIdx >= 5,
        isCurrent: currentStage === 'publishing_eligible',
      },
    ];

    const completedCount = stagesList.filter((s) => s.isCompleted).length;
    const progressPercent = Math.round((completedCount / stagesList.length) * 100);

    return {
      user_id: userId,
      current_stage: currentStage,
      current_stage_index: currentStageIdx + 1,
      total_stages: stagesList.length,
      progress_percent: progressPercent,
      publisher_type: profile.publisher_type || 'individual',
      kyc_status: currentKycStatus,
      payment_review_status: (profile as any).payment_review_status || 'not_submitted',
      last_review: (profile as any).last_review ? { kind: (profile as any).last_review.kind, decision: (profile as any).last_review.decision, reason: (profile as any).last_review.reason } : null,
      is_demo_data: isDemoAccount,
      badge_label: isDemoAccount ? 'Simulated Verification (Demo Data)' : null,
      compliance_notice: isDemoAccount
        ? '⚠️ Demo account operating on simulated compliance records. Real-world KYC and payout verification are disabled.'
        : 'Identity information submitted for review. Final publishing eligibility requires staff approval.',
      can_publish: currentKycStatus === 'verified' && currentStageIdx >= 3,
      can_generate_keys: currentKycStatus === 'verified' && currentStageIdx >= 3,
      can_deposit: currentKycStatus === 'verified' && currentStageIdx >= 4,
      can_withdraw: currentKycStatus === 'verified' && currentStageIdx >= 4,
      stages: stagesList,
    };
  }

  /**
   * Update or Advance Onboarding Stage
   */
  updateOnboarding(userId: number, dto: UpdateOnboardingDto) {
    if (dto.kyc_status === 'verified' || dto.kyc_status === 'rejected' ||
        ['email_verified', 'payment_ready', 'publishing_eligible'].includes(dto.stage || '')) {
      throw new BadRequestException('Verification and payment approval require an authorized review. You cannot approve your own account.');
    }
    if (dto.stage === 'identity_verified' || ['pending', 'review_pending'].includes(dto.kyc_status || '')) {
      if (!dto.legal_name?.trim() || !dto.country?.trim() || !dto.street_address?.trim() || !dto.phone?.trim() || dto.terms_accepted !== true) {
        throw new BadRequestException('Complete your legal name, address, country, phone and agreement before submitting for review.');
      }
      if (dto.publisher_type === 'organization' && (!dto.org_reg_number?.trim() || !dto.authorized_rep?.trim())) {
        throw new BadRequestException('Organizations must provide registration details and an authorized representative.');
      }
      dto.stage = 'profile_complete';
      dto.kyc_status = 'pending';
    }
    const profile = publisher_profiles.find((p) => p.user_id === userId);
    if (!profile) {
      throw new NotFoundException(`Publisher profile for user ${userId} not found`);
    }

    if (dto.stage) {
      if (!ONBOARDING_STAGES.includes(dto.stage as any)) {
        throw new BadRequestException(
          `Invalid onboarding stage. Allowed: ${ONBOARDING_STAGES.join(', ')}`,
        );
      }
      profile.onboarding_stage = dto.stage;
    }

    if (dto.publisher_type) {
      profile.publisher_type = dto.publisher_type;
    }

    const identityFields = ['legal_name', 'country', 'street_address', 'phone', 'org_reg_number', 'authorized_rep'];
    if (profile.kyc_status === 'verified' && identityFields.some(key => dto[key] !== undefined && dto[key] !== (profile as any)[key])) {
      profile.kyc_status = 'pending';
      profile.onboarding_stage = 'profile_complete';
      (profile as any).payment_review_status = 'pending';
    }

    if (dto.kyc_status) {
      profile.kyc_status = dto.kyc_status as any;
    }

    if (dto.legal_name) (profile as any).legal_name = dto.legal_name;
    if (dto.country) (profile as any).country = dto.country;
    if (dto.street_address) (profile as any).street_address = dto.street_address;
    if (dto.phone) (profile as any).phone = dto.phone;
    if (dto.org_reg_number) (profile as any).org_reg_number = dto.org_reg_number;
    if (dto.authorized_rep) (profile as any).authorized_rep = dto.authorized_rep;
    if (dto.terms_accepted !== undefined) (profile as any).terms_accepted = dto.terms_accepted;
    if (dto.payout_destination?.trim()) {
      (profile as any).payout_destination = dto.payout_destination.trim();
      (profile as any).payout_method = dto.payout_method;
      (profile as any).payment_review_status = 'pending';
      if (profile.onboarding_stage === 'payment_ready' || profile.onboarding_stage === 'publishing_eligible') profile.onboarding_stage = 'identity_verified';
    }

    const userObj = users.find((u) => u.user_id === userId);
    appendAudit({
      type: 'publisher_onboarding',
      msg: `Updated onboarding for publisher ${userObj?.user_name || userId}`,
      detail: `Stage: ${profile.onboarding_stage}, KYC: ${profile.kyc_status}`,
      actor: userObj?.user_name || `user#${userId}`,
      actor_role: 'publisher',
    });

    saveNow();
    return this.getOnboardingStatus(userId);
  }
}
