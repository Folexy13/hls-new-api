import { Container } from 'inversify';
import { PrismaClient } from '@prisma/client';
import { PingController } from '../controllers/ping.controller';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import AuthRepositoryImpl from '../repositories/auth.repo';
import { WalletController } from '../controllers/wallet.controller';
import { WalletService } from '../services/wallet.service';
import { WalletRepository } from '../repositories/wallet.repository';
import { WithdrawalRepository } from '../repositories/withdrawal.repository';
import { AuthGuard } from '../middlewares/auth.guard';
import { ResponseUtil } from '../utilities/response.utility';
import { PodcastRepository } from '../repositories/podcast.repository';
import { PodcastService } from '../services/podcast.service';
import { PodcastController } from '../controllers/podcast.controller';
import { S3Service } from '../utilities/s3.utility';
import { CartService } from '../services/cart.service';
import { CartController } from '../controllers/cart.controller';
import { CartRepository } from '../repositories/cart.repository';
import { SupplementRepository } from '../repositories/supplement.repository';
import { SupplementService } from '../services/supplement.service';
import { SupplementController } from '../controllers/supplement.controller';
import { PaystackRepository } from '../repositories/paystack.repository';
import { PaystackController } from '../controllers/paystack.controller';

const container = new Container();

// Bind container instance
container.bind<Container>(Container).toConstantValue(container);

// Initialize PrismaClient
const prisma = new PrismaClient();
container.bind<PrismaClient>('PrismaClient').toConstantValue(prisma);

// Bind repositories
container.bind<AuthRepositoryImpl>(AuthRepositoryImpl).toSelf();
container.bind<WalletRepository>(WalletRepository).toSelf();
container.bind<WithdrawalRepository>(WithdrawalRepository).toSelf();
container.bind<PodcastRepository>(PodcastRepository).toSelf();
container.bind<CartRepository>(CartRepository).toSelf();
container.bind<SupplementRepository>(SupplementRepository).toSelf();
container.bind<PaystackRepository>(PaystackRepository).toSelf();

// Bind utilities
container.bind<ResponseUtil>(ResponseUtil).toSelf();
container.bind<AuthGuard>(AuthGuard).toSelf();
container.bind<S3Service>(S3Service).toSelf();

// Bind services
container.bind<AuthService>(AuthService).toSelf();
container.bind<WalletService>(WalletService).toSelf();
container.bind<PodcastService>(PodcastService).toSelf();
container.bind<CartService>(CartService).toSelf();
container.bind<SupplementService>(SupplementService).toSelf();

// Bind controllers
container.bind<PingController>(PingController).toSelf();
container.bind<AuthController>(AuthController).toSelf();
container.bind<WalletController>(WalletController).toSelf();
container.bind<PodcastController>(PodcastController).toSelf();
container.bind<CartController>(CartController).toSelf();
container.bind<SupplementController>(SupplementController).toSelf();
container.bind<PaystackController>(PaystackController).toSelf();

export { container };
