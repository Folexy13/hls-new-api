"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.container = void 0;
const inversify_1 = require("inversify");
const client_1 = require("@prisma/client");
const ping_controller_1 = require("../controllers/ping.controller");
const auth_controller_1 = require("../controllers/auth.controller");
const auth_service_1 = require("../services/auth.service");
const auth_repo_1 = __importDefault(require("../repositories/auth.repo"));
const wallet_controller_1 = require("../controllers/wallet.controller");
const wallet_service_1 = require("../services/wallet.service");
const wallet_repository_1 = require("../repositories/wallet.repository");
const withdrawal_repository_1 = require("../repositories/withdrawal.repository");
const auth_guard_1 = require("../middlewares/auth.guard");
const response_utility_1 = require("../utilities/response.utility");
const podcast_repository_1 = require("../repositories/podcast.repository");
const podcast_service_1 = require("../services/podcast.service");
const podcast_controller_1 = require("../controllers/podcast.controller");
const s3_utility_1 = require("../utilities/s3.utility");
const cart_service_1 = require("../services/cart.service");
const cart_controller_1 = require("../controllers/cart.controller");
const cart_repository_1 = require("../repositories/cart.repository");
const supplement_repository_1 = require("../repositories/supplement.repository");
const supplement_service_1 = require("../services/supplement.service");
const supplement_controller_1 = require("../controllers/supplement.controller");
const container = new inversify_1.Container();
exports.container = container;
// Bind container instance
container.bind(inversify_1.Container).toConstantValue(container);
// Initialize PrismaClient
const prisma = new client_1.PrismaClient();
container.bind('PrismaClient').toConstantValue(prisma);
// Bind repositories
container.bind(auth_repo_1.default).toSelf();
container.bind(wallet_repository_1.WalletRepository).toSelf();
container.bind(withdrawal_repository_1.WithdrawalRepository).toSelf();
container.bind(podcast_repository_1.PodcastRepository).toSelf();
container.bind(cart_repository_1.CartRepository).toSelf();
container.bind(supplement_repository_1.SupplementRepository).toSelf();
// Bind utilities
container.bind(response_utility_1.ResponseUtil).toSelf();
container.bind(auth_guard_1.AuthGuard).toSelf();
container.bind(s3_utility_1.S3Service).toSelf();
// Bind services
container.bind(auth_service_1.AuthService).toSelf();
container.bind(wallet_service_1.WalletService).toSelf();
container.bind(podcast_service_1.PodcastService).toSelf();
container.bind(cart_service_1.CartService).toSelf();
container.bind(supplement_service_1.SupplementService).toSelf();
// Bind controllers
container.bind(ping_controller_1.PingController).toSelf();
container.bind(auth_controller_1.AuthController).toSelf();
container.bind(wallet_controller_1.WalletController).toSelf();
container.bind(podcast_controller_1.PodcastController).toSelf();
container.bind(cart_controller_1.CartController).toSelf();
container.bind(supplement_controller_1.SupplementController).toSelf();
//# sourceMappingURL=container.js.map