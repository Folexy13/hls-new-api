
import { PrismaClient, User } from '@prisma/client';
import { injectable, inject } from 'inversify';
import { RegisterUserDTO } from '../DTOs/auth.dto';
import { AuthRepository } from './Abstractions/authrepo';
import { getPhoneSearchVariants } from '../utilities/contact-normalizer.utility';

@injectable()
export default class AuthRepositoryImpl implements AuthRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async createUser(
    data: Omit<RegisterUserDTO, 'phone'> & {
      username?: string;
      phone?: string | null;
      researcherType?: "maker" | "checker" | null;
      preferredPharmacyName?: string | null;
      preferredPharmacyPhone?: string | null;
    }
  ): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: (data as any).username ?? data.email,
        password: data.password, // Note: Password should be hashed before storage
        firstName: data.firstName,
        lastName: data.lastName,
        businessName: (data as any).businessName ?? null,
        mainBranch: (data as any).mainBranch ?? null,
        contact: (data as any).contact ?? null,
        phone: data.phone ?? null,
        preferredPharmacyName: data.preferredPharmacyName ?? null,
        preferredPharmacyPhone: data.preferredPharmacyPhone ?? null,
        role: data.role || 'benfek',
        researcherType:
          data.role === "researcher"
            ? (data.researcherType ?? "maker")
            : null,
        ...(data.role === 'principal'
          ? {
              wallet: {
                create: {
                  balance: 0,
                },
              },
            }
          : {}),
      } as any
    });
  }

  async findUserByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email }
    });
  }

  async findUserById(id: number): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id }
    });
  }

  async updateUserPassword(id: number, password: string): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data: { password }
    });
  }

  async findUserByUsername(username: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { username }
    });
  }

  async findUserByPhone(phone: string): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: {
        phone: {
          in: getPhoneSearchVariants(phone),
        },
      },
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
