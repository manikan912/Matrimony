import { Controller, Get, Patch, Body, UseGuards, Req } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { UsersService } from './users.service';

@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
	constructor(private readonly usersService: UsersService) {}

	@Get('me')
	me(@Req() req: any) {
		return this.usersService.findById(req.user.userId);
	}

	@Patch('me')
	updateMe(@Req() req: any, @Body() body: any) {
		return this.usersService.updateProfile(req.user.userId, body);
	}
}
