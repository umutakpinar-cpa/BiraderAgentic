import { FoundProduct } from "../services/lens.service";

/**
 * Bulunan ürünlerden kullanıcıya gönderilecek DM metnini üretir.
 *
 * Şablon:
 *   [Ürün Başlığı] 🎀☕
 *   Bulduğumuz alternatif satıcılar ve fiyatlar:
 *   • Satıcı A: 120 TL (Link)
 *   • Satıcı B: 135 TL (Link)
 *   ...sabit bilgilendirme metni...
 */
export function buildProductMessage(products: FoundProduct[]): string {
  const title = products[0]?.title ?? "Ürün";

  const sellerLines = products
    .map((product) => {
      const price = product.price ? `: ${product.price}` : "";
      return `• ${product.source}${price} (${product.link})`;
    })
    .join("\n");

  return [
    `${title} 🎀☕ `,
    "Bulduğumuz alternatif satıcılar ve fiyatlar:",
    sellerLines,
    "Gün içinde gelen tüm talepleri havuzumuzda topluyoruz. İstekleriniz sıraya alınmıştır; akşam saatlerinde siparişlerin genel toparlanması, detaylar ve kesin kayıt için ekibimiz sizinle doğrudan buradan iletişime geçecektir.",
    "Çanta Kombinleri İçin: @cantapinka ",
    "Sipariş ve Detay için DM💌",
  ].join("\n");
}

/** Filtre sonrası hiç sonuç bulunamadığında gönderilecek metin. */
export function buildNoResultMessage(): string {
  return [
    "Görseliniz için şu an anlaşmalı satıcılarımızda eşleşme bulamadık. 🎀☕ ",
    "Gün içinde gelen tüm talepleri havuzumuzda topluyoruz. İstekleriniz sıraya alınmıştır; akşam saatlerinde ekibimiz sizinle doğrudan buradan iletişime geçecektir.",
    "Çanta Kombinleri İçin: @cantapinka ",
    "Sipariş ve Detay için DM💌",
  ].join("\n");
}
