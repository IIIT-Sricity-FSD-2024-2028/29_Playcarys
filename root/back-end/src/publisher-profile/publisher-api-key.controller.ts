import {
  Controller,
  Get,
  Post,
  Delete,
  Patch,
  Body,
  Param,
  Req,
  ParseIntPipe,
  UnauthorizedException,
} from '@nestjs/common';
import { PublisherApiKeyService } from './publisher-api-key.service';
import { CreateApiKeyDto, UpdateOnboardingDto, ReviewPublisherDto } from './publisher-api-key.dto';
import { Roles } from '../roles/roles.decorator';

@Controller('publisher')
export class PublisherApiController {
  constructor(private readonly apiKeyService: PublisherApiKeyService) {}

  private getEffectiveUserId(req: any): number {
    if (req.auth?.sub) return Number(req.auth.sub);
    throw new UnauthorizedException('A signed publisher session is required.');
  }

  @Get('applications')
  @Roles('admin', 'superuser')
  applications() { return this.apiKeyService.listApplications(); }

  @Post('applications/:id/review')
  @Roles('admin', 'superuser')
  review(@Req() req: any, @Param('id', ParseIntPipe) id: number, @Body() dto: ReviewPublisherDto) {
    return this.apiKeyService.reviewApplication(id, this.getEffectiveUserId(req), dto);
  }

  // GET /publisher/api-keys
  @Post('demo-verification')
  @Roles('publisher')
  demoVerification(@Req() req: any) {
    return this.apiKeyService.simulateVerification(this.getEffectiveUserId(req));
  }

  @Get('api-keys')
  @Roles('publisher', 'admin', 'superuser')
  findAllKeys(@Req() req: any) {
    const userId = this.getEffectiveUserId(req);
    return this.apiKeyService.findAllKeys(userId);
  }

  // POST /publisher/api-keys
  @Post('api-keys')
  @Roles('publisher', 'admin', 'superuser')
  createKey(@Req() req: any, @Body() dto: CreateApiKeyDto) {
    const userId = this.getEffectiveUserId(req);
    return this.apiKeyService.createKey(userId, dto);
  }

  // DELETE /publisher/api-keys/:id
  @Delete('api-keys/:id')
  @Roles('publisher', 'admin', 'superuser')
  revokeKey(@Req() req: any, @Param('id') id: string) {
    const userId = this.getEffectiveUserId(req);
    return this.apiKeyService.revokeKey(userId, id);
  }

  // GET /publisher/onboarding
  @Get('onboarding')
  @Roles('publisher', 'admin', 'superuser')
  getOnboarding(@Req() req: any) {
    const userId = this.getEffectiveUserId(req);
    return this.apiKeyService.getOnboardingStatus(userId);
  }

  // PATCH /publisher/onboarding
  @Patch('onboarding')
  @Roles('publisher', 'admin', 'superuser')
  updateOnboarding(@Req() req: any, @Body() dto: UpdateOnboardingDto) {
    const userId = this.getEffectiveUserId(req);
    return this.apiKeyService.updateOnboarding(userId, dto);
  }
}
