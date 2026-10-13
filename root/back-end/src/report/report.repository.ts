import { Injectable } from '@nestjs/common';
import { reports, Report } from '../data/store';

@Injectable()
export class ReportRepository {
  findAll(): Report[] {
    return [...reports];
  }

  findById(report_id: number): Report | undefined {
    return reports.find((r) => r.report_id === report_id);
  }

  findByStatus(status: string): Report[] {
    return reports.filter((r) => r.status === status);
  }

  findByReporter(user_id: number): Report[] {
    return reports.filter((r) => r.reported_by === user_id);
  }

  findByReportedUser(user_id: number): Report[] {
    return reports.filter((r) => r.reported_user === user_id);
  }

  // Check for duplicate: same reporter, same target, same type, still open
  isDuplicate(reported_by: number, reported_user: number, type: string): boolean {
    return reports.some(
      (r) =>
        r.reported_by === reported_by &&
        r.reported_user === reported_user &&
        r.type === type &&
        r.status !== 'resolved' &&
        r.status !== 'rejected',
    );
  }

  create(report: Report): Report {
    reports.push(report);
    return report;
  }

  update(report_id: number, partial: Partial<Report>): Report | undefined {
    const idx = reports.findIndex((r) => r.report_id === report_id);
    if (idx === -1) return undefined;
    Object.assign(reports[idx], partial);
    return reports[idx];
  }

  nextId(): number {
    return reports.length === 0
      ? 1
      : Math.max(...reports.map((r) => r.report_id)) + 1;
  }
}
