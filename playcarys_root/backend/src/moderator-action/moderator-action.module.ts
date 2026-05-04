import { Module } from '@nestjs/common';
import { ModeratorActionController } from './moderator-action.controller';
import { ModeratorActionService } from './moderator-action.service';
import { ModeratorActionRepository } from './moderator-action.repository';

@Module({
  controllers: [ModeratorActionController],
  providers: [ModeratorActionService, ModeratorActionRepository],
  exports: [ModeratorActionService, ModeratorActionRepository],
})
export class ModeratorActionModule {}
