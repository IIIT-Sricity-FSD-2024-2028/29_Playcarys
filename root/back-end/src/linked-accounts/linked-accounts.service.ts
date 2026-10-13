import { Injectable, BadRequestException, ForbiddenException } from '@nestjs/common';
import {
  linked_game_accounts,
  EXTERNAL_GAME_PLATFORMS,
  LinkedGameAccount,
} from '../data/store';
import { LinkGameAccountDto } from './linked-accounts.dto';

/**
 * SELF-DECLARED external game accounts — see the note on LinkedGameAccount in
 * data/store.ts. There is deliberately no verification step here: the whole
 * point is honesty about what this can and cannot check.
 */
@Injectable()
export class LinkedAccountsService {
  platforms() {
    return EXTERNAL_GAME_PLATFORMS;
  }

  forPlayer(player_id: number) {
    return linked_game_accounts
      .filter((l) => l.player_id === player_id)
      .map((l) => ({ ...l, launch_url: this.launchUrl(l) }));
  }

  private launchUrl(l: LinkedGameAccount) {
    return EXTERNAL_GAME_PLATFORMS.find((p) => p.key === l.platform)?.launch_url ?? '';
  }

  link(dto: LinkGameAccountDto) {
    const known = EXTERNAL_GAME_PLATFORMS.find((p) => p.key === dto.platform);
    if (!known && !dto.platform_label) {
      throw new BadRequestException(
        'Unknown platform — pass platform_label for a custom one.',
      );
    }
    const existing = linked_game_accounts.find(
      (l) => l.player_id === dto.player_id && l.platform === dto.platform,
    );
    const row: LinkedGameAccount = {
      link_id: existing?.link_id ?? this.nextId(),
      player_id: dto.player_id,
      platform: dto.platform,
      platform_label: dto.platform_label ?? known?.label ?? dto.platform,
      in_game_name: dto.in_game_name,
      linked_at: new Date().toISOString(),
    };
    if (existing) {
      Object.assign(existing, row);
      return { ...existing, launch_url: this.launchUrl(existing) };
    }
    linked_game_accounts.push(row);
    return { ...row, launch_url: this.launchUrl(row) };
  }

  unlink(link_id: number, requesterId: number) {
    const idx = linked_game_accounts.findIndex((l) => l.link_id === link_id);
    if (idx === -1) return { message: 'Already removed.' };
    if (Number(linked_game_accounts[idx].player_id) !== Number(requesterId)) {
      throw new ForbiddenException('You can only remove your own linked accounts.');
    }
    linked_game_accounts.splice(idx, 1);
    return { message: 'Unlinked.' };
  }

  private nextId() {
    return linked_game_accounts.length === 0
      ? 1
      : Math.max(...linked_game_accounts.map((l) => l.link_id)) + 1;
  }
}
