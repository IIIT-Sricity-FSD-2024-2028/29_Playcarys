import { PublisherProfileService } from './publisher-profile.service';
export declare class PublisherProfileController {
    private readonly publisherProfileService;
    constructor(publisherProfileService: PublisherProfileService);
    findAll(): import("../data/store").PublisherProfile[];
    findOne(userId: number): {
        total_games: number;
        approved_games: number;
        active_games: number;
        user_id: number;
    };
}
