import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Req,
} from '@nestjs/common';
import { ReportService } from './report.service';
import { Roles } from '../roles/roles.decorator';
import { CreateReportDto, UpdateReportStatusDto } from './report.dto';

@Controller('reports')
export class ReportController {
  constructor(private readonly reportService: ReportService) {}

  // GET /reports
  // GET /reports?status=pending
  // GET /reports?reportedUserId=11
  // GET /reports?reporterId=7
  @Get()
  @Roles('player', 'moderator', 'admin', 'superuser')
  findAll(
    @Req() req: any,
    @Query('status') status?: string,
    @Query('reportedUserId') reportedUserId?: string,
    @Query('reporterId') reporterId?: string,
  ) {
    const isStaff = req.auth && ['moderator', 'admin', 'superuser'].includes(req.auth.role);
    // Non-staff can only see reports where they are the reporter
    const effectiveReporterId = isStaff
      ? (reporterId ? parseInt(reporterId, 10) : undefined)
      : req.auth?.sub;

    return this.reportService.findAll({
      status,
      reportedUserId: reportedUserId ? parseInt(reportedUserId, 10) : undefined,
      reporterId: effectiveReporterId,
    });
  }

  // GET /reports/:id
  @Get(':id')
  @Roles('player', 'moderator', 'admin', 'superuser')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const isStaff = req.auth && ['moderator', 'admin', 'superuser'].includes(req.auth.role);
    return this.reportService.findOne(id, isStaff ? undefined : req.auth?.sub);
  }

  // POST /reports  — Player: submit a report
  @Post()
  @Roles('player', 'moderator', 'admin', 'superuser')
  create(@Body() dto: CreateReportDto, @Req() req: any) {
    if (req.auth?.sub) {
      dto.reported_by = req.auth.sub;
    }
    return this.reportService.create(dto);
  }

  // PATCH /reports/:id/status  — Moderator: update report status
  @Patch(':id/status')
  @Roles('moderator', 'admin', 'superuser')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateReportStatusDto,
    @Req() req: any,
  ) {
    if (req.auth?.sub) {
      dto.requester_user_id = req.auth.sub;
    }
    return this.reportService.updateStatus(id, dto);
  }
}
