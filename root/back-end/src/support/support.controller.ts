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
import { SupportService } from './support.service';
import {
  CreateSupportTicketDto,
  ReplySupportTicketDto,
  UpdateTicketStatusDto,
} from './support.dto';
import { Roles } from '../roles/roles.decorator';

@Controller('support')
export class SupportController {
  constructor(private readonly supportService: SupportService) {}

  @Get('tickets')
  @Roles('player', 'moderator', 'admin', 'superuser')
  findAll(@Req() req: any, @Query('status') status?: string) {
    const isStaff = ['moderator', 'admin', 'superuser'].includes(req.auth?.role);
    const userId = req.auth?.sub || 7;
    return this.supportService.findAll(userId, isStaff, status);
  }

  @Get('tickets/:id')
  @Roles('player', 'moderator', 'admin', 'superuser')
  findOne(@Param('id', ParseIntPipe) id: number, @Req() req: any) {
    const isStaff = ['moderator', 'admin', 'superuser'].includes(req.auth?.role);
    const userId = req.auth?.sub || 7;
    return this.supportService.findOne(id, userId, isStaff);
  }

  @Post('tickets')
  @Roles('player', 'moderator', 'admin', 'superuser')
  create(@Body() dto: CreateSupportTicketDto, @Req() req: any) {
    const userId = req.auth?.sub || 7;
    return this.supportService.create(dto, userId);
  }

  @Post('tickets/:id/reply')
  @Roles('player', 'moderator', 'admin', 'superuser')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplySupportTicketDto,
    @Req() req: any,
  ) {
    const isStaff = ['moderator', 'admin', 'superuser'].includes(req.auth?.role);
    const userId = req.auth?.sub || 7;
    return this.supportService.addReply(id, dto, userId, isStaff);
  }

  @Patch('tickets/:id/status')
  @Roles('moderator', 'admin', 'superuser')
  updateStatus(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateTicketStatusDto,
    @Req() req: any,
  ) {
    const userId = req.auth?.sub || 3;
    return this.supportService.updateStatus(id, dto, userId);
  }
}
