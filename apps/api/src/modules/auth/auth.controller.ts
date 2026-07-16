import { Body, Controller, Get, Post, Req, UsePipes } from '@nestjs/common';
import { ApiBearerAuth, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
  AuthResponse,
  ForgotPasswordInput,
  GoogleAuthInput,
  LoginInput,
  RegisterInput,
  RefreshTokenInput,
  ResetPasswordInput,
  forgotPasswordSchema,
  googleAuthSchema,
  loginSchema,
  registerSchema,
  refreshTokenSchema,
  resetPasswordSchema,
} from '@repo/contracts';
import { Request } from 'express';
import { CART_SESSION_HEADER } from '../../common/cart-identity/cart-identity.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { ZodValidationPipe } from '../../common/pipes/zod-validation.pipe';
import { AuthService } from './auth.service';
import { AuthenticatedUser } from './types/authenticated-user';

function extractMeta(req: Request) {
  return {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent'],
  };
}

/** The frontend sends its guest cart session id on login/register/Google-login so any items
 * added before signing in can be merged into the account's cart — see AuthService. */
function extractGuestCartSessionId(req: Request): string | undefined {
  const header = req.headers[CART_SESSION_HEADER];
  return Array.isArray(header) ? header[0] : header;
}

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('register')
  @ApiOperation({ summary: 'Đăng ký tài khoản mới' })
  @UsePipes(new ZodValidationPipe(registerSchema))
  register(@Body() body: RegisterInput, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.register(body, extractMeta(req), extractGuestCartSessionId(req));
  }

  @Public()
  @Post('login')
  @ApiOperation({ summary: 'Đăng nhập bằng email/mật khẩu' })
  @UsePipes(new ZodValidationPipe(loginSchema))
  login(@Body() body: LoginInput, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.login(body, extractMeta(req), extractGuestCartSessionId(req));
  }

  @Public()
  @Post('google')
  @ApiOperation({ summary: 'Đăng nhập/đăng ký bằng Google ID token' })
  @UsePipes(new ZodValidationPipe(googleAuthSchema))
  loginWithGoogle(@Body() body: GoogleAuthInput, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.loginWithGoogle(
      body.idToken,
      extractMeta(req),
      extractGuestCartSessionId(req),
    );
  }

  @Public()
  @Post('refresh')
  @ApiOperation({ summary: 'Làm mới access token bằng refresh token' })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  refresh(@Body() body: RefreshTokenInput, @Req() req: Request): Promise<AuthResponse> {
    return this.authService.refresh(body.refreshToken, extractMeta(req));
  }

  @Public()
  @Post('logout')
  @ApiOperation({ summary: 'Đăng xuất và thu hồi refresh token' })
  @UsePipes(new ZodValidationPipe(refreshTokenSchema))
  async logout(@Body() body: RefreshTokenInput): Promise<{ success: true }> {
    await this.authService.logout(body.refreshToken);
    return { success: true };
  }

  @Public()
  @Post('forgot-password')
  @ApiOperation({ summary: 'Yêu cầu đặt lại mật khẩu' })
  @UsePipes(new ZodValidationPipe(forgotPasswordSchema))
  async forgotPassword(@Body() body: ForgotPasswordInput): Promise<{ success: true }> {
    await this.authService.forgotPassword(body);
    return { success: true };
  }

  @Public()
  @Post('reset-password')
  @ApiOperation({ summary: 'Đặt lại mật khẩu bằng token' })
  @UsePipes(new ZodValidationPipe(resetPasswordSchema))
  async resetPassword(@Body() body: ResetPasswordInput): Promise<{ success: true }> {
    await this.authService.resetPassword(body);
    return { success: true };
  }

  @ApiBearerAuth()
  @Get('me')
  @ApiOperation({ summary: 'Lấy thông tin tài khoản hiện tại' })
  me(@CurrentUser() user: AuthenticatedUser): AuthenticatedUser {
    return user;
  }
}
