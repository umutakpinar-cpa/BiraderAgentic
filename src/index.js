import 'dotenv/config';
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StreamableHTTPServerTransport } from "@modelcontextprotocol/sdk/server/streamableHttp.js";
import { CallToolRequestSchema, ListToolsRequestSchema } from "@modelcontextprotocol/sdk/types.js";
import axios from "axios";
import http from "http";

// ── API İSTEMCİSİ ─────────────────────────────────────────
const createApiClient = (token) => axios.create({
  baseURL: process.env.BASE_API_URL,
  headers: {
    Authorization: `Bearer ${token || process.env.BASE_API_KEY}`,
    Accept: 'application/json',
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// ── ARAÇ TANIMLARI ────────────────────────────────────────
const TOOLS = [
  {
    name: "musteri_ara",
    description: "İsim veya VKN/TCKN ile müşteri ara",
    inputSchema: {
      type: "object",
      properties: {
        q: { type: "string", description: "Müşteri adı veya vergi numarası" }
      },
      required: ["q"]
    }
  },
  {
    name: "musteri_detay",
    description: "Müşteri detayını, son faturalarını ve açık görevlerini getir",
    inputSchema: {
      type: "object",
      properties: {
        id: { type: "number", description: "Müşteri ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "takvim_getir",
    description: "Yaklaşan vergi ve beyanname tarihlerini getir",
    inputSchema: {
      type: "object",
      properties: {
        gun: { type: "number", description: "Kaç günlük takvim (varsayılan: 30, max: 90)" }
      }
    }
  },
  {
    name: "beyanname_listesi",
    description: "Beyannameleri listele, filtrele",
    inputSchema: {
      type: "object",
      properties: {
        durum: {
          type: "string",
          enum: ["bekliyor", "tamamlandi", "hepsi"],
          description: "Beyanname durumu filtresi"
        },
        musteri_id: { type: "number", description: "Belirli bir müşteri için filtrele" }
      }
    }
  },
  {
    name: "gorev_olustur",
    description: "Müşteri için yeni görev/hatırlatıcı oluştur",
    inputSchema: {
      type: "object",
      properties: {
        musteri_id: { type: "number" },
        baslik: { type: "string" },
        aciklama: { type: "string" },
        son_tarih: { type: "string", description: "YYYY-MM-DD formatında" },
        oncelik: { type: "string", enum: ["dusuk", "orta", "yuksek"] }
      },
      required: ["musteri_id", "baslik", "son_tarih"]
    }
  },
  {
    name: "fatura_kaydet",
    description: "Fatura bilgilerini BASE ön muhasebeye kaydet. Güven skoru 0.85 altındaysa taslak olarak kaydedilir.",
    inputSchema: {
      type: "object",
      properties: {
        musteri_id: { type: "number" },
        fatura_no: { type: "string" },
        fatura_tarihi: { type: "string", description: "YYYY-MM-DD" },
        vade_tarihi: { type: "string", description: "YYYY-MM-DD (opsiyonel)" },
        kdv_haric_tutar: { type: "number" },
        kdv_tutari: { type: "number" },
        kdv_orani: { type: "number", enum: [0, 1, 10, 20] },
        kdv_dahil_toplam: { type: "number" },
        fatura_turu: { type: "string", enum: ["satis", "alis", "gider"] },
        aciklama: { type: "string" },
        belge_url: { type: "string", description: "Fatura PDF linki (varsa)" },
        ai_guven_skoru: {
          type: "number",
          description: "0-1 arası. 0.85 altı ise taslak kaydedilir, danışman onayı istenir."
        },
        ai_notlar: { type: "string", description: "Belirsiz veya eksik alanlar hakkında notlar" }
      },
      required: ["musteri_id", "fatura_no", "fatura_tarihi", "kdv_dahil_toplam", "fatura_turu"]
    }
  }
];

// ── ARAÇ İŞLEYİCİ ────────────────────────────────────────
async function callTool(name, args, apiToken) {
  const api = createApiClient(apiToken);

  switch (name) {
    case "musteri_ara": {
      const res = await api.get('/mcp/musteriler', { params: { q: args.q } });
      return res.data;
    }
    case "musteri_detay": {
      const res = await api.get(`/mcp/musteriler/${args.id}`);
      return res.data;
    }
    case "takvim_getir": {
      const res = await api.get('/mcp/takvim', { params: { gun: Math.min(args.gun ?? 30, 90) } });
      return res.data;
    }
    case "beyanname_listesi": {
      const res = await api.get('/mcp/beyannameler', { params: args });
      return res.data;
    }
    case "gorev_olustur": {
      const res = await api.post('/mcp/gorevler', args);
      return res.data;
    }
    case "fatura_kaydet": {
      const res = await api.post('/mcp/faturalar', args);
      return res.data;
    }
    default:
      throw new Error(`Bilinmeyen araç: ${name}`);
  }
}

// ── MCP SERVER FACTORY ────────────────────────────────────
function createServer() {
  const server = new Server(
    { name: "base-mcp", version: "1.0.0" },
    { capabilities: { tools: {} } }
  );

  server.setRequestHandler(ListToolsRequestSchema, async () => ({ tools: TOOLS }));

  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;
    try {
      const result = await callTool(name, args ?? {}, null);
      return {
        content: [{ type: "text", text: JSON.stringify(result, null, 2) }]
      };
    } catch (err) {
      return {
        content: [{
          type: "text",
          text: JSON.stringify({
            hata: err.message,
            detay: err.response?.data ?? null
          }, null, 2)
        }],
        isError: true
      };
    }
  });

  return server;
}

// ── CORS (tarayıcıdan MCP Tester vb. için) ───────────────
function applyCors(req, res) {
  const origin = req.headers.origin;
  if (origin) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  } else {
    res.setHeader('Access-Control-Allow-Origin', '*');
  }
  res.setHeader(
    'Access-Control-Allow-Headers',
    'Content-Type, Accept, x-mcp-secret, mcp-session-id, mcp-protocol-version, Authorization'
  );
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Max-Age', '86400');
}

// ── HTTP SUNUCUSU ────────────────────────────────────────
const PORT = process.env.PORT || 3001;

const httpServer = http.createServer(async (req, res) => {

  // Health check
  if (req.url === '/health' && req.method === 'GET') {
    applyCors(req, res);
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ status: 'ok', service: 'base-mcp', version: '1.0.0' }));
  }

  // Sadece /mcp endpoint'i
  if (!req.url.startsWith('/mcp')) {
    res.writeHead(404);
    return res.end('Not found');
  }

  applyCors(req, res);

  // CORS ön kontrolü — header gönderilmez; secret kontrolünden muaf
  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    return res.end();
  }

  // Opsiyonel: X-MCP-Secret header kontrolü
  const secret = process.env.MCP_SECRET;
  if (secret && req.headers['x-mcp-secret'] !== secret) {
    res.writeHead(401, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ hata: 'Yetkisiz erişim' }));
  }

  const server = createServer();
  const transport = new StreamableHTTPServerTransport({
    sessionIdGenerator: undefined, // stateless
  });

  res.on('close', () => transport.close());
  await server.connect(transport);
  await transport.handleRequest(req, res, await parseBody(req));
});

function parseBody(req) {
  return new Promise((resolve) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(body)); }
      catch { resolve({}); }
    });
  });
}

httpServer.listen(PORT, () => {
  console.log(`✅ BASE MCP Sunucusu :${PORT} portunda çalışıyor`);
  console.log(`📡 Endpoint: http://localhost:${PORT}/mcp`);
  console.log(`💚 Health:   http://localhost:${PORT}/health`);
});
