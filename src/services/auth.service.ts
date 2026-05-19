import { injectable, inject } from "inversify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { PrismaClient } from "@prisma/client";
import { LoginUserDTO, RegisterUserDTO, RegisterBenfekDTO, RegisterUnreferredBenfekDTO } from "../DTOs/auth.dto";
import AuthRepositoryImpl from "../repositories/auth.repo";
import { ConflictError, UnauthorizedError, NotFoundError } from "../utilities/errors";
import { config } from "../config/config";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "./email.service";
import crypto from "crypto";
import { normalizeEmail, normalizePhone } from "../utilities/contact-normalizer.utility";

const HLS_PHARMACY_NAME = "HLS Pharmacy";

const resolveDefaultPharmacyFromPrincipal = (principal?: {
  profession?: string | null;
  currentPlaceOfWork?: string | null;
  phone?: string | null;
  whatsappNumber?: string | null;
  referPharmacy?: boolean | null;
  referredPharmacyName?: string | null;
  referredPharmacyPhone?: string | null;
}) => {
  const profession = principal?.profession?.trim().toLowerCase() || "";

  if (profession === "hls ap") {
    return {
      preferredPharmacyName: HLS_PHARMACY_NAME,
      preferredPharmacyPhone: null,
    };
  }

  if (profession === "pharmacist" && principal?.currentPlaceOfWork?.trim()) {
    return {
      preferredPharmacyName: principal.currentPlaceOfWork.trim(),
      preferredPharmacyPhone: principal.phone?.trim() || principal.whatsappNumber?.trim() || null,
    };
  }

  if (profession !== "pharmacist" && principal?.referPharmacy && principal.referredPharmacyName?.trim()) {
    return {
      preferredPharmacyName: principal.referredPharmacyName.trim(),
      preferredPharmacyPhone: principal.referredPharmacyPhone?.trim() || null,
    };
  }

  return {
    preferredPharmacyName: null,
    preferredPharmacyPhone: null,
  };
};

@injectable()
export class AuthService {
  constructor(
    @inject(AuthRepositoryImpl) private authRepository: AuthRepositoryImpl,
    @inject('PrismaClient') private prisma: PrismaClient,
    @inject(NotificationService) private notificationService: NotificationService,
    @inject(EmailService) private emailService: EmailService
  ) {}

  async register(data: RegisterUserDTO) {
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    if (phone) {
      const existingPhone = await this.authRepository.findUserByPhone(phone);
      if (existingPhone) {
        throw new ConflictError("Phone number is already registered.");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      ...data,
      email,
      phone: phone || undefined,
      password: hashedPassword,
    });

    return this.createAuthResponse(user);
  }

  async login(data: LoginUserDTO) {
    const user = await this.authRepository.findUserByEmail(normalizeEmail(data.email));
    if (!user) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid email or password.");
    }

    await this.notificationService.notifyPreferredVendorAcceptance(user).catch(() => undefined);

