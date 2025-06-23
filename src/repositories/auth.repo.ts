
import { PrismaClient, User } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { RegisterUserDTO } from '../dtos/auth.dto';
import { AuthRepository } from './Abstractions/authrepo';

@injectable()
export default class AuthRepositoryImpl implements AuthRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async createUser(data: RegisterUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        password: data.password, // Note: Password should be hashed before storage
        firstName: data.firstName,
        lastName: data.lastName
      }
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.create({
      data: {
        token: refreshToken,
        userId
      }
    });
  }

  async findUserByRefreshToken(refreshToken: string): Promise<User | null> {
    const tokenRecord = await this.prisma.refreshToken.findUnique({
      where: { token: refreshToken },
      include: { user: true }
    });
    return tokenRecord?.user || null;
  }

  async invalidateRefreshToken(refreshToken: string): Promise<void> {
    await this.prisma.refreshToken.delete({
      where: { token: refreshToken }
    });
  }
}
