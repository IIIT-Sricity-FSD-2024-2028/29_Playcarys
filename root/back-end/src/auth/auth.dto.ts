import { IsBoolean, IsEmail, IsIn, IsInt, IsOptional, IsString, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

/**
 * Body for the session keep-alive and release.
 *
 * The token is the proof. Without it any client could refresh — or drop —
 * somebody else's session claim just by knowing their user id.
 */
export class SessionPingDto {
  @ApiProperty({ description: 'Internal ID of the signed-in user', example: 7 })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'The session token issued when this tab signed in' })
  @IsString()
  session_token: string;
}

/**
 * Start a password recovery. Answered identically whether or not the address
 * exists, so this cannot be used to discover which emails have accounts.
 */
export class ForgotPasswordDto {
  @ApiProperty({ description: 'Email address on the account', example: 'dragon@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({
    description: 'Which account, when one address holds both (4 = Player, 5 = Publisher).',
    example: 4,
    required: false,
  })
  @IsOptional()
  @IsInt()
  role_id?: number;
}

/** Finish a recovery with the one-time code an admin handed over. */
export class ResetPasswordDto {
  @ApiProperty({ description: 'Email address on the account', example: 'dragon@example.com' })
  @IsEmail()
  email: string;

  @ApiProperty({ description: 'The 6-digit one-time code', example: '482913' })
  @IsString()
  code: string;

  @ApiProperty({ description: 'The new password (min 8 characters)', example: 'n3wPassw0rd!' })
  @IsString()
  @MinLength(8)
  new_password: string;

  @ApiProperty({ required: false, example: 4 })
  @IsOptional()
  @IsInt()
  role_id?: number;
}

export class LoginDto {
  @ApiProperty({ description: 'The email address of the user', example: 'dragon@example.com', required: false })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiProperty({ description: 'Alternatively, the username', example: 'GodMode', required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ description: 'The password data', example: 'yourSecurePassw0rd!' })
  @IsString()
  @MinLength(8)
  password: string;

  @ApiProperty({
    description:
      'Optional. Which account to sign in to when one email holds more than one ' +
      '(4 = Player, 5 = Publisher). Omit and the password decides.',
    example: 5,
    required: false,
  })
  @IsOptional()
  @IsInt()
  role_id?: number;

  @ApiProperty({
    description:
      'Take the account even though another session currently holds it. Only meant ' +
      'to be sent after the caller has confirmed that with a human (handoff approval ' +
      'or an explicit "sign in anyway") — omit it for a normal login attempt.',
    example: false,
    required: false,
  })
  @IsOptional()
  @IsBoolean()
  force?: boolean;
}

/**
 * Body of POST /auth/change-password.
 *
 * The current password is verified BY THE SERVER. A check done in the page
 * would be decoration: the browser can simply not run it and sync a new
 * password up through db-import instead.
 */
export class ChangePasswordDto {
  @ApiProperty({ description: 'Account whose password is changing', example: 9 })
  @IsInt()
  user_id: number;

  @ApiProperty({ description: 'The password currently on the account' })
  @IsString()
  current_password: string;

  @ApiProperty({ description: 'Replacement password (min 8 characters)', example: 'N3wPassw0rd!' })
  @IsString()
  @MinLength(8)
  new_password: string;
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
