import { Body, Controller, Get, Post } from '@nestjs/common';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Get('hello')
  hello() {
    return this.authService.hello();
  }

  @Get('register')
  registerForm() {
    return {
      message: 'Use POST /auth/register with a JSON body to register a user.',
      example: {
        username: 'your-username',
        password: 'your-password'
      }
    };
  }

  @Post('register')
  register(@Body() body: any) {
    return this.authService.register(body);
  }
}