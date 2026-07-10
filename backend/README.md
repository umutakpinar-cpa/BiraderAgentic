# BiraderAgentic Backend

Instagram DM'lerine gelen ürün görsellerini Google Lens (SerpApi) ile arayıp, anlaşmalı e-ticaret sitelerindeki alternatif satıcıları kullanıcıya otomatik DM olarak dönen Node.js/TypeScript/Express backend'i.

## Mimari

- **Express** — HTTP sunucusu (webhook endpointleri)
- **Prisma + PostgreSQL** — `User`, `Message`, `SearchResult` modelleri
- **Axios** — Meta Graph API, Meta CDN ve SerpApi istekleri
- **zod** — ortam değişkeni validasyonu (`src/config/env.ts`)

```
backend/
├── prisma/schema.prisma
├── storage/images/          # indirilen görseller (git'e girmez)
└── src/
    ├── config/              # env (zod) + sabitler
    ├── controllers/         # webhook controller
    ├── middlewares/         # X-Hub-Signature-256 doğrulaması
    ├── routes/              # /webhook rotaları
    ├── services/            # prisma, görsel indirme, lens, meta, arkaplan akışı
    └── utils/               # logger, mesaj şablonu
```

## Endpointler

| Metot | Yol        | Açıklama |
|-------|------------|----------|
| GET   | `/webhook` | Meta doğrulaması: `hub.mode`, `hub.verify_token`, `hub.challenge` |
| POST  | `/webhook` | Ham gövde üzerinden HMAC-SHA256 (`X-Hub-Signature-256`) doğrulanır; hemen 200 dönülür, iş arkaplanda yürür |
| GET   | `/health`  | Sağlık kontrolü |

## Akış (arkaplan işi)

1. `messageId` idempotency kontrolü (daha önce işlendiyse atlanır)
2. `User` upsert + `Message` kaydı
3. Meta CDN görseli güvenli indirme: HTTPS zorunlu, content-type kontrolü, 10 MB akış limiti, UUID dosya adı → `storage/images`
4. SerpApi Google Lens araması (`gl=tr&hl=tr`)
5. Sonuçlar `ALLOWED_MARKETPLACE_DOMAINS` listesine göre filtrelenir, ilk 6 sonuç alınır
6. `SearchResult` kaydı
7. Şablon mesaj oluşturulup Meta Graph API ile kullanıcıya gönderilir

## Kurulum

```bash
cd backend
cp .env.example .env   # değerleri doldur
npm install
npm run prisma:generate
npm run prisma:migrate  # PostgreSQL çalışıyor olmalı
npm run dev             # geliştirme (tsx watch)
```

Prod:

```bash
npm run build && npm start
```
