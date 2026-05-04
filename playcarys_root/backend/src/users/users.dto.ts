import { IsString, IsEmail, IsOptional, IsInt, IsIn } from 'class-validator';

export class CreateUserDto {
  @IsString()
  user_name: string;

  @IsInt()
  role_id: number;

  @IsEmail()
  email: string;

  @IsString()
  password: string;

  @IsOptional()
  @IsString()
  avatar?: string;
}

export class UpdateUserDto {
  @IsOptional()
  @IsString()
  user_name?: string;

  @IsOptional()
  @IsInt()
  role_id?: number;

  @IsOptional()
  @IsEmail()
  email?: string;

  @IsOptional()
  @IsString()
  password?: string;
}

export class UpdateUserStatusDto {
  @IsIn(['active', 'banned', 'suspended'])
  status: 'active' | 'banned' | 'suspended';
}

export class AssignRoleDto {
  @IsInt()
  role_id: number;
}
