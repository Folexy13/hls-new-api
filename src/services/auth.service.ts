import { injectable, inject } from "inversify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginUserDTO, RegisterUserDTO, RegisterBenfekDTO, RegisterUnreferredBenfekDTO } from "../DTOs/auth.dto";
import AuthRepositoryImpl from "../repositories/auth.repo";
import { ConflictError, UnauthorizedError } from "../utilities/errors";
import { config } from "../config/config";
import { NotificationService } from "../services/notification.service";
import { EmailService } from "./email.service";
import crypto from "crypto";

@injectable()
export class AuthService {
  constructor(
    @inject(AuthRepositoryImpl) private authRepository: AuthRepositoryImpl,
    @inject(NotificationService) private notificationService: NotificationService,
    @inject(EmailService) private emailService: EmailService
  ) {}

  async register(data: RegisterUserDTO) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    if (data.phone) {
      const existingPhone = await this.authRepository.findUserByPhone(data.phone);
      if (existingPhone) {
        throw new ConflictError("Phone number is already registered.");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      ...data,
      password: hashedPassword,
    });

    return this.createAuthResponse(user);
  }

  async login(data: LoginUserDTO) {
    const user = await this.authRepository.findUserByEmail(data.email);
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
    const user = await this.authRepository.findUserByEmail(email);
    if (!user) {
      // Don't leak if email exists
      return;
    }
    
    // Generate magic link token (short-lived JWT)
    const resetToken = jwt.sign(
      { userId: user.id },
      config.jwtSecret,
      { expiresIn: "1h" }
    );
    
    // Send email using EmailService
    await this.emailService.sendMagicLink(email, resetToken);
  }

  async resetPassword(token: string, newPassword?: string) {
    let decoded: any;
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (e) {
      throw new UnauthorizedError("Invalid or expired reset token.");
    }

    const user = await this.authRepository.findUserById(decoded.userId);
    if (!user) {
      throw new UnauthorizedError("User not found.");
    }

    if (newPassword) {
      const hashedPassword = await bcrypt.hash(newPassword, 10);
      await this.authRepository.updateUserPassword(user.id, hashedPassword);
    }
    
    // Return a fresh set of tokens if they clicked the magic link to just login
    return this.createAuthResponse(user);
  }

  async registerBenfek(data: RegisterBenfekDTO) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    const existingUsername = await this.authRepository.findUserByUsername(data.username);
    if (existingUsername) {
      throw new ConflictError("Username is already taken.");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      email: data.email,
      username: data.username,
      password: hashedPassword,
      firstName: data.username,
      lastName: data.username,
      role: "benfek"
    });

    return this.createAuthResponse(user);
  }

  async registerUnreferredBenfek(data: RegisterUnreferredBenfekDTO) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new ConflictError("Email address is already registered.");
    }

    if (data.phone) {
      const existingPhone = await this.authRepository.findUserByPhone(data.phone);
      if (existingPhone) {
        throw new ConflictError("Phone number is already registered.");
      }
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      email: data.email,
      username: data.email,
      password: hashedPassword,
      firstName: data.firstName,
      lastName: data.lastName,
      phone: data.phone,
      role: "benfek"
    });

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
