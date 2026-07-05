import 'dotenv/config';
import { NutrientTypeRepository } from '../repositories/nutrienttype.repository';
import { NutrientTypeService } from '../services/nutrienttype.service';
import { NutrientTypeController } from '../controllers/nutrienttype.controller';
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
import { OrderRepository } from '../repositories/order.repository';
import { QuizCodeRepository } from '../repositories/quizcode.repository';
import { QuizCodeController } from '../controllers/quizcode.controller';
import { PrincipalRepository } from '../repositories/principal.repository';
import { PrincipalService } from '../services/principal.service';
import { PrincipalController } from '../controllers/principal.controller';
import { ResearcherController } from '../controllers/researcher.controller';
import { BenfekController } from '../controllers/benfek.controller';
import { ContentController } from '../controllers/content.controller';
import { NotificationService } from '../services/notification.service';
import { OneSignalService } from '../services/onesignal.service';
import { EmailService } from '../services/email.service';

const container = new Container();

// Bind container instance
container.bind<Container>(Container).toConstantValue(container);

// Initialize PrismaClient
import { PrismaMariaDb } from '@prisma/adapter-mariadb';

if (!process.env.DATABASE_URL) {
  throw new Error('DATABASE_URL is not configured. Add it to api/.env locally and to the deployed service environment.');
}

type PrismaMariaDbConfig = ConstructorParameters<typeof PrismaMariaDb>[0];

const buildMariaDbPoolConfig = (databaseUrl: string): PrismaMariaDbConfig => {
  const url = new URL(databaseUrl);
  const sslMode = url.searchParams.get('ssl-mode') || url.searchParams.get('sslmode');
  const connectionLimit = Number(process.env.DB_CONNECTION_LIMIT || 5);

  return {
    host: url.hostname,
    port: Number(url.port || 3306),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    database: url.pathname.replace(/^\//, ''),
    connectionLimit,
    connectTimeout: Number(process.env.DB_CONNECT_TIMEOUT_MS || 20000),
    acquireTimeout: Number(process.env.DB_ACQUIRE_TIMEOUT_MS || 20000),
    ssl: sslMode && sslMode.toLowerCase() !== 'disabled'
      ? { rejectUnauthorized: false }
      : undefined,
  };
};

const adapter = new PrismaMariaDb(buildMariaDbPoolConfig(process.env.DATABASE_URL));
const prisma = new PrismaClient({ adapter });
container.bind<PrismaClient>('PrismaClient').toConstantValue(prisma as any);

// Bind repositories
container.bind<NutrientTypeRepository>(NutrientTypeRepository).toSelf();
container.bind<AuthRepositoryImpl>(AuthRepositoryImpl).toSelf();
container.bind<WalletRepository>(WalletRepository).toSelf();
container.bind<WithdrawalRepository>(WithdrawalRepository).toSelf();
container.bind<PodcastRepository>(PodcastRepository).toSelf();
container.bind<CartRepository>(CartRepository).toSelf();
container.bind<SupplementRepository>(SupplementRepository).toSelf();
container.bind<PaystackRepository>(PaystackRepository).toSelf();
container.bind<OrderRepository>(OrderRepository).toSelf();
container.bind<QuizCodeRepository>(QuizCodeRepository).toSelf();
container.bind<PrincipalRepository>(PrincipalRepository).toSelf();

// Bind utilities
container.bind<ResponseUtil>(ResponseUtil).toSelf();
container.bind<AuthGuard>(AuthGuard).toSelf();
container.bind<S3Service>(S3Service).toSelf();

// Bind services
container.bind<NutrientTypeService>(NutrientTypeService).toSelf();
container.bind<AuthService>(AuthService).toSelf();
container.bind<WalletService>(WalletService).toSelf();
container.bind<PodcastService>(PodcastService).toSelf();
container.bind<CartService>(CartService).toSelf();
container.bind<SupplementService>(SupplementService).toSelf();
container.bind<NotificationService>(NotificationService).toSelf();
container.bind<PrincipalService>(PrincipalService).toSelf();
container.bind<OneSignalService>(OneSignalService).toSelf();
container.bind<EmailService>(EmailService).toSelf();

// Bind controllers
container.bind<NutrientTypeController>(NutrientTypeController).toSelf();
container.bind<PingController>(PingController).toSelf();
container.bind<AuthController>(AuthController).toSelf();
container.bind<WalletController>(WalletController).toSelf();
container.bind<PodcastController>(PodcastController).toSelf();
container.bind<CartController>(CartController).toSelf();
container.bind<SupplementController>(SupplementController).toSelf();
container.bind<PaystackController>(PaystackController).toSelf();
container.bind<QuizCodeController>(QuizCodeController).toSelf();
container.bind<PrincipalController>(PrincipalController).toSelf();
container.bind<ResearcherController>(ResearcherController).toSelf();
container.bind<BenfekController>(BenfekController).toSelf();
container.bind<ContentController>(ContentController).toSelf();

export { container };
