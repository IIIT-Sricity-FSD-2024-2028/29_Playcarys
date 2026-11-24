import { Module } from '@nestjs/common';
import { PublisherProfileController } from './publisher-profile.controller';
import { PublisherApiController } from './publisher-api-key.controller';
import { PublisherProfileService } from './publisher-profile.service';
import { PublisherApiKeyService } from './publisher-api-key.service';
import { PublisherProfileRepository } from './publisher-profile.repository';

@Module({
  controllers: [PublisherProfileController, PublisherApiController],
  providers: [
    PublisherProfileService,
    PublisherProfileRepository,
    PublisherApiKeyService,
  ],
  exports: [
    PublisherProfileService,
    PublisherProfileRepository,
    PublisherApiKeyService,
  ],
})
export class PublisherProfileModule {}
