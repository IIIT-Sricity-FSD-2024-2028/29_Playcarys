import {
  Controller,
  Get,
  Patch,
  Body,
  Param,
  ParseIntPipe,
  Req,
  ForbiddenException,
} from '@nestjs/common';
import { Roles } from '../roles/roles.decorator';
import { PublisherProfileService } from './publisher-profile.service';
import { PublisherApiKeyService } from './publisher-api-key.service';
import { UpdateOnboardingDto } from './publisher-api-key.dto';

@Controller('publisher-profiles')
export class PublisherProfileController {
  constructor(
    private readonly publisherProfileService: PublisherProfileService,
    private readonly apiKeyService: PublisherApiKeyService,
  ) {}

  // GET /publisher-profiles
  @Get()
  findAll() {
    return this.publisherProfileService.findAll();
  }

  // GET /publisher-profiles/:userId
  @Get(':userId')
  findOne(@Param('userId', ParseIntPipe) userId: number) {
    return this.publisherProfileService.findOne(userId);
  }

  // GET /publisher-profiles/:userId/onboarding
  @Get(':userId/onboarding')
  getOnboarding(@Param('userId', ParseIntPipe) userId: number) {
    return this.apiKeyService.getOnboardingStatus(userId);
  }

  // PATCH /publisher-profiles/:userId/onboarding
  @Patch(':userId/onboarding')
  @Roles('publisher')
  updateOnboarding(
    @Req() req: any,
    @Param('userId', ParseIntPipe) userId: number,
    @Body() dto: UpdateOnboardingDto,
  ) {
    if (Number(req.auth?.sub) !== userId) throw new ForbiddenException('You can only submit your own publisher application.');
    return this.apiKeyService.updateOnboarding(userId, dto);
  }

  // GET /publisher-profiles/:userId/api-keys
  @Get(':userId/api-keys')
  getKeys(@Param('userId', ParseIntPipe) userId: number) {
    return this.apiKeyService.findAllKeys(userId);
  }
}
