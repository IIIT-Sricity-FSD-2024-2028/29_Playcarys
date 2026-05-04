import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { CreateReportDto, UpdateReportStatusDto } from './report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // GET /reports
  // GET /reports?status=pending
  // GET /reports?reportedUserId=11
  // GET /reports?reporterId=7
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('reportedUserId') reportedUserId?: string,
    @Query('reporterId') reporterId?: string,
  ) {
    return this.reportService.findAll({
      status,
      reportedUserId: reportedUserId ? parseInt(reportedUserId, 10) : undefined,
      reporterId: reporterId ? parseInt(reporterId, 10) : undefined,
    });
  }

  // GET /reports/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.reportService.findOne(id);
  }

  // POST /reports  — Player: submit a report
  @Post()
  create(@Body() dto: CreateReportDto) {
    return this.reportService.create(dto);
  }

  // PATCH /reports/:id/status  — Moderator: update report status
  @Patch(':id/status')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportStatusDto,
  ) {
    return this.reportService.updateStatus(id, dto);
  }
}
