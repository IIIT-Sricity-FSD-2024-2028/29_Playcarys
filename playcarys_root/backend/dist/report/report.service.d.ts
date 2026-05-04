import { ReportRepository } from './report.repository';
import { CreateReportDto, UpdateReportStatusDto } from './report.dto';
export declare class ReportService {
    private readonly repo;
    constructor(repo: ReportRepository);
    findAll(filter?: {
        status?: string;
        reportedUserId?: number;
        reporterId?: number;
    }): any[];
    findOne(id: number): any;
    create(dto: CreateReportDto): any;
    updateStatus(id: number, dto: UpdateReportStatusDto): any;
    private enrich;
    private enrichAll;
}
