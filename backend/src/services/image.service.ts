import axios from "axios";
import fs from "fs";
import path from "path";
import { pipeline } from "stream/promises";
import { Transform, TransformCallback } from "stream";
import { v4 as uuidv4 } from "uuid";
import {
  ALLOWED_IMAGE_CONTENT_TYPES,
  IMAGE_DOWNLOAD_TIMEOUT_MS,
  IMAGE_STORAGE_DIR,
  MAX_IMAGE_SIZE_BYTES,
} from "../config/constants";
import { logger } from "../utils/logger";

/** İndirme sırasında boyut limitini aşan akışları keser. */
class SizeLimitStream extends Transform {
  private total = 0;

  constructor(private readonly limit: number) {
    super();
  }

  _transform(chunk: Buffer, _encoding: BufferEncoding, callback: TransformCallback): void {
    this.total += chunk.length;
    if (this.total > this.limit) {
      callback(new Error(`Görsel boyut limiti aşıldı (${this.limit} bayt)`));
      return;
    }
    callback(null, chunk);
  }
}

/**
 * Meta CDN üzerindeki görseli güvenli şekilde indirir:
 * - Sadece HTTPS URL kabul eder
 * - Content-Type'ın gerçekten bir görsel olduğunu doğrular
 * - Boyut limitini hem Content-Length başlığında hem de akış sırasında uygular
 * - UUID tabanlı dosya adıyla storage/images altına kaydeder
 *
 * @returns Kaydedilen dosyanın storage köküne göre yolu (örn. "storage/images/<uuid>.jpg")
 */
export async function downloadImage(imageUrl: string): Promise<string> {
  const parsedUrl = new URL(imageUrl);
  if (parsedUrl.protocol !== "https:") {
    throw new Error(`Görsel URL'i HTTPS değil: ${parsedUrl.protocol}`);
  }

  const response = await axios.get(imageUrl, {
    responseType: "stream",
    timeout: IMAGE_DOWNLOAD_TIMEOUT_MS,
    maxRedirects: 3,
  });

  const contentType = String(response.headers["content-type"] ?? "")
    .split(";")[0]
    .trim()
    .toLowerCase();
  const extension = ALLOWED_IMAGE_CONTENT_TYPES[contentType];
  if (!extension) {
    response.data.destroy();
    throw new Error(`İzin verilmeyen content-type: ${contentType || "(boş)"}`);
  }

  const contentLength = Number(response.headers["content-length"] ?? 0);
  if (contentLength > MAX_IMAGE_SIZE_BYTES) {
    response.data.destroy();
    throw new Error(`Görsel çok büyük: ${contentLength} bayt`);
  }

  await fs.promises.mkdir(IMAGE_STORAGE_DIR, { recursive: true });

  const fileName = `${uuidv4()}${extension}`;
  const filePath = path.join(IMAGE_STORAGE_DIR, fileName);

  try {
    await pipeline(
      response.data,
      new SizeLimitStream(MAX_IMAGE_SIZE_BYTES),
      fs.createWriteStream(filePath)
    );
  } catch (error) {
    await fs.promises.unlink(filePath).catch(() => undefined);
    throw error;
  }

  const localImageUrl = path.posix.join("storage", "images", fileName);
  logger.info(`Görsel indirildi: ${localImageUrl}`);
  return localImageUrl;
}
