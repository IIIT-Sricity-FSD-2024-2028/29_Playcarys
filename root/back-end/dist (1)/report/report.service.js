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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportService = void 0;
const common_1 = require("@nestjs/common");
const report_repository_1 = require("./report.repository");
const store_1 = require("../data/store");
const VALID_REPORT_TYPES = [
    'Toxic Behavior',
    'Cheating',
    'Griefing',
    'Harassment',
    'Spam',
    'Inappropriate Username',
    'Other',
];
let ReportService = class ReportService {
    constructor(repo) {
        this.repo = repo;
    }
    findAll(filter) {
        if (filter?.status)
            return this.enrichAll(this.repo.findByStatus(filter.status));
        if (filter?.reportedUserId)
            return this.enrichAll(this.repo.findByReportedUser(filter.reportedUserId));
        if (filter?.reporterId)
            return this.enrichAll(this.repo.findByReporter(filter.reporterId));
        return this.enrichAll(this.repo.findAll());
    }
    findOne(id) {
        const report = this.repo.findById(id);
        if (!report)
            throw new common_1.NotFoundException(`Report ${id} not found`);
        return this.enrich(report);
    }
    create(dto) {
        const reporter = store_1.users.find((u) => u.user_id === dto.reported_by);
        if (!reporter)
            throw new common_1.NotFoundException(`Reporter user ${dto.reported_by} not found`);
        const reported = store_1.users.find((u) => u.user_id === dto.reported_user);
        if (!reported)
            throw new common_1.NotFoundException(`Reported user ${dto.reported_user} not found`);
        if (dto.reported_by === dto.reported_user) {
            throw new common_1.BadRequestException('A player cannot report themselves');
        }
        if (!dto.reason || dto.reason.trim().length === 0) {
            throw new common_1.BadRequestException('Report reason cannot be empty');
        }
        if (!VALID_REPORT_TYPES.includes(dto.type)) {
            throw new common_1.BadRequestException(`Invalid report type. Must be one of: ${VALID_REPORT_TYPES.join(', ')}`);
        }
        if (this.repo.isDuplicate(dto.reported_by, dto.reported_user, dto.type)) {
            throw new common_1.ConflictException('A similar open report against this player already exists from you. Please wait for it to be resolved.');
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
    updateStatus(id, dto) {
        const report = this.repo.findById(id);
        if (!report)
            throw new common_1.NotFoundException(`Report ${id} not found`);
        const requester = store_1.users.find((u) => u.user_id === dto.requester_user_id);
        if (!requester) {
            throw new common_1.NotFoundException(`Requester user ${dto.requester_user_id} not found`);
        }
        const requesterRole = store_1.roles.find((role) => role.role_id === requester.role_id)?.role_name;
        const allowedRoles = new Set(['superuser', 'admin', 'moderator']);
        if (!requesterRole || !allowedRoles.has(requesterRole)) {
            throw new common_1.ForbiddenException('Only moderators, admins, or superusers can update report status');
        }
        if (report.status === 'resolved' || report.status === 'rejected') {
            throw new common_1.ForbiddenException('This report is already closed and cannot be changed');
        }
        const updated = this.repo.update(id, {
            status: dto.status,
            actionNote: dto.actionNote ?? report.actionNote,
        });
        return this.enrich(updated);
    }
    enrich(report) {
        if (!report)
            return report;
        const reporter = store_1.users.find((u) => u.user_id === report.reported_by);
        const reported = store_1.users.find((u) => u.user_id === report.reported_user);
        return {
            ...report,
            reporter_name: reporter?.user_name ?? 'Unknown',
            reported_name: reported?.user_name ?? 'Unknown',
        };
    }
    enrichAll(reports) {
        return reports.map((r) => this.enrich(r));
    }
};
exports.ReportService = ReportService;
exports.ReportService = ReportService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [report_repository_1.ReportRepository])
], ReportService);
//# sourceMappingURL=report.service.js.map