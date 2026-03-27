import { injectable, inject } from "inversify";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { LoginUserDTO, RegisterUserDTO, RegisterBenfekDTO } from "../DTOs/auth.dto";
import AuthRepositoryImpl from "../repositories/auth.repo";
import { UnauthorizedError } from "../utilities/errors";
import { config } from "../config/config";

@injectable()
export class AuthService {
  constructor(
    @inject(AuthRepositoryImpl) private authRepository: AuthRepositoryImpl
  ) {}

  async register(data: RegisterUserDTO) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User already exists");
    }

    const hashedPassword = await bcrypt.hash(data.password, 10);
    const user = await this.authRepository.createUser({
      ...data,
      password: hashedPassword,
    });

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async login(data: LoginUserDTO) {
    const user = await this.authRepository.findUserByEmail(data.email);
    if (!user) {
      throw new UnauthorizedError("Invalid credentials");
    }

    const isPasswordValid = await bcrypt.compare(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedError("Invalid credentials");
    }

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

  async registerBenfek(data: RegisterBenfekDTO) {
    const existingUser = await this.authRepository.findUserByEmail(data.email);
    if (existingUser) {
      throw new Error("User already exists");
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

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  private generateAccessToken(user: any): string {
    return jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
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
