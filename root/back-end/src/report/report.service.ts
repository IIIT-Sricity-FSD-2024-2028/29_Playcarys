import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { ReportRepository } from './report.repository';
import { CreateReportDto, UpdateReportStatusDto } from './report.dto';
import { roles, users } from '../data/store';

// ── Domain Rules ────────────────────────────────────────────
// R-RPT-1: A player cannot report themselves
// R-RPT-2: Both reporter and reported user must exist
// R-RPT-3: Duplicate reports (same reporter, same target, same type, still open) are rejected
// R-RPT-4: reason must not be empty
// R-RPT-5: Only moderators/admins can update report status
// R-RPT-6: A resolved or rejected report cannot be re-opened
// R-RPT-7: Report type must be a known category
// ────────────────────────────────────────────────────────────

const VALID_REPORT_TYPES = [
  'Toxic Behavior',
  'Cheating',
  'Griefing',
  'Harassment',
  'Spam',
  'Inappropriate Username',
  'Other',
];

@Injectable()
export class ReportService {
  constructor(private readonly repo: ReportRepository) {}

  findAll(filter?: { status?: string; reportedUserId?: number; reporterId?: number }) {
    if (filter?.status) return this.enrichAll(this.repo.findByStatus(filter.status));
    if (filter?.reportedUserId) return this.enrichAll(this.repo.findByReportedUser(filter.reportedUserId));
    if (filter?.reporterId) return this.enrichAll(this.repo.findByReporter(filter.reporterId));
    return this.enrichAll(this.repo.findAll());
  }

  findOne(id: number) {
    const report = this.repo.findById(id);
    if (!report) throw new NotFoundException(`Report ${id} not found`);
    return this.enrich(report);
  }

  // Workflow: Submit a player report
  create(dto: CreateReportDto) {
    // R-RPT-2
    const reporter = users.find((u) => u.user_id === dto.reported_by);
    if (!reporter) throw new NotFoundException(`Reporter user ${dto.reported_by} not found`);

    const reported = users.find((u) => u.user_id === dto.reported_user);
    if (!reported) throw new NotFoundException(`Reported user ${dto.reported_user} not found`);

    // R-RPT-1
    if (dto.reported_by === dto.reported_user) {
      throw new BadRequestException('A player cannot report themselves');
    }

    // R-RPT-4
    if (!dto.reason || dto.reason.trim().length === 0) {
      throw new BadRequestException('Report reason cannot be empty');
    }

    // R-RPT-7
    if (!VALID_REPORT_TYPES.includes(dto.type)) {
      throw new BadRequestException(
        `Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`,
      );
    }

    // R-RPT-3: Spam/duplicate detection
    if (this.repo.isDuplicate(dto.reported_by, dto.reported_user, dto.type)) {
      throw new ConflictException(
        'A similar open report against this player already exists from you. Please wait for it to be resolved.',
      );
    }

    const newId = this.repo.nextId();
    const report = this.repo.create({
      report_id: newId,
      reported_by: dto.reported_by,
      reported_user: dto.reported_user,
      type: dto.type,
      reason: dto.reason.trim(),
      status: 'pending',
      report_date: new Date().toISOString().split('T')[0],
      session: dto.session ?? '',
      sessionId: dto.sessionId ?? 0,
      time: 'Just now',
      actionNote: '',
    });

    return this.enrich(report);
  }

  // Workflow: Moderator updates report status (review → resolved/rejected)
  updateStatus(id: number, dto: UpdateReportStatusDto) {
    const report = this.repo.findById(id);
    if (!report) throw new NotFoundException(`Report ${id} not found`);

    const requester = users.find((u) => u.user_id === dto.requester_user_id);
    if (!requester) {
      throw new NotFoundException(`Requester user ${dto.requester_user_id} not found`);
    }

    const requesterRole = roles.find((role) => role.role_id === requester.role_id)?.role_name;
    const allowedRoles = new Set(['superuser', 'admin', 'moderator']);
    if (!requesterRole || !allowedRoles.has(requesterRole)) {
      throw new ForbiddenException('Only moderators, admins, or superusers can update report status');
    }

    // R-RPT-6
    if (report.status === 'resolved' || report.status === 'rejected') {
      throw new ForbiddenException('This report is already closed and cannot be changed');
    }

    const updated = this.repo.update(id, {
      status: dto.status,
      actionNote: dto.actionNote ?? report.actionNote,
    });

    return this.enrich(updated);
  }

  // ── Private Helpers ──────────────────────────────────────

  private enrich(report: any) {
    if (!report) return report;
    const reporter = users.find((u) => u.user_id === report.reported_by);
    const reported = users.find((u) => u.user_id === report.reported_user);
    const reporterName = reporter?.user_name ?? 'Unknown';
    const reportedName = reported?.user_name ?? 'Unknown';
    return {
      ...report,
      reporter_name: reporterName,
      reported_name: reportedName,
      reporterName,
      reportedName,
    };
  }

  private enrichAll(reports: any[]) {
    return reports.map((r) => this.enrich(r));
  }
}
