import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class AuthService {
  constructor(private readonly prisma: PrismaService) {}

  hello() {
    return {
      success: true,
      message: 'Hello from Auth API',
    };
  }

  async register(body: any) {
    const user = await this.prisma.user.create({
      data: {
        mobile: body.mobile,
        name: body.name ?? null,
      },
    });

    return {
      success: true,
      message: 'User registered successfully',
      user: {
        id: user.id,
        mobile: user.mobile,
        name: user.name,
      },
    };
  }
}