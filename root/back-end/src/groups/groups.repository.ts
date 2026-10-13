import { Injectable } from '@nestjs/common';
import {
  groups,
  Group,
  group_join_requests,
  GroupJoinRequest,
} from '../data/store';

@Injectable()
export class GroupsRepository {
  findAll(): Group[] {
    return [...groups];
  }

  findById(group_id: number): Group | undefined {
    return groups.find((g) => g.group_id === group_id);
  }

  findForPlayer(player_id: number): Group[] {
    return groups.filter((g) => g.member_ids.includes(player_id));
  }

  create(group: Group): Group {
    groups.push(group);
    return group;
  }

  update(group_id: number, partial: Partial<Group>): Group | undefined {
    const idx = groups.findIndex((g) => g.group_id === group_id);
    if (idx === -1) return undefined;
    Object.assign(groups[idx], partial);
    return groups[idx];
  }

  remove(group_id: number): boolean {
    const idx = groups.findIndex((g) => g.group_id === group_id);
    if (idx === -1) return false;
    groups.splice(idx, 1);
    return true;
  }

  nextId(): number {
    return groups.length === 0 ? 1 : Math.max(...groups.map((g) => g.group_id)) + 1;
  }

  // ── Join requests ─────────────────────────────────────────

  nextRequestId(): number {
    const highest = group_join_requests.reduce(
      (mx, r) => (Number(r.id) > mx ? Number(r.id) : mx),
      0,
    );
    return Math.max(highest + 1, Date.now());
  }

  findPendingRequest(group_id: number, user_id: number): GroupJoinRequest | undefined {
    return group_join_requests.find(
      (r) => r.group_id === group_id && r.user_id === user_id && r.status === 'pending',
    );
  }

  findRequest(id: number): GroupJoinRequest | undefined {
    return group_join_requests.find((r) => r.id === id);
  }

  requestsForGroup(group_id: number): GroupJoinRequest[] {
    return group_join_requests.filter((r) => r.group_id === group_id);
  }

  createRequest(req: GroupJoinRequest): GroupJoinRequest {
    group_join_requests.push(req);
    return req;
  }
}
