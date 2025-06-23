import { Request, Response } from 'express';
import { injectable } from 'inversify';
import { BaseController } from './base.controller';
import { Container } from 'inversify';

@injectable()
export class PingController extends BaseController {
  constructor(container: Container) {
    super(container);
  }

  /**
   * @swagger
   * /api/v2/ping:
   *   get:
   *     summary: Test if the server is running
   *     tags: [Health]
   *     responses:
   *       200:
   *         description: Server is running
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 message:
   *                   type: string
   *                   example: pong
   */
  async ping(req: Request, res: Response): Promise<void> {
    res.json({ message: 'pong' });
  }
}
