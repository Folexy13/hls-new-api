import axios, { AxiosInstance } from "axios";
import crypto from "crypto";
import { z } from "zod";

// Paystack API response types
export interface PaystackTransactionResponse {
  status: boolean;
  message: string;
  data: {
    authorization_url?: string;
    access_code?: string;
    reference?: string;
    status?: string;
    amount?: number;
    gateway_response?: string;
    paid_at?: string;
    created_at?: string;
    channel?: string;
    currency?: string;
    customer?: {
      email: string;
      name?: string;
      phone?: string;
    };
  };
}

// Validation schemas for payment initialization
export const InitializePaymentSchema = z.object({
  amount: z.number().positive("Amount must be positive"),
  email: z.string().email("Invalid email format"),
  currency: z.enum(["NGN", "USD", "GHS", "ZAR"]).default("NGN"),
  reference: z.string().optional(),
  callback_url: z.string().url("Invalid callback URL").optional(),
  metadata: z.record(z.any()).optional(),
});

export type InitializePaymentDTO = z.infer<typeof InitializePaymentSchema>;

export class PaystackService {
  private readonly client: AxiosInstance;
  private readonly secretKey: string;
  private readonly publicKey: string;

  constructor() {
    this.secretKey = process.env.PAYSTACK_SECRET_KEY || "";
    this.publicKey = process.env.PAYSTACK_PUBLIC_KEY || "";

    if (!this.secretKey ) {
      throw new Error("Paystack API keys not configured");
    }

    this.client = axios.create({
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
  async initializePayment(data: InitializePaymentDTO): Promise<{
    authorizationUrl: string;
    reference: string;
  }> {
    try {
      // Validate the input data
      const validatedData = InitializePaymentSchema.parse(data);

      // Convert amount to kobo (Paystack expects amount in kobo)
      const amountInKobo = Math.round(validatedData.amount * 100);

      // Generate a unique reference if not provided
      const reference = validatedData.reference || this.generateReference();
      const response = await this.client.post<PaystackTransactionResponse>(
        "/transaction/initialize",
        {
          ...validatedData,
          amount: amountInKobo,
          reference,
        }
      );

      if (!response.data.status || !response.data.data.authorization_url) {
        throw new Error("Failed to initialize payment");
      }

      return {
        authorizationUrl: response.data.data.authorization_url,
        reference: response.data.data.reference || reference,
      };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error("Validation error: " + error.errors[0].message);
      }
      throw error;
    }
  }

  /**
   * Verify a payment transaction
   * @param reference Transaction reference
   * @returns Transaction details
   */
  async verifyPayment(
    reference: string
  ): Promise<PaystackTransactionResponse["data"]> {
    try {
      const response = await this.client.get<PaystackTransactionResponse>(
        "/transaction/verify/" + reference
      );

      if (!response.data.status) {
        throw new Error("Payment verification failed");
      }

      return response.data.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          "Payment verification failed: " +
            (error.response?.data?.message || error.message)
        );
      }
      throw error;
    }
  }

  /**
   * List transactions with pagination
   * @param page Page number
   * @param perPage Items per page
   * @returns List of transactions
   */
  async listTransactions(page = 1, perPage = 50) {
    try {
      const response = await this.client.get<PaystackTransactionResponse>(
        "/transaction?page=" + page + "&perPage=" + perPage
      );

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          "Failed to fetch transactions: " +
            (error.response?.data?.message || error.message)
        );
      }
      throw error;
    }
  }

  /**
   * Refund a transaction
   * @param reference Transaction reference
   * @param amount Amount to refund (optional)
   * @returns Refund details
   */
  async refundTransaction(reference: string, amount?: number) {
    try {
      const response = await this.client.post("/refund", {
        transaction: reference,
        amount: amount ? Math.round(amount * 100) : undefined,
      });

      return response.data;
    } catch (error) {
      if (axios.isAxiosError(error)) {
        throw new Error(
          "Refund failed: " + (error.response?.data?.message || error.message)
        );
      }
      throw error;
    }
  }

  /**
   * Verify webhook signature
   * @param payload Raw request body
   * @param signature Paystack-Signature header
   * @returns boolean indicating if signature is valid
   */
  verifyWebhookSignature(payload: string, signature: string): boolean {
    try {
      const hash = crypto
        .createHmac("sha512", this.secretKey)
        .update(payload)
        .digest("hex");

      return hash === signature;
    } catch (error) {
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
  async processWebhook(body: any, signature: string) {
    // Verify webhook signature
    const isValid = this.verifyWebhookSignature(
      JSON.stringify(body),
      signature
    );
    if (!isValid) {
      throw new Error("Invalid webhook signature");
    }

    const event = body.event;
    const data = body.data;

    switch (event) {
      case "charge.success":
        return await this.handleSuccessfulPayment(data);
      case "transfer.success":
        return await this.handleSuccessfulTransfer(data);
      case "transfer.failed":
        return await this.handleFailedTransfer(data);
      default:
        console.log("Unhandled webhook event: " + event);
        return { status: "unhandled", event };
    }
  }

  /**
   * Generate a unique transaction reference
   * @returns Unique reference string
   */
  private generateReference(): string {
    const timestamp = Date.now();
    const random = Math.floor(Math.random() * 1000000);
    return "TR" + timestamp + random;
  }

  /**
   * Handle successful payment webhook event
   * @param data Payment data
   */
  private async handleSuccessfulPayment(data: any) {
    // Implement your payment success logic here
    // For example, update order status, send confirmation email, etc.
    return {
      status: "success",
      message: "Payment processed successfully",
      data,
    };
  }

  /**
   * Handle successful transfer webhook event
   * @param data Transfer data
   */
  private async handleSuccessfulTransfer(data: any) {
    // Implement your transfer success logic here
    return {
      status: "success",
      message: "Transfer processed successfully",
      data,
    };
  }

  /**
   * Handle failed transfer webhook event
   * @param data Transfer data
   */
  private async handleFailedTransfer(data: any) {
    // Implement your transfer failure logic here
    return {
      status: "failed",
      message: "Transfer failed",
      data,
    };
  }
}
