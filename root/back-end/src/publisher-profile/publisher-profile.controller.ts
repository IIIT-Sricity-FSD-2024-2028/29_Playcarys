import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { PublisherProfileService } from './publisher-profile.service';

@Controller('publisher-profiles')
export class PublisherProfileController {
  constructor(private readonly publisherProfileService: PublisherProfileService) {}

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
}
