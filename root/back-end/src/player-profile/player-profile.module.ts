import { Module } from '@nestjs/common';
import { PlayerProfileController } from './player-profile.controller';
import { PlayerProfileService } from './player-profile.service';
import { PlayerProfileRepository } from './player-profile.repository';

@Module({
  controllers: [PlayerProfileController],
  providers: [PlayerProfileService, PlayerProfileRepository],
  exports: [PlayerProfileService, PlayerProfileRepository],
})
export class PlayerProfileModule {}
