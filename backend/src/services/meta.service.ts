import axios from "axios";
import { GRAPH_API_BASE_URL } from "../config/constants";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface InstagramProfile {
  name: string | null;
  username: string | null;
}

/**
 * Instagram kullanıcısının profil bilgilerini (isim, kullanıcı adı) çeker.
 * Profil çekilemezse akışı bozmamak için null alanlarla döner.
 */
export async function fetchUserProfile(instagramId: string): Promise<InstagramProfile> {
  try {
    const response = await axios.get(`${GRAPH_API_BASE_URL}/${instagramId}`, {
      params: {
        fields: "name,username",
        access_token: env.META_ACCESS_TOKEN,
      },
      timeout: 10_000,
    });
    return {
      name: response.data?.name ?? null,
      username: response.data?.username ?? null,
    };
  } catch (error) {
    logger.warn(`Kullanıcı profili alınamadı (${instagramId})`, axiosErrorSummary(error));
    return { name: null, username: null };
  }
}

/** Meta Graph API üzerinden kullanıcıya DM metni gönderir. */
export async function sendTextMessage(recipientId: string, text: string): Promise<void> {
  await axios.post(
    `${GRAPH_API_BASE_URL}/me/messages`,
    {
      recipient: { id: recipientId },
      message: { text },
    },
    {
      params: { access_token: env.META_ACCESS_TOKEN },
      timeout: 15_000,
    }
  );
  logger.info(`Mesaj gönderildi → ${recipientId}`);
}

export function axiosErrorSummary(error: unknown): string {
  if (axios.isAxiosError(error)) {
    return `${error.response?.status ?? "?"} ${JSON.stringify(error.response?.data ?? error.message)}`;
  }
  return error instanceof Error ? error.message : String(error);
}
