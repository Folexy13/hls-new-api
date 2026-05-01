import { PrismaClient, User } from '@prisma/client';
import { inject, injectable } from 'inversify';

@injectable()
export class PrincipalRepository {
  constructor(@inject('PrismaClient') private prisma: PrismaClient) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({ where: { email } });
  }

  async createPrincipal(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
    profileImageUrl?: string;
    profession?: string;
    currentPlaceOfWork?: string;
    licenseNumber?: string;
    yearsOfExperience?: string;
    preferredPaymentMethod?: string;
    bankName?: string;
    accountNumber?: string;
    accountName?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        profileImageUrl: data.profileImageUrl,
        profession: data.profession,
        currentPlaceOfWork: data.currentPlaceOfWork,
        licenseNumber: data.licenseNumber,
        yearsOfExperience: data.yearsOfExperience,
        preferredPaymentMethod: data.preferredPaymentMethod,
        bankName: data.bankName,
        accountNumber: data.accountNumber,
        accountName: data.accountName,
        role: 'principal',
        wallet: {
          create: {
            balance: 0,
          },
        },
      },
    });
  }

  async createBenfek(data: {
    email: string;
    password: string;
    firstName: string;
    lastName: string;
    phone?: string;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        username: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
        role: 'benfek',
      },
    });
  }

  async findAllPrincipals(skip: number, take: number): Promise<User[]> {
    return this.prisma.user.findMany({
      where: { role: 'principal' },
      skip,
      take,
      orderBy: { createdAt: 'desc' },
    });
  }

  async countPrincipals(): Promise<number> {
    return this.prisma.user.count({ where: { role: 'principal' } });
  }

  async findPrincipalById(id: number): Promise<User | null> {
    return this.prisma.user.findFirst({
      where: { id, role: 'principal' },
    });
  }

  async updatePrincipal(
    id: number,
    data: Partial<{
      email: string;
      password: string;
      firstName: string;
      lastName: string;
      phone: string;
      profileImageUrl: string;
      profession: string;
      currentPlaceOfWork: string;
      licenseNumber: string;
      yearsOfExperience: string;
      preferredPaymentMethod: string;
      bankName: string;
      accountNumber: string;
      accountName: string;
    }>
  ): Promise<User> {
    return this.prisma.user.update({
      where: { id },
      data,
    });
  }

  async deletePrincipal(id: number): Promise<User> {
    return this.prisma.user.delete({ where: { id } });
  }
}
