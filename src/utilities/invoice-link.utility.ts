import { createHmac, timingSafeEqual } from 'crypto';
import { config } from '../config/config';

type InvoiceLink = { id: string; userId: number; expiresAt: Date };

function signature(invoice: InvoiceLink) {
  if (!config.jwtSecret || config.jwtSecret === 'your-secret-key') throw new Error('JWT_SECRET must be configured for invoice links');
  return createHmac('sha256', config.jwtSecret)
    .update(`hls-invoice:${invoice.id}:${invoice.userId}:${invoice.expiresAt.toISOString()}`).digest('hex');
}

export function invoiceLink(invoice: InvoiceLink) {
  return `${config.frontendBaseUrl.replace(/\/$/, '')}/invoices/${invoice.id}?token=${signature(invoice)}`;
}

export function validInvoiceToken(invoice: InvoiceLink, token: unknown, now = new Date()) {
  if (invoice.expiresAt <= now || typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return false;
  return timingSafeEqual(Buffer.from(token, 'hex'), Buffer.from(signature(invoice), 'hex'));
}
