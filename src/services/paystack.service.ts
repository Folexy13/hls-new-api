import axios from 'axios';

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE_URL = 'https://api.paystack.co';

export class PaystackService {
  static async initializeTransaction({
    email,
    amount,
    metadata,
    callbackUrl,
  }: {
    email: string;
    amount: number;
    metadata?: any;
    callbackUrl?: string;
  }) {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transaction/initialize`,
      {
        email,
        amount, // amount in kobo
        metadata,
        callback_url: callbackUrl,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );
    return response.data;
  }

  static async verifyTransaction(reference: string) {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/transaction/verify/${reference}`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return response.data;
  }

  static async createTransferRecipient({
    name,
    accountNumber,
    bankCode,
  }: {
    name: string;
    accountNumber: string;
    bankCode: string;
  }) {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transferrecipient`,
      {
        type: 'nuban',
        name,
        account_number: accountNumber,
        bank_code: bankCode,
        currency: 'NGN',
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  static async initiateTransfer({
    amount,
    recipient,
    reason,
  }: {
    amount: number;
    recipient: string;
    reason: string;
  }) {
    const response = await axios.post(
      `${PAYSTACK_BASE_URL}/transfer`,
      {
        source: 'balance',
        amount: Math.round(amount * 100),
        recipient,
        reason,
      },
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  }

  static async resolveBankCode(bankName: string) {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank?currency=NGN`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );

    const banks = Array.isArray(response.data?.data) ? response.data.data : [];
    const normalizedName = bankName.trim().toLowerCase();
    const match = banks.find((bank: any) => String(bank?.name || '').trim().toLowerCase() === normalizedName);

    if (!match?.code) {
      throw new Error(`Unable to resolve bank code for ${bankName}`);
    }

    return String(match.code);
  }
}
