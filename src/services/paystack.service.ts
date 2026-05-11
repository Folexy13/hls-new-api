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

  static async getBanks() {
    const response = await axios.get(
      `${PAYSTACK_BASE_URL}/bank?currency=NGN`,
      {
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        },
      }
    );
    return Array.isArray(response.data?.data) ? response.data.data : [];
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
      throw new Error('We could not find the selected bank. Please choose the correct bank from the list and try again.');
    }

    return String(match.code);
  }

  static async resolveAccountNumber(bankName: string, accountNumber: string, bankCode?: string) {
    const resolvedBankCode = bankCode?.trim() || (await this.resolveBankCode(bankName));

    try {
      const response = await axios.get(
        `${PAYSTACK_BASE_URL}/bank/resolve?account_number=${accountNumber}&bank_code=${resolvedBankCode}`,
        {
          headers: {
            Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          },
        }
      );

      if (!response.data?.data?.account_name) {
        console.error('[Paystack account resolve] Missing account name in response', {
          bankName,
          bankCode: resolvedBankCode,
          accountNumber,
          paystackResponse: response.data,
        });
        throw new Error('We could not confirm the account name. Please check the bank and account number, then try again.');
      }

      return response.data.data.account_name;
    } catch (error: any) {
      console.error('[Paystack account resolve] Backend lookup failed', {
        bankName,
        bankCode: resolvedBankCode,
        accountNumber,
        status: error?.response?.status,
        statusText: error?.response?.statusText,
        paystackResponse: error?.response?.data,
        message: error?.message,
      });
      throw error;
    }
  }
}
