# BASE MCP Server

Vergi Merkezi BASE Ön Muhasebe portalı için Claude MCP (Model Context Protocol) sunucusu.

## Özellikler

- 🔍 Müşteri arama ve detay
- 📅 Vergi takvimi
- 📋 Beyanname listesi
- ✅ Görev oluşturma
- 🧾 AI destekli fatura kaydı

## Kurulum

### 1. Repoyu Klonla
```bash
git clone https://github.com/vergimerkezi/base-mcp-server.git
cd base-mcp-server
npm install
```

### 2. .env Dosyasını Oluştur
```bash
cp .env.example .env
# .env dosyasını düzenle
```

### 3. Çalıştır
```bash
npm start
# veya geliştirme için:
npm run dev
```

## Railway Deploy

1. [railway.app](https://railway.app) → New Project → Deploy from GitHub
2. Repoyu seç
3. Environment Variables ekle:
   - `BASE_API_URL`
   - `BASE_API_KEY`
   - `MCP_SECRET`

## Claude Desktop Bağlantısı

`claude_desktop_config.json` dosyasına ekle:

```json
{
  "mcpServers": {
    "base": {
      "type": "http",
      "url": "https://RAILWAY_URL/mcp",
      "headers": {
        "x-mcp-secret": "MCP_SECRET_DEGERI"
      }
    }
  }
}
```

## Endpoints

| Method | Path | Açıklama |
|--------|------|----------|
| GET | `/health` | Sağlık kontrolü |
| POST | `/mcp` | MCP protokol endpoint |

## BASE Laravel API

Bu sunucu `portal.vergimerkezi.com.tr/api/v1/mcp/*` endpoint'lerini kullanır.
Laravel tarafında `routes/mcp.php` ve `McpController` gereklidir.
