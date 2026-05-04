import { IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ description: 'The email address of the user', example: 'dragon@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The password data', example: 'yourSecurePassw0rd!' })
  @IsString()
  @MinLength(8)
  password: string;
}

export class RegisterDto {
  @ApiProperty({ description: 'Desired username', example: 'NewPlayer99' })
  @IsString()
  user_name: string;

  @ApiProperty({ description: 'User contact email', example: 'hello@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'Strong password', example: 'Testings123!' })
  @IsString()
  @MinLength(8)
  password: string;

  // default role = player (4)
  @ApiProperty({ description: 'Identifier mapping to internal DB roles (default: 4 = Player, 5 = Publisher)', example: 4, required: false })
  @IsOptional()
  @IsInt()
  @IsIn([4, 5])
  role_id?: number;
}
