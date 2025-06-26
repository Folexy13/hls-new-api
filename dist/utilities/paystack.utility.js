"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PaystackService = exports.InitializePaymentSchema = void 0;
const axios_1 = __importDefault(require("axios"));
const crypto_1 = __importDefault(require("crypto"));
const zod_1 = require("zod");
// Validation schemas for payment initialization
exports.InitializePaymentSchema = zod_1.z.object({
    amount: zod_1.z.number().positive("Amount must be positive"),
    email: zod_1.z.string().email("Invalid email format"),
    currency: zod_1.z.enum(["NGN", "USD", "GHS", "ZAR"]).default("NGN"),
    reference: zod_1.z.string().optional(),
    callback_url: zod_1.z.string().url("Invalid callback URL").optional(),
    metadata: zod_1.z.record(zod_1.z.any()).optional(),
});
class PaystackService {
    constructor() {
        this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
        this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || "";
        if (!this.secretKey) {
            throw new Error("Paystack API keys not configured");
        }
        this.client = axios_1.default.create({
            baseURL: "https://api.paystack.co",
            headers: {
                Authorization: "Bearer " + this.secretKey,
                "Content-Type": "application/json",
            },
        });
    }
    /**
     * Initialize a payment transaction
     * @param data Payment initialization data
     * @returns Payment authorization URL and reference
     */
    initializePayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                // Validate the input data
                const validatedData = exports.InitializePaymentSchema.parse(data);
                // Convert amount to kobo (Paystack expects amount in kobo)
                const amountInKobo = Math.round(validatedData.amount * 100);
                // Generate a unique reference if not provided
                const reference = validatedData.reference || this.generateReference();
                const response = yield this.client.post("/transaction/initialize", Object.assign(Object.assign({}, validatedData), { amount: amountInKobo, reference }));
                if (!response.data.status || !response.data.data.authorization_url) {
                    throw new Error("Failed to initialize payment");
                }
                return {
                    authorizationUrl: response.data.data.authorization_url,
                    reference: response.data.data.reference || reference,
                };
            }
            catch (error) {
                if (error instanceof zod_1.z.ZodError) {
                    throw new Error("Validation error: " + error.errors[0].message);
                }
                throw error;
            }
        });
    }
    /**
     * Verify a payment transaction
     * @param reference Transaction reference
     * @returns Transaction details
     */
    verifyPayment(reference) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield this.client.get("/transaction/verify/" + reference);
                if (!response.data.status) {
                    throw new Error("Payment verification failed");
                }
                return response.data.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    throw new Error("Payment verification failed: " +
                        (((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message));
                }
                throw error;
            }
        });
    }
    /**
     * List transactions with pagination
     * @param page Page number
     * @param perPage Items per page
     * @returns List of transactions
     */
    listTransactions() {
        return __awaiter(this, arguments, void 0, function* (page = 1, perPage = 50) {
            var _a, _b;
            try {
                const response = yield this.client.get("/transaction?page=" + page + "&perPage=" + perPage);
                return response.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    throw new Error("Failed to fetch transactions: " +
                        (((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message));
                }
                throw error;
            }
        });
    }
    /**
     * Refund a transaction
     * @param reference Transaction reference
     * @param amount Amount to refund (optional)
     * @returns Refund details
     */
    refundTransaction(reference, amount) {
        return __awaiter(this, void 0, void 0, function* () {
            var _a, _b;
            try {
                const response = yield this.client.post("/refund", {
                    transaction: reference,
                    amount: amount ? Math.round(amount * 100) : undefined,
                });
                return response.data;
            }
            catch (error) {
                if (axios_1.default.isAxiosError(error)) {
                    throw new Error("Refund failed: " + (((_b = (_a = error.response) === null || _a === void 0 ? void 0 : _a.data) === null || _b === void 0 ? void 0 : _b.message) || error.message));
                }
                throw error;
            }
        });
    }
    /**
     * Verify webhook signature
     * @param payload Raw request body
     * @param signature Paystack-Signature header
     * @returns boolean indicating if signature is valid
     */
    verifyWebhookSignature(payload, signature) {
        try {
            const hash = crypto_1.default
                .createHmac("sha512", this.secretKey)
                .update(payload)
                .digest("hex");
            return hash === signature;
        }
        catch (error) {
            console.error("Webhook signature verification failed:", error);
            return false;
        }
    }
    /**
     * Process webhook event
     * @param body Webhook request body
     * @param signature Paystack-Signature header
     * @returns Processed event data
     */
    processWebhook(body, signature) {
        return __awaiter(this, void 0, void 0, function* () {
            // Verify webhook signature
            const isValid = this.verifyWebhookSignature(JSON.stringify(body), signature);
            if (!isValid) {
                throw new Error("Invalid webhook signature");
            }
            const event = body.event;
            const data = body.data;
            switch (event) {
                case "charge.success":
                    return yield this.handleSuccessfulPayment(data);
                case "transfer.success":
                    return yield this.handleSuccessfulTransfer(data);
                case "transfer.failed":
                    return yield this.handleFailedTransfer(data);
                default:
                    console.log("Unhandled webhook event: " + event);
                    return { status: "unhandled", event };
            }
        });
    }
    /**
     * Generate a unique transaction reference
     * @returns Unique reference string
     */
    generateReference() {
        const timestamp = Date.now();
        const random = Math.floor(Math.random() * 1000000);
        return "TR" + timestamp + random;
    }
    /**
     * Handle successful payment webhook event
     * @param data Payment data
     */
    handleSuccessfulPayment(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement your payment success logic here
            // For example, update order status, send confirmation email, etc.
            return {
                status: "success",
                message: "Payment processed successfully",
                data,
            };
        });
    }
    /**
     * Handle successful transfer webhook event
     * @param data Transfer data
     */
    handleSuccessfulTransfer(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement your transfer success logic here
            return {
                status: "success",
                message: "Transfer processed successfully",
                data,
            };
        });
    }
    /**
     * Handle failed transfer webhook event
     * @param data Transfer data
     */
    handleFailedTransfer(data) {
        return __awaiter(this, void 0, void 0, function* () {
            // Implement your transfer failure logic here
            return {
                status: "failed",
                message: "Transfer failed",
                data,
            };
        });
    }
}
exports.PaystackService = PaystackService;