    return this.createAuthResponse(user);
  }

  async refreshToken(refreshToken: string) {
    console.log('Attempting to refresh token:', refreshToken.substring(0, 10) + '...');
    const user = await this.authRepository.findUserByRefreshToken(refreshToken);
    if (!user) {
      console.warn('Refresh token not found in database');
      throw new UnauthorizedError("Invalid refresh token");
    }
    console.log('Refresh token valid for user:', user.id);

    const newAccessToken = this.generateAccessToken(user);
    const newRefreshToken = this.generateRefreshToken(user);

    await this.authRepository.invalidateRefreshToken(refreshToken);
    await this.authRepository.saveRefreshToken(user.id, newRefreshToken);

    return {
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
        researcherType: (user as any).researcherType ?? null,
      },
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    };
  }

  async logout(refreshToken: string) {
    await this.authRepository.invalidateRefreshToken(refreshToken);
  }

  async forgotPassword(email: string) {
    const normalizedEmail = normalizeEmail(email);
    const user = await this.authRepository.findUserByEmail(normalizedEmail);
    if (!user) {
      throw new NotFoundError("User with this email does not exist.");
    }
    
    // Invalidate existing tokens first by updating the password slightly, or relying on something bound to the current state.
    // However, generating a one-time token bound to the current password hash works best.
    const secret = config.jwtSecret + user.password; // Token becomes invalid immediately if password is changed

    // Generate magic link token (short-lived JWT - 15 minutes max)
    const resetToken = jwt.sign(
      { userId: user.id },
      secret,
      { expiresIn: "15m" }
    );
    
    // Send email using EmailService
    await this.emailService.sendMagicLink(normalizedEmail, resetToken);
  }

  async resetPassword(token: string, newPassword?: string) {
    // We decode first without verifying to get the userId, so we can fetch the user's current password hash
    const decodedUnverified = jwt.decode(token) as { userId: number } | null;
    if (!decodedUnverified || !decodedUnverified.userId) {
      throw new UnauthorizedError("Invalid reset token.");
    }

    const user = await this.authRepository.findUserById(decodedUnverified.userId);
    if (!user) {
      throw new UnauthorizedError("User not found.");
    }

    const secret = config.jwtSecret + user.password;

    let decoded: any;
    try {
      decoded = jwt.verify(token, secret);
    } catch (e) {
      throw new UnauthorizedError("Invalid, expired, or already used reset token.");
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.authRepository.updateUserPassword(user.id, hashedPassword);
    }
    
    // Return a fresh set of tokens if they clicked the magic link to just login
    return this.createAuthResponse(user);
  }

  async registerBenfek(data: RegisterBenfekDTO) {
    const email = normalizeEmail(data.email);
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    const existingUsername = await this.authRepository.findUserByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError("Username is already taken.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      email,
      username: data.username,
      password: hashedPassword,
      firstName: data.username,
      lastName: data.username,
      role: "benfek"
    });

    // Notify admin
    await this.emailService.sendEmail(
      "admin@hlsnigeria.com",
      "New Benfek Registration",
      `<p>A new benfek has registered with username: <b>${data.username}</b> and email: <b>${email}</b>.</p>`
    );

    return this.createAuthResponse(user);
  }

  async registerUnreferredBenfek(data: RegisterUnreferredBenfekDTO) {
    const email = normalizeEmail(data.email);
    const phone = normalizePhone(data.phone);
    const existingUser = await this.authRepository.findUserByEmail(email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    if (phone) {
      const existingPhone = await this.authRepository.findUserByPhone(phone);
      if (existingPhone) {
        throw new ConflictError("Phone number is already registered.");
      }
    }

    const linkedQuizCode = data.quizCode
      ? await this.prisma.quizCode.findUnique({
          where: { code: data.quizCode },
          include: {
            creator: {
              select: {
                profession: true,
                currentPlaceOfWork: true,
                phone: true,
                whatsappNumber: true,
                referPharmacy: true,
                referredPharmacyName: true,
                referredPharmacyPhone: true,
              },
            },
          },
        })
      : null;
    const defaultPharmacy = resolveDefaultPharmacyFromPrincipal(linkedQuizCode?.creator);

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      email,
      username: email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: phone || undefined,
      role: "benfek",
      preferredPharmacyName: defaultPharmacy.preferredPharmacyName || undefined,
      preferredPharmacyPhone: defaultPharmacy.preferredPharmacyPhone || undefined,
    });

    if (data.quizCode) {
      await this.prisma.quizCode.updateMany({
        where: {
          code: data.quizCode,
          isUsed: true,
          OR: [{ usedBy: null }, { usedBy: user.id }],
        },
        data: {
          usedBy: user.id,
          usedAt: new Date(),
        },
      });
    }

    // Notify admin
    await this.emailService.sendEmail(
      "admin@hlsnigeria.com",
      "New Benfek Registration (Unreferred)",
      `<p>A new benfek has registered with email: <b>${email}</b>${data.firstName ? ` and name: <b>${data.firstName} ${data.lastName}</b>` : ""}.</p>`
    );

    return this.createAuthResponse(user);
  }

  private async createAuthResponse(user: any) {
    const accessToken = this.generateAccessToken(user);
    const refreshToken = this.generateRefreshToken(user);

    await this.authRepository.saveRefreshToken(user.id, refreshToken);

    const { password, ...userWithoutPassword } = user;
    return {
      user: userWithoutPassword,
      tokens: {
        accessToken,
        refreshToken,
      },
    };
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        role: user.role,
        researcherType: user.researcherType ?? null,
      },
      config.jwtSecret,
      { expiresIn: "15m" }
    );
  }

  private generateRefreshToken(user: any): string {
    return jwt.sign(
      { userId: user.id },
      config.jwtRefreshSecret,
      { expiresIn: "7d" }
    );
  }
}


