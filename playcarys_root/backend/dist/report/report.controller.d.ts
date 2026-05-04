import { ReportService } from './report.service';
import { CreateReportDto, UpdateReportStatusDto } from './report.dto';
export declare class ReportController {
    private readonly reportService;
    constructor(reportService: ReportService);
    findAll(status?: string, reportedUserId?: string, reporterId?: string): any[];
    findOne(id: number): any;
    create(dto: CreateReportDto): any;
    updateStatus(id: number, dto: UpdateReportStatusDto): any;
}
