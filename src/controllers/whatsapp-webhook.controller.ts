import { Request, RequestHandler, Response } from 'express';
import { inject, injectable } from 'inversify';
import { WhatsAppWebhookService } from '../services/whatsapp-webhook.service';

@injectable()
export class WhatsAppWebhookController {
  constructor(
    @inject(WhatsAppWebhookService) private webhookService: WhatsAppWebhookService
  ) {}

  verify: RequestHandler = (req: Request, res: Response) => {
    const mode = req.query['hub.mode'];
    const token = req.query['hub.verify_token'];
    const challenge = req.query['hub.challenge'];

    if (!this.webhookService.verifySubscription(mode, token) || typeof challenge !== 'string') {
      res.sendStatus(403);
      return;
    }

    res.status(200).type('text/plain').send(challenge);
  };

  receive: RequestHandler = async (req: Request, res: Response) => {
    const signature = req.headers['x-hub-signature-256'];
    const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

    if (!this.webhookService.verifySignature(rawBody, signature)) {
      res.sendStatus(401);
      return;
    }

    try {
      await this.webhookService.process(req.body);
      res.sendStatus(200);
    } catch (error) {
      console.error('[WhatsAppWebhook] Failed to process event', error);
      res.sendStatus(500);
    }
  };
}
