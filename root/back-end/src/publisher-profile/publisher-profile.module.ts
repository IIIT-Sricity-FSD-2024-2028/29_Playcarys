import { Module } from '@nestjs/common';
import { PublisherProfileController } from './publisher-profile.controller';
import { PublisherProfileService } from './publisher-profile.service';
import { PublisherProfileRepository } from './publisher-profile.repository';

@Module({
  controllers: [PublisherProfileController],
  providers: [PublisherProfileService, PublisherProfileRepository],
  exports: [PublisherProfileService, PublisherProfileRepository],
})
export class PublisherProfileModule {}
