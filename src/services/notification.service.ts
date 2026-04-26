import axios from 'axios';
import { injectable } from 'inversify';
import { config } from '../config/config';

interface NotificationResult {
  success: boolean;
  stubbed?: boolean;
  payload?: any;
  reason?: string;
}

@injectable()
export class NotificationService {
  private readonly frontendBaseUrl: string;
  private readonly whatsappConfigured: boolean;
  private readonly emailConfigured: boolean;
  private readonly whatsappProvider: string;
  private readonly whatsappAccountSid?: string;

  constructor() {
    this.frontendBaseUrl = config.frontendBaseUrl || 'http://localhost:7000';
    this.whatsappProvider = (config.whatsapp.provider || 'twilio').toLowerCase();
    this.whatsappAccountSid = config.whatsapp.accountSid;
    this.whatsappConfigured = Boolean(
      config.whatsapp.apiUrl && config.whatsapp.apiKey && config.whatsapp.senderPhone
    );
    this.emailConfigured = Boolean(
      config.email.apiUrl && config.email.apiKey && config.email.from
    );
  }

  private logStub(action: string, payload: any): Promise<NotificationResult> {
    console.log(`\n[NotificationService][STUB] ${action}`);
    console.log(JSON.stringify(payload, null, 2));
    return Promise.resolve({ success: true, stubbed: true, payload });
  }

  private isTwilioProvider(): boolean {
    return this.whatsappProvider === 'twilio';
  }

  private isMetaProvider(): boolean {
    return ['meta', 'whatsappcloudapi', 'whatsapp'].includes(this.whatsappProvider);
  }

