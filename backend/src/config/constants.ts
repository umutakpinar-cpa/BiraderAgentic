import path from "path";

// Görsellerin indirileceği dizin
export const IMAGE_STORAGE_DIR = path.resolve(__dirname, "../../storage/images");

// Görsel indirme güvenlik limitleri
export const MAX_IMAGE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB
export const IMAGE_DOWNLOAD_TIMEOUT_MS = 15_000;

// İzin verilen görsel content-type -> dosya uzantısı eşlemesi
export const ALLOWED_IMAGE_CONTENT_TYPES: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

// Filtre sonrası kullanıcıya gönderilecek maksimum sonuç sayısı
export const MAX_SEARCH_RESULTS = 6;

// Meta Graph API
export const GRAPH_API_BASE_URL = "https://graph.facebook.com/v21.0";

// SerpApi
export const SERPAPI_BASE_URL = "https://serpapi.com/search.json";
