import { Controller, Post, Body } from '@nestjs/common';
import { AuthService } from './auth.service';
import {
  ChangePasswordDto,
  ForgotPasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  SessionPingDto,
} from './auth.dto';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // POST /auth/login
  @Post('login')
  login(@Body() dto: LoginDto) {
    const user = this.authService.login(dto);
    // The token is minted inside login() from the authenticated account. It
    // replaces the 'mock-jwt-token' placeholder that used to sit here, which
    // meant nothing and authorised nothing.
    //
    // session_token is the one-account-one-session claim, also minted inside
    // login() (see AuthService.claimSession) — surfaced at the top level too
    // since that's where the frontend's Auth.login(user, token) expects it.
    return { user, token: user.token, session_token: user.session_token };
  }

  // POST /auth/forgot-password
  // The recovery path that did not exist. Answers identically for a real and a
  // made-up address, so it cannot be used to find out who has an account.
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // POST /auth/reset-password
  // Consumes the one-time code and clears every session claim on the account,
  // which is what actually removes an intruder rather than joining them.
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  // POST /auth/change-password
  // Requires the current password. Unguarded by role on purpose — knowing the
  // existing password IS the authorisation, and it is the only proof on this
  // platform that is not simply asserted by the client.
  @Post('change-password')
  changePassword(@Body() dto: ChangePasswordDto) {
    return this.authService.changePassword(dto);
  }

  // POST /auth/heartbeat
  // Cheap keep-alive for the one-session-per-account claim. Called every few
  // seconds by every signed-in tab, so it must stay tiny — this is why it is
  // not just another DB.save().
  @Post('heartbeat')
  heartbeat(@Body() dto: SessionPingDto) {
    return this.authService.heartbeat(dto);
  }

  // POST /auth/release
  // Give the account back immediately. Used by sign-out, and by a closing tab
  // via navigator.sendBeacon so the next sign-in does not have to wait out the
  // staleness window.
  @Post('release')
  release(@Body() dto: SessionPingDto) {
    return this.authService.releaseSession(dto);
  }

  // POST /auth/register
  @Post('register')
  register(@Body() dto: RegisterDto) {
    const result = this.authService.register(dto);
    // token/session_token are minted inside register() (see AuthService),
    // replacing the 'mock-jwt-token' placeholder that used to sit here and
    // authorised nothing.
    return {
      user: { username: dto.user_name, role: dto.role_id === 5 ? 'publisher' : 'player' },
      token: result.token,
      session_token: result.session_token,
      ...result,
    };
  }
}
