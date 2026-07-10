import crypto from "crypto";
import { NextFunction, Request, Response } from "express";
import { env } from "../config/env";
import { logger } from "../utils/logger";

/**
 * Meta, POST /webhook isteklerini X-Hub-Signature-256 başlığı ile imzalar.
 * İmza, isteğin HAM gövdesi üzerinden App Secret ile hesaplanan HMAC-SHA256'dır.
 * Ham gövde, app.ts içindeki express.json({ verify }) kancasıyla req.rawBody'ye yazılır.
 */
export function verifySignature(req: Request, res: Response, next: NextFunction): void {
  const signatureHeader = req.header("X-Hub-Signature-256");
  const rawBody = (req as Request & { rawBody?: Buffer }).rawBody;

  if (!signatureHeader || !signatureHeader.startsWith("sha256=")) {
    logger.warn("Webhook isteği imzasız geldi, reddedildi.");
    res.sendStatus(401);
    return;
  }

  if (!rawBody) {
    logger.error("Ham gövde bulunamadı; express.json verify kancası eksik olabilir.");
    res.sendStatus(500);
    return;
  }

  const expectedSignature =
    "sha256=" + crypto.createHmac("sha256", env.META_APP_SECRET).update(rawBody).digest("hex");

  const received = Buffer.from(signatureHeader);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !crypto.timingSafeEqual(received, expected)) {
    logger.warn("Webhook imzası doğrulanamadı, istek reddedildi.");
    res.sendStatus(401);
    return;
  }

  next();
}
