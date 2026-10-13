import { PublisherProfile } from '../data/store';
export declare class PublisherProfileRepository {
    findAll(): PublisherProfile[];
    findByUserId(user_id: number): PublisherProfile | undefined;
    update(user_id: number, partial: Partial<PublisherProfile>): PublisherProfile | undefined;
    increment(user_id: number, field: 'total_games' | 'approved_games' | 'active_games', by?: number): void;
}
