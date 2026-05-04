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
} from '@nestjs/common';
import { GameService } from './game.service';
import { Roles } from '../roles/roles.decorator';
import {
  ApproveGameDto,
  CreateGameDto,
  SetGameStateRequestDto,
  UpdateGameRequestDto,
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

  // GET /games/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.findOne(id);
  }

  // POST /games  — Publisher: Submit game for listing
  @Post()
  @Roles('publisher')
  create(@Body() dto: CreateGameDto) {
    return this.gameService.create(dto);
  }

  // PATCH /games/:id  — Publisher: Update metadata
  // Body must include publisher_id for ownership check
  @Patch(':id')
  @Roles('publisher')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: UpdateGameRequestDto,
  ) {
    const { publisher_id, ...dto } = body;
    return this.gameService.update(id, dto, publisher_id);
  }

  // PATCH /games/:id/state  — Publisher: Set Game State (enable/disable)
  @Patch(':id/state')
  @Roles('publisher')
  setGameState(
    @Param('id', ParseIntPipe) id: number,
    @Body() body: SetGameStateRequestDto,
  ) {
    const { publisher_id, ...dto } = body;
    return this.gameService.setGameState(id, dto, publisher_id);
  }

  // PATCH /games/:id/approve  — Admin: Approve or reject a game listing
  @Patch(':id/approve')
  @Roles('admin', 'superuser')
  approveGame(@Param('id', ParseIntPipe) id: number, @Body() dto: ApproveGameDto) {
    return this.gameService.approveGame(id, dto);
  }

  // DELETE /games/:id
  @Delete(':id')
  @Roles('admin', 'superuser')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.gameService.remove(id);
  }
}
