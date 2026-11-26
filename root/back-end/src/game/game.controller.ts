import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  ParseIntPipe,
  Query,
  Headers,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBody, ApiConsumes } from '@nestjs/swagger';
import { GameService } from './game.service';
import { Roles } from '../roles/roles.decorator';
import { MAX_BUNDLE_BYTES } from './bundle.service';
import {
  ApproveGameDto,
  CreateGameDto,
  SetGameStateRequestDto,
  UpdateGameRequestDto,
  UploadBundleDto,
} from './game.dto';

@Controller('games')
export class GameController {
  constructor(private readonly gameService: GameService) {}

  // GET /games
  // GET /games?status=pending
  // GET /games?publisherId=5
  // GET /games?active=true
  @Get()
  findAll(
    @Query('status') status?: string,
    @Query('publisherId') publisherId?: string,
    @Query('active') active?: string,
  ) {
    return this.gameService.findAll({
      status,
      publisherId: publisherId ? parseInt(publisherId, 10) : undefined,
      active: active === 'true',
    });
  }

  /**
   * GET /games/:id/scan-manifest — the per-file listing of an uploaded build.
   *
   * Split off the game row, where it was being shipped to every visitor on
   * every page load: 125 KB across four games, 35% of the whole database, for
   * a listing only this endpoint's caller can act on. Staff-only, because a
   * file listing of somebody's build is not public information.
   *
   * Declared BEFORE @Get(':id') on purpose — Nest matches routes in
   * declaration order, and a later ':id' would not shadow this, but keeping
   * the more specific path first is the habit that avoids the surprise.
   */
  @Get(':id/scan-manifest')
  @Roles('admin', 'superuser', 'moderator')
  scanManifest(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.getScanManifest(id);
  }

  /**
   * POST /games/:id/view — record that someone opened this game.
   *
   * Unauthenticated on purpose: a view is not a privileged act, and requiring
   * a token would undercount exactly the browsing a studio wants to see.
   */
  @Post(':id/view')
  countView(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.countView(id);
  }

  // GET /games/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.findOne(id);
  }


  // POST /games  — Publisher: Submit game for listing
  @Post()
  @Roles('publisher', 'admin', 'superuser')
  create(@Body() dto: CreateGameDto, @Req() req: any) {
    // A publisher always publishes as themselves; staff may create on a publisher's behalf.
    if (req.auth?.sub && req.auth?.role === 'publisher') {
      dto.game_publisher = req.auth.sub;
    }
    return this.gameService.create(dto);
  }

  // PATCH /games/:id  — Publisher: Update metadata
  // Body must include publisher_id for ownership check
  @Patch(':id')
  @Roles('publisher', 'admin', 'superuser')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGameRequestDto,
    @Req() req: any,
  ) {
    const actorId = req.auth?.sub;
    const actorRole = req.auth?.role;
    const { publisher_id, ...dto } = body;
    const effectivePublisherId = actorRole === 'publisher' ? actorId : publisher_id;
    return this.gameService.update(id, dto, effectivePublisherId);
  }

  // PATCH /games/:id/state  — Publisher: Set Game State (enable/disable)
  @Patch(':id/state')
  @Roles('publisher', 'admin', 'superuser')
  setGameState(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetGameStateRequestDto,
    @Req() req: any,
    @Headers('role') callerRole?: string,
  ) {
    const actorId = req.auth?.sub;
    const actorRole = req.auth?.role;
    const { publisher_id, ...dto } = body;
    const effectivePublisherId = actorRole === 'publisher' ? actorId : publisher_id;
    return this.gameService.setGameState(id, dto, effectivePublisherId, actorRole || callerRole);
  }

  // POST /games/:id/bundle  — Publisher: upload the playable build (Model A)
  //
  // multipart/form-data: `bundle` = the .zip, `publisher_id` = owning publisher.
  // Kept off the JSON body deliberately: game builds are tens of megabytes and
  // base64-in-JSON would both inflate them ~33% and blow the 25 MB body cap.
  @Post(':id/bundle')
  @Roles('publisher', 'admin', 'superuser')
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      required: ['bundle', 'publisher_id'],
      properties: {
        bundle: { type: 'string', format: 'binary', description: 'Web build as a .zip (index.html at root)' },
        publisher_id: { type: 'integer', example: 5 },
      },
    },
  })
  @UseInterceptors(
    FileInterceptor('bundle', {
      limits: { fileSize: MAX_BUNDLE_BYTES, files: 1 },
    }),
  )
  uploadBundle(
    @Param('id', ParseIntPipe) id: number,
    @UploadedFile() file: { buffer?: Buffer; size?: number; originalname?: string } | undefined,
    @Body() body: UploadBundleDto,
    @Req() req: any,
  ) {
    if (!file?.buffer?.length) {
      throw new BadRequestException('No bundle uploaded. Send the archive as the "bundle" form field.');
    }
    const actorId = req.auth?.sub;
    const actorRole = req.auth?.role;
    const effectivePublisherId = actorRole === 'publisher' ? actorId : body.publisher_id;
    return this.gameService.installBundle(id, file.buffer, effectivePublisherId);
  }

  // DELETE /games/:id/bundle  — Publisher: remove an uploaded build
  @Delete(':id/bundle')
  @Roles('publisher', 'admin', 'superuser')
  removeBundle(
    @Param('id', ParseIntPipe) id: number,
    @Req() req: any,
    @Query('publisherId', new ParseIntPipe({ optional: true })) publisherId?: number,
  ) {
    const actorId = req.auth?.sub;
    const actorRole = req.auth?.role;
    const effectivePublisherId = actorRole === 'publisher' ? actorId : publisherId;
    return this.gameService.removeBundle(id, effectivePublisherId);
  }

  // GET /games/:id/review  — Admin: everything needed to decide on a listing
  //
  // Separate from GET /games/:id on purpose: this returns the scan report,
  // the file manifest and the review history, which are admin-only and far
  // too heavy to ship on every player-facing game fetch.
  @Get(':id/review')
  @Roles('admin', 'superuser')
  getReview(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.getReview(id);
  }

  // POST /games/:id/rescan  — Admin: re-run the security scan on the installed build
  @Post(':id/rescan')
  @Roles('admin', 'superuser')
  rescan(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.rescan(id);
  }

  // PATCH /games/:id/approve  — Admin: decide a review
  //
  // The caller's role is read from the header the guard already validated. It
  // is only used to decide whether a failed-scan override is permitted; the
  // reviewer's identity comes from dto.reviewer_id and is checked against the
  // user table.
  @Patch(':id/approve')
  @Roles('admin', 'superuser')
  approveGame(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: ApproveGameDto,
    @Req() req: any,
    @Headers('role') callerRole?: string,
  ) {
    if (req.auth?.sub) {
      dto.reviewer_id = req.auth.sub;
    }
    const role = req.auth?.role || callerRole || 'admin';
    return this.gameService.approveGame(id, dto, role);
  }

  // DELETE /games/:id
  @Delete(':id')
  @Roles('admin', 'superuser')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.remove(id);
  }
}
