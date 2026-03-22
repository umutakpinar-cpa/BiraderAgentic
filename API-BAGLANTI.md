# API bağlantı bilgileri (referans)

**Repo adı:** `umutakpinar-cpa/BiraderAgentic` (Worker: `biraderagentic`).  
**`BASE_API_*` değişken adları:** Vergi Merkezi **BASE** ön muhasebe **portal API** bağlantısı içindir; repo / proje adı **BiraderAgentic**’tir — birbirinin yerine kullanılmaz.

Bu dosya projede kullanılan **adresleri ve değişken adlarını** sabitler.  
**Gizli anahtarları (token) buraya yazmayın** — `BASE_API_KEY`, `MCP_SECRET` yalnızca Cloudflare Secrets veya yerelde `.dev.vars` içinde tutulur (`.dev.vars` git’e eklenmez).

## Cloudflare Worker (MCP sunucusu)

| Alan | Değer |
|------|--------|
| Worker adı | `biraderagentic` |
| Genel URL | `https://biraderagentic.umutakpinar.workers.dev` |
| Health | `GET /health` |
| Bağlantı testi | `GET /health?probe=1` |
| MCP (JSON-RPC) | `POST /mcp` |

Örnek:

- `https://biraderagentic.umutakpinar.workers.dev/health`
- `https://biraderagentic.umutakpinar.workers.dev/mcp`

## Vergi Merkezi portal API (Laravel)

| Alan | Değer |
|------|--------|
| API kökü (`BASE_API_URL`) | `https://portal.vergimerkezi.com.tr/api/v1` |

Sonunda **`/` olmamalı** (Worker kodu normalize eder).

### Agent rotaları (`API_STYLE=agent`, varsayılan)

Önekler (tam yol: `BASE_API_URL` + aşağıdaki path):

- `GET /agent/lookup/caris` — cari arama / liste
- `GET /agent/lookup/caris/:id` — cari detay
- `POST /agent/lookup/caris` — yeni cari
- `POST /agent/accounting/record-invoice-draft` — fatura taslağı
- `GET /agent/reports/vat` — KDV özeti
- `GET /agent/reports/income-statement` — gelir tablosu
- `GET /agent/reports/trial-balance` — mizan
- `POST /agent/accounting/record-collection` — tahsilat
- `POST /agent/accounting/record-payment` — ödeme

Takvim / beyanname / görev için legacy önek: `/mcp/...` (`API_LEGACY_PREFIX`, varsayılan `/mcp`).

## Ortam değişkenleri (Worker / local)

| Değişken | Zorunlu | Açıklama |
|----------|---------|----------|
| `BASE_API_URL` | Evet | Portal API kökü (yukarıdaki) |
| `BASE_API_KEY` | Evet | Portal Sanctum API token |
| `MCP_SECRET` | Önerilir | MCP isteğinde `x-mcp-secret` |
| `API_STYLE` | Hayır | `agent` veya `mcp` |
| `API_LEGACY_PREFIX` | Hayır | Varsayılan `/mcp` |

OpenAI kullanan **ayrı** bir Worker varsa orada `OPENAI_API_KEY` kullanılır; bu MCP Worker kodunda OpenAI çağrısı yoktur.

## Yerel geliştirme

`.dev.vars.example` dosyasını `.dev.vars` olarak kopyalayın, token’ı doldurun:

```bash
cp .dev.vars.example .dev.vars
npm run dev
```

Varsayılan Wrangler adresi: `http://localhost:8787`

## Git

Uzak repo adresi ve push için: [GIT-REMOTE-KURULUM.md](./GIT-REMOTE-KURULUM.md)

---

*Son güncelleme: bu repodaki `src/index.js` ve `wrangler.toml` ile uyumludur.*
