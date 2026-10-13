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
import { UsersService } from './users.service';
import { Roles } from '../roles/roles.decorator';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, AssignRoleDto } from './users.dto';

// ── Account administration ──────────────────────────────────
// Every route here was previously unguarded, which made the whole token
// exercise pointless for the endpoint that mattered most: the RolesGuard only
// runs where @Roles is present, so `PATCH /users/:id {"role_id":1}` promoted
// any account to superuser with no header at all. Verified against this server.
//
// Reads stay open because the pages hydrate from db-export anyway (which is
// itself unauthenticated — a separate, still-open finding). Everything that
// WRITES is now staff-only, and the guard grants a staff role only from a
// signed token.
// ────────────────────────────────────────────────────────────

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  // GET /users
  // GET /users?role_id=4
  @Get()
  findAll(@Query('role_id') roleId?: string) {
    if (roleId) return this.usersService.findByRole(parseInt(roleId, 10));
    return this.usersService.findAll();
  }

  // GET /users/me existed here only as a hardcoded mock ({elo:1200, level:1,
  // xp:0} for literally every player, dated "since we don't have JWT
  // decoding set up yet" — RolesGuard has done real JWT decoding this whole
  // time). Its one caller (player/dashboard.html) wrote the result into
  // session.elo/level/xp, fields nothing downstream ever read. Removed both
  // the dead call and this stub rather than build out a real elo/xp system
  // nothing in the spec asks for.

  // GET /users/:id
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.findOne(id);
  }

  // POST /users
  @Post()
  @Roles('admin', 'superuser')
  create(@Body() dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  // PATCH /users/:id
  @Patch(':id')
  @Roles('admin', 'superuser')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserDto) {
    return this.usersService.update(id, dto);
  }

  // PATCH /users/:id/status
  @Patch(':id/status')
  @Roles('admin', 'moderator', 'superuser')
  updateStatus(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateUserStatusDto) {
    return this.usersService.updateStatus(id, dto);
  }

  // PATCH /users/:id/role
  @Patch(':id/role')
  @Roles('superuser')
  assignRole(@Param('id', ParseIntPipe) id: number, @Body() dto: AssignRoleDto) {
    return this.usersService.assignRole(id, dto);
  }

  // DELETE /users/:id
  @Delete(':id')
  @Roles('admin', 'superuser')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.remove(id);
  }
}
