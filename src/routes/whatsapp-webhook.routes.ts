import { Router } from 'express';
import { Container } from 'inversify';
import { WhatsAppWebhookController } from '../controllers/whatsapp-webhook.controller';

export const createWhatsAppWebhookRoutes = (container: Container): Router => {
  const router = Router();
  const controller = container.get(WhatsAppWebhookController);

  router.get('/', controller.verify);
  router.post('/', controller.receive);

  return router;
};
