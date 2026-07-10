import { MessageType, Prisma } from "@prisma/client";
import { downloadImage } from "./image.service";
import { FoundProduct, searchProductByImage } from "./lens.service";
import { axiosErrorSummary, fetchUserProfile, sendTextMessage } from "./meta.service";
import { prisma } from "./prisma.service";
import { logger } from "../utils/logger";
import { buildNoResultMessage, buildProductMessage } from "../utils/messageTemplate";

interface IncomingImageMessage {
  senderId: string;
  messageId: string;
  text: string | null;
  imageUrl: string | null;
}

/**
 * Meta webhook payload'ından işlenecek mesajları çıkarır.
 * Instagram Messaging formatı: entry[].messaging[] (echo'lar atlanır).
 */
function extractMessages(body: unknown): IncomingImageMessage[] {
  const messages: IncomingImageMessage[] = [];
  const entries = (body as { entry?: unknown[] })?.entry ?? [];

  for (const entry of entries as Array<{ messaging?: unknown[] }>) {
    for (const event of (entry.messaging ?? []) as Array<{
      sender?: { id?: string };
      message?: {
        mid?: string;
        text?: string;
        is_echo?: boolean;
        attachments?: Array<{ type?: string; payload?: { url?: string } }>;
      };
    }>) {
      if (!event.sender?.id || !event.message?.mid || event.message.is_echo) continue;

      const imageAttachment = event.message.attachments?.find(
        (attachment) => attachment.type === "image" && attachment.payload?.url
      );

      messages.push({
        senderId: event.sender.id,
        messageId: event.message.mid,
        text: event.message.text ?? null,
        imageUrl: imageAttachment?.payload?.url ?? null,
      });
    }
  }

  return messages;
}

/** Webhook gövdesini arkaplanda işler; hatalar loglanır, asla fırlatılmaz. */
export async function processWebhookEvent(body: unknown): Promise<void> {
  for (const message of extractMessages(body)) {
    try {
      await processSingleMessage(message);
    } catch (error) {
      logger.error(
        `Mesaj işlenirken hata (${message.messageId})`,
        axiosErrorSummary(error)
      );
    }
  }
}

async function processSingleMessage(incoming: IncomingImageMessage): Promise<void> {
  // 1) Idempotency: bu messageId daha önce işlendiyse çık
  const existing = await prisma.message.findUnique({
    where: { messageId: incoming.messageId },
  });
  if (existing) {
    logger.info(`Mesaj zaten işlenmiş, atlanıyor: ${incoming.messageId}`);
    return;
  }

  // 2) Kullanıcıyı oluştur/güncelle
  const profile = await fetchUserProfile(incoming.senderId);
  const user = await prisma.user.upsert({
    where: { instagramId: incoming.senderId },
    create: {
      instagramId: incoming.senderId,
      name: profile.name,
      username: profile.username,
    },
    update: {
      name: profile.name ?? undefined,
      username: profile.username ?? undefined,
    },
  });

  // Görselsiz mesajlar sadece kayıt altına alınır
  if (!incoming.imageUrl) {
    await prisma.message.create({
      data: {
        messageId: incoming.messageId,
        userId: user.id,
        text: incoming.text,
        type: MessageType.INCOMING,
      },
    });
    logger.info(`Görselsiz mesaj kaydedildi: ${incoming.messageId}`);
    return;
  }

  // 3) Görseli güvenli şekilde indir
  let localImageUrl: string | null = null;
  try {
    localImageUrl = await downloadImage(incoming.imageUrl);
  } catch (error) {
    logger.error(`Görsel indirilemedi (${incoming.messageId})`, axiosErrorSummary(error));
  }

  const message = await prisma.message.create({
    data: {
      messageId: incoming.messageId,
      userId: user.id,
      text: incoming.text,
      localImageUrl,
      type: MessageType.INCOMING,
    },
  });

  // 4) SerpApi Google Lens araması (Lens'e erişilebilir olması için orijinal CDN URL'i kullanılır)
  let products: FoundProduct[] = [];
  try {
    products = await searchProductByImage(incoming.imageUrl);
  } catch (error) {
    logger.error(`Görsel araması başarısız (${incoming.messageId})`, axiosErrorSummary(error));
    return;
  }

  // 5-6) Filtrelenmiş sonuçları kaydet
  await prisma.searchResult.create({
    data: {
      messageId: message.messageId,
      queryUrl: incoming.imageUrl,
      foundProducts: products as unknown as Prisma.InputJsonValue,
    },
  });

  // 7) Şablon mesajı oluştur ve gönder
  const replyText =
    products.length > 0 ? buildProductMessage(products) : buildNoResultMessage();

  await sendTextMessage(incoming.senderId, replyText);

  await prisma.message.create({
    data: {
      messageId: `out-${incoming.messageId}`,
      userId: user.id,
      text: replyText,
      type: MessageType.OUTGOING,
    },
  });

  logger.info(`Akış tamamlandı: ${incoming.messageId} (${products.length} ürün)`);
}
