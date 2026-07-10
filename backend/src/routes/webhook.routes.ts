import { Router } from "express";
import { receiveWebhook, verifyWebhook } from "../controllers/webhook.controller";
import { verifySignature } from "../middlewares/verifySignature";

const router = Router();

router.get("/webhook", verifyWebhook);
router.post("/webhook", verifySignature, receiveWebhook);

export default router;
