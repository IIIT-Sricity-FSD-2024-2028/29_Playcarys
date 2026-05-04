"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ReportRepository = void 0;
const common_1 = require("@nestjs/common");
const store_1 = require("../data/store");
let ReportRepository = class ReportRepository {
    findAll() {
        return [...store_1.reports];
    }
    findById(report_id) {
        return store_1.reports.find((r) => r.report_id === report_id);
    }
    findByStatus(status) {
        return store_1.reports.filter((r) => r.status === status);
    }
    findByReporter(user_id) {
        return store_1.reports.filter((r) => r.reported_by === user_id);
    }
    findByReportedUser(user_id) {
        return store_1.reports.filter((r) => r.reported_user === user_id);
    }
    isDuplicate(reported_by, reported_user, type) {
        return store_1.reports.some((r) => r.reported_by === reported_by &&
            r.reported_user === reported_user &&
            r.type === type &&
            r.status !== 'resolved' &&
            r.status !== 'rejected');
    }
    create(report) {
        store_1.reports.push(report);
        return report;
    }
    update(report_id, partial) {
        const idx = store_1.reports.findIndex((r) => r.report_id === report_id);
        if (idx === -1)
            return undefined;
        Object.assign(store_1.reports[idx], partial);
        return store_1.reports[idx];
    }
    nextId() {
        return store_1.reports.length === 0
            ? 1
            : Math.max(...store_1.reports.map((r) => r.report_id)) + 1;
    }
};
exports.ReportRepository = ReportRepository;
exports.ReportRepository = ReportRepository = __decorate([
    (0, common_1.Injectable)()
], ReportRepository);
//# sourceMappingURL=report.repository.js.map