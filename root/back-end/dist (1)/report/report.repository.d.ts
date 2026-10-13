import { Report } from '../data/store';
export declare class ReportRepository {
    findAll(): Report[];
    findById(report_id: number): Report | undefined;
    findByStatus(status: string): Report[];
    findByReporter(user_id: number): Report[];
    findByReportedUser(user_id: number): Report[];
    isDuplicate(reported_by: number, reported_user: number, type: string): boolean;
    create(report: Report): Report;
    update(report_id: number, partial: Partial<Report>): Report | undefined;
    nextId(): number;
}
