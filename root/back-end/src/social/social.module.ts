import { Module } from '@nestjs/common';
import { SocialController } from './social.controller';
import { SocialService } from './social.service';

/**
 * Friends, player search and stored chat.
 *
 * Kept as one module because the three are genuinely coupled: you can only
 * message a friend, removing a friend deletes the conversation, and search
 * results have to report whether you are already friends.
 */
@Module({
  controllers: [SocialController],
  providers: [SocialService],
  exports: [SocialService],
})
export class SocialModule {}
