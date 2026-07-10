import { Request, Response } from "express";
import { env } from "../config/env";
import { processWebhookEvent } from "../services/webhookProcessor.service";
import { logger } from "../utils/logger";

/**
 * GET /webhook — Meta webhook doğrulaması.
 * hub.mode=subscribe ve hub.verify_token eşleşirse hub.challenge aynen dönülür.
 */
export function verifyWebhook(req: Request, res: Response): void {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === env.META_VERIFY_TOKEN && typeof challenge === "string") {
    logger.info("Webhook doğrulaması başarılı.");
    res.status(200).send(challenge);
    return;
  }

  logger.warn("Webhook doğrulaması başarısız.");
  res.sendStatus(403);
}

/**
 * POST /webhook — İmza doğrulaması middleware'de yapıldı.
 * Meta'nın timeout/retry mekanizmasını tetiklememek için hemen 200 dönülür,
 * asıl iş arkaplanda yürütülür.
 */
export function receiveWebhook(req: Request, res: Response): void {
  res.sendStatus(200);

  const body = req.body;
  setImmediate(() => {
    processWebhookEvent(body).catch((error) => {
      logger.error("Arkaplan webhook işleme hatası", error);
    });
  });
}
