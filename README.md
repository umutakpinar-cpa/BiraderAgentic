# BiraderAgentic (MCP Worker)

> **İsimlendirme**
> - **GitHub / bu repo:** `umutakpinar-cpa/BiraderAgentic` — Worker adı: **`biraderagentic`**.
> - **“BASE”:** Vergi Merkezi **ön muhasebe ürünü / portal** için kullanılan ticari ad. **Repo adı değildir.**
> - Ortam değişkenleri **`BASE_API_URL`** / **`BASE_API_KEY`** portal API kökünü ve token’ı ifade eder (“BASE ürününe bağlan” anlamında); **BiraderAgentic repo adı ile karıştırılmaz.**

Vergi Merkezi portal API’sine bağlanan **MCP (Model Context Protocol)** sunucusu.  
**Cloudflare Workers** üzerinde çalışır — Node.js sunucu gerektirmez.

## Araçlar (13 Adet)

| Araç | Açıklama |
|---|---|
| `musteri_ara` | İsim veya VKN/TCKN ile müşteri/tedarikçi ara |
| `musteri_detay` | Müşteri detayı, son faturalar ve görevler |
| `cari_listesi` | Tüm cari hesapları listele (müşteri / tedarikçi) |
| `cari_olustur` | Yeni cari hesap oluştur |
| `takvim_getir` | Yaklaşan vergi ve beyanname tarihleri |
| `beyanname_listesi` | Beyannameleri listele ve filtrele |
| `gorev_olustur` | Müşteri için görev/hatırlatıcı oluştur |
| `fatura_kaydet` | Fatura kaydı (AI güven skoru < 0.85 → taslak) |
| `kdv_raporu` | KDV hesaplanan/indirilecek özeti |
| `gelir_tablosu` | Dönemsel gelir-gider tablosu |
| `mizan` | Mizan raporu |
| `tahsilat_kaydet` | Müşteriden tahsilat kaydı |
| `odeme_kaydet` | Tedarikçiye ödeme kaydı |

## Kurulum

### 1. Repoyu al

```bash
git clone https://github.com/umutakpinar-cpa/BiraderAgentic.git
cd BiraderAgentic
npm install
```

Repo henüz yoksa GitHub’da oluştur; `git push` sorununda [GIT-REMOTE-KURULUM.md](./GIT-REMOTE-KURULUM.md) dosyasına bak.

### 2. Local Geliştirme

```bash
cp .dev.vars.example .dev.vars
# .dev.vars dosyasını düzenle (API token vb.)
npm run dev
# → http://localhost:8787
```

### 3. Cloudflare Deploy

```bash
# Gizli değişkenleri Cloudflare'e yükle
wrangler secret put BASE_API_URL
wrangler secret put BASE_API_KEY
wrangler secret put MCP_SECRET

# Deploy et
npm run deploy
```

Ya da Cloudflare Dashboard → Workers & Pages → **biraderagentic** → Settings → Variables bölümünden manuel ekleyebilirsin.

## Endpoints

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/health` | Sağlık kontrolü (yapılandırma özeti) |
| GET | `/health?probe=1` | Portal API’ye gerçek istek atarak bağlantı testi |
| POST | `/mcp` | MCP protokol endpoint |

### API bağlantısı (yenileme)

- **`BASE_API_URL`**: `https://portal.vergimerkezi.com.tr/api/v1` (sonunda `/` yok).
- **`API_STYLE`** (Worker env):
  - **`agent`** (varsayılan): [PROJE.md](./PROJE.md) ile uyumlu `/agent/lookup/caris`, `/agent/reports/vat`, `/agent/accounting/record-invoice-draft` vb.
  - **`mcp`**: Tüm araçlar `/mcp/*` altında (eski Laravel `McpController` rotaları).
- **Takvim / beyanname / görev** (`agent` modunda): `/mcp/takvim`, `/mcp/beyannameler`, `/mcp/gorevler` — önek `API_LEGACY_PREFIX` ile değiştirilebilir (varsayılan `/mcp`).
- **Token**: `BASE_API_KEY` veya MCP isteğinde `Authorization: Bearer <portal_token>` (Worker’da anahtar yoksa).
- **Kontrol**: `GET /health?probe=1` — `api.probe` alanında HTTP durumu ve ipucu döner.

## Claude Desktop Bağlantısı

`claude_desktop_config.json` dosyasına ekle:

```json
{
  "mcpServers": {
    "base": {
      "type": "http",
      "url": "https://biraderagentic.umutakpinar.workers.dev/mcp",
      "headers": {
        "x-mcp-secret": "MCP_SECRET_DEGERI"
      }
    }
  }
}
```

## BASE Laravel API

- **`API_STYLE=agent`**: `portal.vergimerkezi.com.tr/api/v1/agent/*` (önerilen — PROJE.md).
- **`API_STYLE=mcp`**: `.../api/v1/mcp/*` (Laravel `routes/mcp.php` / `McpController`).

Tahsilat/ödeme için `agent` modunda sırasıyla `POST /agent/accounting/record-collection` ve `POST /agent/accounting/record-payment` kullanılır; portalda farklıysa Laravel rotalarını buna göre güncelleyin.
