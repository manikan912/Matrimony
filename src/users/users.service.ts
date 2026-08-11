import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class UsersService {
	constructor(private readonly prisma: PrismaService) {}

	async findById(id: string) {
		const user = await this.prisma.user.findUnique({ where: { id } });
		if (!user) throw new NotFoundException('User not found');
		return { id: user.id, mobile: user.mobile, name: user.name, email: user.email };
	}

	async updateProfile(id: string, data: any) {
		const allowed: any = {};
		if (data.name !== undefined) allowed.name = data.name;
		if (data.email !== undefined) allowed.email = data.email;

		const user = await this.prisma.user.update({ where: { id }, data: allowed });
		return { id: user.id, mobile: user.mobile, name: user.name, email: user.email };
	}
}
