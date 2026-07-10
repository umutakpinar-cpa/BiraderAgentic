import axios from "axios";
import { MAX_SEARCH_RESULTS, SERPAPI_BASE_URL } from "../config/constants";
import { env } from "../config/env";
import { logger } from "../utils/logger";

export interface FoundProduct {
  title: string;
  link: string;
  source: string;
  price: string | null;
  thumbnail: string | null;
}

interface SerpApiVisualMatch {
  title?: string;
  link?: string;
  source?: string;
  thumbnail?: string;
  price?: {
    value?: string;
    extracted_value?: number;
    currency?: string;
  };
}

function extractHostname(link: string): string | null {
  try {
    return new URL(link).hostname.toLowerCase();
  } catch {
    return null;
  }
}

function isAllowedDomain(hostname: string): boolean {
  return env.ALLOWED_MARKETPLACE_DOMAINS.some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  );
}

/**
 * Görseli SerpApi Google Lens ile arar (gl=tr & hl=tr) ve sonuçları
 * config'deki e-ticaret domain listesine göre filtreleyip ilk 5-6 taneyi döner.
 */
export async function searchProductByImage(imageUrl: string): Promise<FoundProduct[]> {
  const response = await axios.get(SERPAPI_BASE_URL, {
    params: {
      engine: "google_lens",
      url: imageUrl,
      gl: "tr",
      hl: "tr",
      api_key: env.SERPAPI_KEY,
    },
    timeout: 30_000,
  });

  const visualMatches: SerpApiVisualMatch[] = response.data?.visual_matches ?? [];
  logger.info(`SerpApi ${visualMatches.length} görsel eşleşme döndürdü.`);

  const filtered: FoundProduct[] = [];
  for (const match of visualMatches) {
    if (filtered.length >= MAX_SEARCH_RESULTS) break;
    if (!match.link || !match.title) continue;

    const hostname = extractHostname(match.link);
    if (!hostname || !isAllowedDomain(hostname)) continue;

    filtered.push({
      title: match.title,
      link: match.link,
      source: match.source ?? hostname,
      price: match.price?.value ?? null,
      thumbnail: match.thumbnail ?? null,
    });
  }

  logger.info(`Domain filtresi sonrası ${filtered.length} sonuç kaldı.`);
  return filtered;
}
