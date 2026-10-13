import { IsArray, IsInt, IsOptional, IsString, MinLength } from 'class-validator';

export class CreateTeamDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsInt()
  captain_id: number;

  /** Starting roster besides the captain, who is always a member. */
  @IsOptional()
  @IsArray()
  member_ids?: number[];
}

export class AddTeamMemberDto {
  @IsInt()
  user_id: number;
}
