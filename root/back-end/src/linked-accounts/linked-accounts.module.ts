import { Module } from '@nestjs/common';
import { LinkedAccountsController } from './linked-accounts.controller';
import { LinkedAccountsService } from './linked-accounts.service';

@Module({
  controllers: [LinkedAccountsController],
  providers: [LinkedAccountsService],
  exports: [LinkedAccountsService],
})
export class LinkedAccountsModule {}
