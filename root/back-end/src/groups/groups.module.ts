import { Module } from '@nestjs/common';
import { GroupsController } from './groups.controller';
import { GroupsService } from './groups.service';
import { GroupsRepository } from './groups.repository';

@Module({
  controllers: [GroupsController],
  providers: [GroupsService, GroupsRepository],
  exports: [GroupsService, GroupsRepository],
})
export class GroupsModule {}
