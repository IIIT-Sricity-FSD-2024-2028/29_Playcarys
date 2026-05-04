import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
} from '@nestjs/common';
import { NotificationService } from './notification.service';
import {
  CreateNotificationDto,
  MarkReadDto,
  NotificationAudienceDto,
  ReplyDto,
} from './notification.dto';

@Controller('notifications')
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  // GET /notifications?userId=7&roleName=player
  // Returns all notifications (broadcast + direct) visible to this user
  @Get()
  findForUser(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('roleName') roleName: string,
  ) {
    return this.notificationService.findForUser(userId, roleName);
  }

  // GET /notifications/unread?userId=7&roleName=player
  @Get('unread')
  findUnread(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('roleName') roleName: string,
  ) {
    return this.notificationService.findUnreadForUser(userId, roleName);
  }

  // GET /notifications/unread-count?userId=7&roleName=player
  @Get('unread-count')
  countUnread(
    @Query('userId', ParseIntPipe) userId: number,
    @Query('roleName') roleName: string,
  ) {
    return this.notificationService.countUnread(userId, roleName);
  }

  // GET /notifications/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.notificationService.findOne(id);
  }

  // POST /notifications  — Send a broadcast or direct notification
  @Post()
  create(@Body() dto: CreateNotificationDto) {
    return this.notificationService.create(dto);
  }

  // POST /notifications/:id/reply  — Reply to a notification
  @Post(':id/reply')
  reply(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ReplyDto,
  ) {
    return this.notificationService.reply(id, dto);
  }

  // PATCH /notifications/:id/read
  // Body: { userId, roleName, read: true|false }
  @Patch(':id/read')
  markRead(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: MarkReadDto,
  ) {
    const { userId, roleName, ...dto } = body;
    return this.notificationService.markRead(id, userId, roleName, dto);
  }

  // PATCH /notifications/mark-all-read
  // Body: { userId, roleName }
  @Patch('mark-all-read')
  markAllRead(@Body() body: NotificationAudienceDto) {
    return this.notificationService.markAllRead(body.userId, body.roleName);
  }

  // DELETE /notifications/:id
  // Body: { userId, roleName }
  @Delete(':id')
  remove(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: NotificationAudienceDto,
  ) {
    return this.notificationService.remove(id, body.userId, body.roleName);
  }
}
