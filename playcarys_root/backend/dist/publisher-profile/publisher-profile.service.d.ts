import { PublisherProfileRepository } from './publisher-profile.repository';
export declare class PublisherProfileService {
    private readonly repo;
    constructor(repo: PublisherProfileRepository);
    findAll(): import("../data/store").PublisherProfile[];
    findOne(userId: number): {
        total_games: number;
        approved_games: number;
        active_games: number;
        user_id: number;
    };
    recalculate(userId: number): void;
}