  private async sendWhatsAppPayload(payload: any): Promise<NotificationResult> {
    if (!this.whatsappConfigured) {
      return this.logStub('sendWhatsAppPayload', payload);
    }

    try {
      if (this.isTwilioProvider()) {
        const body = new URLSearchParams(payload).toString();
        const auth = {
          username: this.whatsappAccountSid || '',
          password: config.whatsapp.apiKey!,
        };

        const response = await axios.post(config.whatsapp.apiUrl!, body, {
          auth,
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
        });
        console.log('[NotificationService] WhatsApp sent', {
          provider: this.whatsappProvider,
          to: payload.To,
          message: payload.Body,
        });
        return { success: true, payload: response.data };
      }

      const response = await axios.post(config.whatsapp.apiUrl!, payload, {
        headers: {
          Authorization: `Bearer ${config.whatsapp.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[NotificationService] WhatsApp sent', {
        provider: this.whatsappProvider,
        to: payload.to,
        message: payload.text?.body,
      });
      return { success: true, payload: response.data };
    } catch (error: any) {
      console.error('[NotificationService] WhatsApp send failed', error?.message || error);
      return { success: false, reason: error?.message || 'WhatsApp request failed' };
    }
  }

  private async sendEmailPayload(payload: any): Promise<NotificationResult> {
    if (!this.emailConfigured) {
      return this.logStub('sendEmailPayload', payload);
    }

    try {
      const response = await axios.post(config.email.apiUrl!, payload, {
        headers: {
          Authorization: `Bearer ${config.email.apiKey}`,
          'Content-Type': 'application/json',
        },
      });
      console.log('[NotificationService] Email sent', {
        to: payload.to,
        subject: payload.subject,
      });
      return { success: true, payload: response.data };
    } catch (error: any) {
      console.error('[NotificationService] Email send failed', error?.message || error);
      return { success: false, reason: error?.message || 'Email request failed' };
    }
  }

  private formatPhoneForWhatsApp(phone: string) {
    return phone.replace(/[^0-9+]/g, '');
  }

  buildQuizLink(code: string) {
    return `${this.frontendBaseUrl.replace(/\/$/, '')}/benfek/quiz?code=${encodeURIComponent(code)}`;
  }

  private buildWhatsAppAddress(phone: string) {
    const cleaned = this.formatPhoneForWhatsApp(phone);
    return `whatsapp:${cleaned}`;
  }

  private async sendWhatsAppAndEmail(options: {
    phone?: string;
    email?: string;
    subject: string;
    html: string;
    text: string;
    whatsappText: string;
    whatsappImageUrl?: string;
    whatsappCaption?: string;
  }): Promise<NotificationResult> {
    const results: any[] = [];
    let success = true;

    if (options.phone) {
      const whatsappResult = options.whatsappImageUrl
        ? await this.sendWhatsAppImage(options.phone, options.whatsappImageUrl, options.whatsappCaption || options.whatsappText)
        : await this.sendWhatsAppText(options.phone, options.whatsappText);

      results.push({ channel: 'whatsapp', ...whatsappResult });
      if (!whatsappResult.success) success = false;
    }

    if (options.email) {
      const emailResult = await this.sendEmail(options.email, options.subject, options.html, options.text);
      results.push({ channel: 'email', ...emailResult });
      if (!emailResult.success) success = false;
    }

    if (results.length === 0) {
      return this.logStub('sendWhatsAppAndEmail', options);
    }

    return { success, payload: results };
  }

  async sendWhatsAppText(to: string, message: string): Promise<NotificationResult> {
    if (this.isTwilioProvider()) {
      const payload = {
        From: this.buildWhatsAppAddress(config.whatsapp.senderPhone),
        To: this.buildWhatsAppAddress(to),
        Body: message,
      };
      return this.sendWhatsAppPayload(payload);
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneForWhatsApp(to),
      type: 'text',
      text: { body: message },
    };
    return this.sendWhatsAppPayload(payload);
  }

  async sendWhatsAppImage(to: string, imageUrl: string, caption: string): Promise<NotificationResult> {
    if (this.isTwilioProvider()) {
      const payload = {
        From: this.buildWhatsAppAddress(config.whatsapp.senderPhone),
        To: this.buildWhatsAppAddress(to),
        Body: caption,
        MediaUrl: imageUrl,
      };
      return this.sendWhatsAppPayload(payload);
    }

    const payload = {
      messaging_product: 'whatsapp',
      to: this.formatPhoneForWhatsApp(to),
      type: 'image',
      image: {
        link: imageUrl,
        caption,
      },
    };
    return this.sendWhatsAppPayload(payload);
  }

  async sendEmail(
    to: string,
    subject: string,
    html: string,
    text?: string
  ): Promise<NotificationResult> {
    const payload = {
      from: config.email.from,
      to,
      subject,
      html,
      text: text || html.replace(/<[^>]+>/g, ''),
      provider: config.email.provider,
    };
    return this.sendEmailPayload(payload);
  }

  async sendBenfekCodeMessage(options: {
    phone?: string;
    email?: string;
    code: string;
    benfekName?: string;
  }): Promise<NotificationResult> {
    const link = this.buildQuizLink(options.code);
    const text = `Hello ${options.benfekName ?? 'Benfek'}, your HLS benfek code is ${options.code}. Click here to take your quiz now: ${link}`;

    return this.sendWhatsAppAndEmail({
      phone: options.phone,
      email: options.email,
      subject: 'Your HLS Benfek Code',
      html: `<p>${text}</p>`,
      text,
      whatsappText: text,
    });
  }

  async sendPackAvailableMessage(options: {
    phone?: string;
    email?: string;
    packName: string;
    code: string;
  }): Promise<NotificationResult> {
    const link = this.buildQuizLink(options.code);
    const text = `Good news! Your nutrient pack "${options.packName}" is now available. View it here: ${link}`;

    return this.sendWhatsAppAndEmail({
      phone: options.phone,
      email: options.email,
      subject: 'Nutrient Pack Available',
      html: `<p>${text}</p>`,
      text,
      whatsappText: text,
    });
  }

  async notifyPreferredVendorAcceptance(user: any): Promise<NotificationResult> {
    if (!user || user.role !== 'benfek') {
      return { success: true, reason: 'Not a benfek user' };
    }

    if (!user.preferredVendorAccepted || !user.preferredVendorName) {
      return { success: true, reason: 'No preferred vendor acceptance data' };
    }

    if (user.preferredVendorNotifiedAt) {
      return { success: true, reason: 'Notifications already sent' };
    }

    const text = `Your favorite pharmacy ${user.preferredVendorName} has been accepted as your HLS preferred vendor. Visit your dashboard to continue.`;

    return this.sendWhatsAppAndEmail({
      phone: user.phone,
      email: user.email,
      subject: 'Preferred Pharmacy Accepted',
      html: `<p>${text}</p>`,
      text,
      whatsappText: text,
    });
  }

  async notifyPharmacyReferral(options: {
    pharmacyPhone?: string;
    pharmacyEmail?: string;
    benfekName: string;
    benfekPhone?: string;
    benfekEmail?: string;
  }): Promise<NotificationResult> {
    const text = `A benfek referral has been created for you. Benfek: ${options.benfekName}${options.benfekPhone ? `, Phone: ${options.benfekPhone}` : ''}${options.benfekEmail ? `, Email: ${options.benfekEmail}` : ''}. Please review the referral in your HLS dashboard.`;

    return this.sendWhatsAppAndEmail({
      phone: options.pharmacyPhone,
      email: options.pharmacyEmail,
      subject: 'New Benfek Referral',
      html: `<p>${text}</p>`,
      text,
      whatsappText: text,
    });
  }

  async sendInvoiceImage(options: {
    phone?: string;
    email?: string;
    imageUrl: string;
    caption: string;
  }): Promise<NotificationResult> {
    return this.sendWhatsAppAndEmail({
      phone: options.phone,
      email: options.email,
      subject: 'Your HLS Invoice',
      html: `<p>${options.caption}</p><img src="${options.imageUrl}" alt="Invoice" />`,
      text: options.caption,
      whatsappText: options.caption,
      whatsappImageUrl: options.imageUrl,
      whatsappCaption: options.caption,
    });
  }
}
