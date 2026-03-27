
import { PrismaClient, User } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { RegisterUserDTO } from '../DTOs/auth.dto';
import { AuthRepository } from './Abstractions/authrepo';

@injectable()
export default class AuthRepositoryImpl implements AuthRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async createUser(data: RegisterUserDTO): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: (data as any).username ?? data.email,
        password: data.password, // Note: Password should be hashed before storage
        firstName: data.firstName,
        lastName: data.lastName,
        role: data.role || 'benfek'
      }
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async saveRefreshToken(userId: number, refreshToken: string): Promise<void> {
    // First, delete any existing refresh tokens for this user to avoid duplicates
    await this.prisma.refreshToken.deleteMany({
      where: { userId }
    });
    
    // Then create the new refresh token
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
    try {
      await this.prisma.refreshToken.delete({
        where: { token: refreshToken }
      });
    } catch (error) {
      // Token might already be deleted, ignore the error
      console.log('Token already invalidated or not found');
    }
  }
}
