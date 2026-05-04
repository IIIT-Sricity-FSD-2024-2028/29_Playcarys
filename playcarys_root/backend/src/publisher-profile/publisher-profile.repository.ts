import { Injectable } from '@nestjs/common';
import { publisher_profiles, PublisherProfile } from '../data/store';

@Injectable()
export class PublisherProfileRepository {
  findAll(): PublisherProfile[] {
    return [...publisher_profiles];
  }

  findByUserId(user_id: number): PublisherProfile | undefined {
    return publisher_profiles.find((p) => p.user_id === user_id);
  }

  update(user_id: number, partial: Partial<PublisherProfile>): PublisherProfile | undefined {
    const idx = publisher_profiles.findIndex((p) => p.user_id === user_id);
    if (idx === -1) return undefined;
    Object.assign(publisher_profiles[idx], partial);
    return publisher_profiles[idx];
  }

  increment(user_id: number, field: 'total_games' | 'approved_games' | 'active_games', by = 1) {
    const idx = publisher_profiles.findIndex((p) => p.user_id === user_id);
    if (idx === -1) return;
    publisher_profiles[idx][field] = Math.max(0, publisher_profiles[idx][field] + by);
  }
}
