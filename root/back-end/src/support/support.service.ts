import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import {
  CreateSupportTicketDto,
  ReplySupportTicketDto,
  UpdateTicketStatusDto,
} from './support.dto';
import { users, roles } from '../data/store';

export interface TicketReply {
  reply_id: number;
  author_id: number;
  author_name: string;
  author_role: string;
  message: string;
  created_at: string;
}

export interface SupportTicket {
  ticket_id: number;
  ticket_ref: string;
  user_id: number;
  user_name: string;
  subject: string;
  category: string;
  urgency: 'low' | 'medium' | 'high' | 'urgent';
  sla_hours: number;
  sla_target_at: string;
  status: 'open' | 'in-progress' | 'waiting-on-player' | 'resolved' | 'closed';
  assigned_moderator_id?: number;
  assigned_moderator_name?: string;
  created_at: string;
  updated_at: string;
  replies: TicketReply[];
  emergency_disclaimer: string;
}

// In-memory support tickets store
const support_tickets: SupportTicket[] = [];

const SLA_MAP = {
  urgent: 2,
  high: 6,
  medium: 24,
  low: 48,
};

const EMERGENCY_SAFETY_DISCLAIMER =
  'Notice: PlayCarys Support is for platform, game, and account inquiries. If you are experiencing real-world harm, self-harm concerns, or criminal emergencies, please contact your local emergency services or national crisis helpline immediately.';

@Injectable()
export class SupportService {
  create(dto: CreateSupportTicketDto, requesterId: number) {
    const authorId = dto.user_id || requesterId;
    const user = users.find((u) => u.user_id === authorId);
    if (!user) {
      throw new NotFoundException(`User ${authorId} not found.`);
    }

    const id = support_tickets.length === 0 ? 101 : Math.max(...support_tickets.map((t) => t.ticket_id)) + 1;
    const slaHours = SLA_MAP[dto.urgency] || 24;
    const now = new Date();
    const slaTarget = new Date(now.getTime() + slaHours * 3600 * 1000);

    const roleName = roles.find((r) => r.role_id === user.role_id)?.role_name || 'player';
    const initialReply: TicketReply = {
      reply_id: 1,
      author_id: authorId,
      author_name: user.user_name,
      author_role: roleName,
      message: dto.message.trim(),
      created_at: now.toISOString(),
    };

    const ticket: SupportTicket = {
      ticket_id: id,
      ticket_ref: `TCK-${id}`,
      user_id: authorId,
      user_name: user.user_name,
      subject: dto.subject.trim(),
      category: dto.category,
      urgency: dto.urgency,
      sla_hours: slaHours,
      sla_target_at: slaTarget.toISOString(),
      status: 'open',
      created_at: now.toISOString(),
      updated_at: now.toISOString(),
      replies: [initialReply],
      emergency_disclaimer: EMERGENCY_SAFETY_DISCLAIMER,
    };

    support_tickets.push(ticket);
    return ticket;
  }

  findAll(requesterId: number, isStaff: boolean, statusFilter?: string) {
    let list = isStaff
      ? support_tickets
      : support_tickets.filter((t) => Number(t.user_id) === Number(requesterId));

    if (statusFilter) {
      list = list.filter((t) => t.status === statusFilter);
    }

    return list.slice().reverse();
  }

  findOne(id: number, requesterId: number, isStaff: boolean) {
    const ticket = support_tickets.find((t) => t.ticket_id === id);
    if (!ticket) {
      throw new NotFoundException(`Support ticket #${id} not found.`);
    }

    if (!isStaff && Number(ticket.user_id) !== Number(requesterId)) {
      throw new ForbiddenException('You do not have permission to view this ticket.');
    }

    return ticket;
  }

  addReply(id: number, dto: ReplySupportTicketDto, requesterId: number, isStaff: boolean) {
    const ticket = this.findOne(id, requesterId, isStaff);
    const authorId = dto.author_id || requesterId;
    const author = users.find((u) => u.user_id === authorId);

    const replyId =
      ticket.replies.length === 0 ? 1 : Math.max(...ticket.replies.map((r) => r.reply_id)) + 1;

    const authorRole = author ? (roles.find((r) => r.role_id === author.role_id)?.role_name || 'player') : (isStaff ? 'moderator' : 'player');
    const reply: TicketReply = {
      reply_id: replyId,
      author_id: authorId,
      author_name: author?.user_name || 'Support Agent',
      author_role: authorRole,
      message: dto.message.trim(),
      created_at: new Date().toISOString(),
    };

    ticket.replies.push(reply);
    ticket.updated_at = new Date().toISOString();

    // If moderator replies, transition to waiting-on-player; if player replies, reopen or set in-progress
    if (isStaff && ticket.status !== 'closed' && ticket.status !== 'resolved') {
      ticket.status = 'waiting-on-player';
    } else if (!isStaff && ticket.status === 'waiting-on-player') {
      ticket.status = 'in-progress';
    }

    return ticket;
  }

  updateStatus(id: number, dto: UpdateTicketStatusDto, requesterId: number) {
    const ticket = support_tickets.find((t) => t.ticket_id === id);
    if (!ticket) {
      throw new NotFoundException(`Support ticket #${id} not found.`);
    }

    ticket.status = dto.status;
    ticket.updated_at = new Date().toISOString();

    if (dto.assigned_moderator_id) {
      ticket.assigned_moderator_id = dto.assigned_moderator_id;
      const mod = users.find((u) => u.user_id === dto.assigned_moderator_id);
      ticket.assigned_moderator_name = mod?.user_name || `Mod #${dto.assigned_moderator_id}`;
    }

    if (dto.resolution_note) {
      const resolver = users.find((u) => u.user_id === requesterId);
      ticket.replies.push({
        reply_id: ticket.replies.length + 1,
        author_id: requesterId,
        author_name: resolver?.user_name || 'Moderator',
        author_role: 'moderator',
        message: `[Status changed to ${dto.status}]: ${dto.resolution_note}`,
        created_at: new Date().toISOString(),
      });
    }

    return ticket;
  }
}
