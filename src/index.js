// Portal API yönlendirmesi — PROJE.md ile uyumlu:
//   API_STYLE=agent (varsayılan) → /api/v1/agent/...
//   API_STYLE=mcp              → /api/v1/mcp/... (eski Laravel MCP rotaları)

const DEFAULT_TIMEOUT_MS = 25000;

// ── ARAÇ TANIMLARI ────────────────────────────────────────
const TOOLS = [
  {
    name: "musteri_ara",
    description: "İsim veya VKN/TCKN ile müşteri ya da tedarikçi ara",
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
        id: { type: "number", description: "Müşteri / cari ID" }
      },
      required: ["id"]
    }
  },
  {
    name: "cari_listesi",
    description: "Tüm cari hesapları (müşteri ve tedarikçi) listele",
    inputSchema: {
      type: "object",
      properties: {
        tur: {
          type: "string",
          enum: ["musteri", "tedarikci", "hepsi"],
          description: "Cari türü filtresi (varsayılan: hepsi)"
        },
        sayfa: { type: "number", description: "Sayfa numarası (varsayılan: 1)" }
      }
    }
  },
  {
    name: "cari_olustur",
    description: "Yeni cari hesap (müşteri veya tedarikçi) oluştur",
    inputSchema: {
      type: "object",
      properties: {
        ad: { type: "string", description: "Cari adı / firma adı" },
        tur: {
          type: "string",
          enum: ["musteri", "tedarikci"],
          description: "Cari türü"
        },
        vkn_tckn: { type: "string", description: "Vergi Kimlik No veya TC Kimlik No" },
        telefon: { type: "string", description: "Telefon numarası" },
        eposta: { type: "string", description: "E-posta adresi" },
        adres: { type: "string", description: "Adres bilgisi" },
        sehir: { type: "string", description: "Şehir" },
        ilce: { type: "string", description: "İlçe" },
        vergi_dairesi: { type: "string", description: "Vergi dairesi adı" }
      },
      required: ["ad", "tur"]
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
    description: "Beyannameleri listele ve duruma göre filtrele",
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
    description: "Müşteri için yeni görev veya hatırlatıcı oluştur",
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
    description: "Fatura bilgilerini BASE ön muhasebeye kaydet. Güven skoru 0.85 altındaysa taslak olarak kaydedilir, danışman onayı istenir.",
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
          description: "0-1 arası. 0.85 altı ise taslak kaydedilir."
        },
        ai_notlar: { type: "string", description: "Belirsiz veya eksik alanlar hakkında notlar" }
      },
      required: ["musteri_id", "fatura_no", "fatura_tarihi", "kdv_dahil_toplam", "fatura_turu"]
    }
  },
  {
    name: "kdv_raporu",
    description: "Belirli dönem için KDV hesaplanan/indirilecek özeti getir",
    inputSchema: {
      type: "object",
      properties: {
        yil: { type: "number", description: "Yıl (örn: 2025)" },
        ay: { type: "number", description: "Ay 1-12 (boş bırakılırsa tüm yıl)" }
      },
      required: ["yil"]
    }
  },
  {
    name: "gelir_tablosu",
    description: "Belirli dönem için gelir-gider tablosunu getir",
    inputSchema: {
      type: "object",
      properties: {
        yil: { type: "number", description: "Yıl" },
        ay: { type: "number", description: "Ay (opsiyonel, boş bırakılırsa tüm yıl)" }
      },
      required: ["yil"]
    }
  },
  {
    name: "mizan",
    description: "Mizan raporunu getir",
    inputSchema: {
      type: "object",
      properties: {
        yil: { type: "number" },
        ay: { type: "number", description: "Ay (opsiyonel)" }
      },
      required: ["yil"]
    }
  },
  {
    name: "tahsilat_kaydet",
    description: "Müşteriden tahsilat (ödeme alma) kaydı oluştur",
    inputSchema: {
      type: "object",
      properties: {
        musteri_id: { type: "number" },
        tutar: { type: "number" },
        tarih: { type: "string", description: "YYYY-MM-DD" },
        aciklama: { type: "string" },
        odeme_yontemi: {
          type: "string",
          enum: ["nakit", "banka", "kredi_karti", "cek", "senet"]
        }
      },
      required: ["musteri_id", "tutar", "tarih", "odeme_yontemi"]
    }
  },
  {
    name: "odeme_kaydet",
    description: "Tedarikçiye ödeme (gider ödeme) kaydı oluştur",
    inputSchema: {
      type: "object",
      properties: {
        tedarikci_id: { type: "number" },
        tutar: { type: "number" },
        tarih: { type: "string", description: "YYYY-MM-DD" },
        aciklama: { type: "string" },
        odeme_yontemi: {
          type: "string",
          enum: ["nakit", "banka", "kredi_karti", "cek", "senet"]
        }
      },
      required: ["tedarikci_id", "tutar", "tarih", "odeme_yontemi"]
    }
  }
];

// ── YARDIMCILAR ───────────────────────────────────────────
function normalizeBaseUrl(url) {
  if (!url || typeof url !== 'string') return '';
  return url.replace(/\/+$/, '');
}

/** Worker env + gelen istekten portal Bearer token çöz */
function resolvePortalToken(env, request) {
  const fromEnv = env.BASE_API_KEY || env.PORTAL_API_TOKEN;
  if (fromEnv) return String(fromEnv).trim();
  const auth = request?.headers?.get('Authorization');
  if (auth && /^Bearer\s+/i.test(auth)) {
    return auth.replace(/^Bearer\s+/i, '').trim();
  }
  return null;
}

function apiStyle(env) {
  const s = (env.API_STYLE || 'agent').toLowerCase();
  return s === 'mcp' ? 'mcp' : 'agent';
}

/** agent dışı modüller (takvim, beyanname, görev) için /mcp öneki */
function legacyPrefix(env) {
  const p = env.API_LEGACY_PREFIX ?? '/mcp';
  return p.startsWith('/') ? p : `/${p}`;
}

// ── API İSTEMCİSİ ─────────────────────────────────────────
function buildApiClient(env, request) {
  const baseUrl = normalizeBaseUrl(env.BASE_API_URL);
  const token = resolvePortalToken(env, request);

  const headersBase = () => ({
    Accept: 'application/json',
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  });

  async function request(method, path, { params, body } = {}) {
    if (!baseUrl) {
      throw new Error('BASE_API_URL tanımlı değil. Cloudflare’de secret / .dev.vars kontrol et.');
    }
    const url = new URL(baseUrl + path);
    if (params) {
      for (const [k, v] of Object.entries(params)) {
        if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v));
      }
    }
    const timeout = Number(env.API_TIMEOUT_MS) || DEFAULT_TIMEOUT_MS;
    const init = {
      method,
      headers: headersBase(),
      signal: AbortSignal.timeout(timeout),
    };
    if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
      init.body = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), init);
    const text = await res.text();
    let data = null;
    try {
      data = text ? JSON.parse(text) : null;
    } catch {
      data = { raw: text };
    }

    if (!res.ok) {
      const msg =
        (data && (data.message || data.error)) ||
        res.statusText ||
        `HTTP ${res.status}`;
      const err = new Error(typeof msg === 'string' ? msg : JSON.stringify(msg));
      err.status = res.status;
      err.details = data;
      throw err;
    }
    return data;
  }

  return {
    get: (path, params) => request('GET', path, { params }),
    post: (path, body) => request('POST', path, { body }),
  };
}

// ── ROTA EŞLEMESİ (agent ↔ mcp) ───────────────────────────
function toolRoutes(env) {
  const style = apiStyle(env);
  const leg = legacyPrefix(env);

  if (style === 'mcp') {
    return {
      musteri_ara: { get: ['/mcp/musteriler', (a) => ({ q: a.q })] },
      musteri_detay: { get: [(a) => `/mcp/musteriler/${a.id}`, () => ({})] },
      cari_listesi: { get: ['/mcp/cariler', (a) => ({ tur: a.tur ?? 'hepsi', sayfa: a.sayfa ?? 1 })] },
      cari_olustur: { post: ['/mcp/cariler', (a) => a] },
      takvim_getir: { get: ['/mcp/takvim', (a) => ({ gun: Math.min(a.gun ?? 30, 90) })] },
      beyanname_listesi: { get: ['/mcp/beyannameler', (a) => a] },
      gorev_olustur: { post: ['/mcp/gorevler', (a) => a] },
      fatura_kaydet: { post: ['/mcp/faturalar', (a) => a] },
      kdv_raporu: { get: ['/mcp/raporlar/kdv', (a) => ({ yil: a.yil, ay: a.ay })] },
      gelir_tablosu: { get: ['/mcp/raporlar/gelir-gider', (a) => ({ yil: a.yil, ay: a.ay })] },
      mizan: { get: ['/mcp/raporlar/mizan', (a) => ({ yil: a.yil, ay: a.ay })] },
      tahsilat_kaydet: { post: ['/mcp/tahsilatlar', (a) => a] },
      odeme_kaydet: { post: ['/mcp/odemeler', (a) => a] },
    };
  }

  // PROJE.md — Portal Agent API (/api/v1/agent/...)
  return {
    musteri_ara: {
      get: ['/agent/lookup/caris', (a) => ({ q: a.q })],
    },
    musteri_detay: {
      get: [(a) => `/agent/lookup/caris/${a.id}`, () => ({})],
    },
    cari_listesi: {
      get: [
        '/agent/lookup/caris',
        (a) => ({
          page: a.sayfa ?? 1,
          sayfa: a.sayfa ?? 1,
          tur: a.tur ?? 'hepsi',
        }),
      ],
    },
    cari_olustur: {
      post: ['/agent/lookup/caris', (a) => a],
    },
    takvim_getir: {
      get: [`${leg}/takvim`, (a) => ({ gun: Math.min(a.gun ?? 30, 90) })],
    },
    beyanname_listesi: {
      get: [`${leg}/beyannameler`, (a) => a],
    },
    gorev_olustur: {
      post: [`${leg}/gorevler`, (a) => a],
    },
    fatura_kaydet: {
      post: ['/agent/accounting/record-invoice-draft', (a) => a],
    },
    kdv_raporu: {
      get: ['/agent/reports/vat', (a) => ({ yil: a.yil, ay: a.ay })],
    },
    gelir_tablosu: {
      get: ['/agent/reports/income-statement', (a) => ({ yil: a.yil, ay: a.ay })],
    },
    mizan: {
      get: ['/agent/reports/trial-balance', (a) => ({ yil: a.yil, ay: a.ay })],
    },
    tahsilat_kaydet: {
      post: ['/agent/accounting/record-collection', (a) => a],
    },
    odeme_kaydet: {
      post: ['/agent/accounting/record-payment', (a) => a],
    },
  };
}

// ── ARAÇ İŞLEYİCİ ────────────────────────────────────────
async function callTool(name, args, env, request) {
  const api = buildApiClient(env, request);
  const routes = toolRoutes(env)[name];

  if (!routes) throw new Error(`Bilinmeyen araç: ${name}`);

  if (routes.get) {
    const [pathOrFn, paramsFn] = routes.get;
    const path = typeof pathOrFn === 'function' ? pathOrFn(args) : pathOrFn;
    const params = paramsFn(args);
    return api.get(path, params);
  }
  if (routes.post) {
    const [path, bodyFn] = routes.post;
    return api.post(path, bodyFn(args));
  }
  throw new Error(`Araç yapılandırması hatalı: ${name}`);
}

// ── MCP PROTOKOL İŞLEYİCİ ─────────────────────────────────
async function handleMcpMessage(message, env, request) {
  const { method, params, id } = message;

  if (method === 'initialize') {
    return {
      jsonrpc: '2.0',
      id,
      result: {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'biraderagentic', version: '1.1.0' },
      },
    };
  }

  if (method === 'ping') {
    return { jsonrpc: '2.0', id, result: {} };
  }

  if (method?.startsWith('notifications/')) {
    return null;
  }

  if (method === 'tools/list') {
    return {
      jsonrpc: '2.0',
      id,
      result: { tools: TOOLS },
    };
  }

  if (method === 'tools/call') {
    try {
      const result = await callTool(params.name, params.arguments ?? {}, env, request);
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [{ type: 'text', text: JSON.stringify(result, null, 2) }],
        },
      };
    } catch (err) {
      return {
        jsonrpc: '2.0',
        id,
        result: {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  hata: err.message,
                  http_status: err.status ?? null,
                  detay: err.details ?? null,
                },
                null,
                2
              ),
            },
          ],
          isError: true,
        },
      };
    }
  }

  return {
    jsonrpc: '2.0',
    id,
    error: { code: -32601, message: 'Method not found' },
  };
}

// ── PORTAL BAĞLANTI TESTİ (isteğe bağlı) ──────────────────
async function probePortalApi(env, request) {
  const baseUrl = normalizeBaseUrl(env.BASE_API_URL);
  const token = resolvePortalToken(env, request);
  if (!baseUrl || !token) {
    return {
      ok: false,
      reason: !baseUrl ? 'BASE_API_URL eksik' : 'API token yok (BASE_API_KEY veya Authorization: Bearer)',
    };
  }
  const style = apiStyle(env);
  const path = style === 'mcp' ? '/mcp/musteriler' : '/agent/companies';
  const url = new URL(baseUrl + path);
  if (style === 'mcp') {
    url.searchParams.set('q', 'a');
  } else {
    url.searchParams.set('limit', '1');
  }

  try {
    const res = await fetch(url.toString(), {
      method: 'GET',
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${token}`,
      },
      signal: AbortSignal.timeout(12000),
    });
    const text = await res.text();
    let body = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = { raw: text?.slice(0, 200) };
    }
    return {
      ok: res.ok,
      http_status: res.status,
      path_checked: path,
      api_style: style,
      hint: res.ok
        ? 'Portal API yanıt veriyor.'
        : res.status === 401 || res.status === 403
          ? 'Kimlik doğrulama hatası — token süresi veya yetki kontrolü.'
          : 'Yanıt alınamadı — route veya API_STYLE (agent/mcp) eşleşmesini kontrol et.',
      body_preview: body && typeof body === 'object' ? body : null,
    };
  } catch (e) {
    return {
      ok: false,
      reason: e.message || 'Ağ hatası',
      path_checked: path,
    };
  }
}

// ── CORS ──────────────────────────────────────────────────
function corsHeaders(request) {
  const origin = request.headers.get('Origin');
  return {
    'Access-Control-Allow-Origin': origin || '*',
    ...(origin ? { Vary: 'Origin' } : {}),
    'Access-Control-Allow-Headers':
      'Content-Type, Accept, x-mcp-secret, mcp-session-id, mcp-protocol-version, Authorization',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Max-Age': '86400',
  };
}

function publicBaseDisplay(baseUrl) {
  try {
    const u = new URL(baseUrl);
    return `${u.protocol}//${u.host}${u.pathname.replace(/\/+$/, '')}`;
  } catch {
    return baseUrl ? '(geçersiz URL)' : '';
  }
}

// ── CLOUDFLARE WORKERS ────────────────────────────────────
export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const cors = corsHeaders(request);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }

    if (url.pathname === '/health') {
      const baseUrl = normalizeBaseUrl(env.BASE_API_URL);
      const tokenOk = !!resolvePortalToken(env, request);
      const payload = {
        status: 'ok',
        service: 'biraderagentic',
        version: '1.1.0',
        tools: TOOLS.length,
        api: {
          base_url_configured: !!baseUrl,
          base_url: publicBaseDisplay(baseUrl),
          style: apiStyle(env),
          legacy_prefix: apiStyle(env) === 'agent' ? legacyPrefix(env) : null,
          token_configured: tokenOk,
        },
      };

      if (url.searchParams.get('probe') === '1') {
        payload.api.probe = await probePortalApi(env, request);
      }

      return Response.json(payload, { headers: cors });
    }

    if (!url.pathname.startsWith('/mcp')) {
      return new Response('Not found', { status: 404 });
    }

    const secret = env.MCP_SECRET;
    if (secret && request.headers.get('x-mcp-secret') !== secret) {
      return Response.json({ hata: 'Yetkisiz erişim' }, { status: 401, headers: cors });
    }

    if (request.method !== 'POST') {
      return new Response('Method not allowed', { status: 405, headers: cors });
    }

    if (!resolvePortalToken(env, request)) {
      return Response.json(
        {
          jsonrpc: '2.0',
          id: null,
          error: {
            code: -32000,
            message:
              'Portal API token yok. Worker’da BASE_API_KEY tanımla veya isteğe Authorization: Bearer <portal_token> ekle.',
          },
        },
        { status: 401, headers: cors }
      );
    }

    let body;
    try {
      body = await request.json();
    } catch {
      return Response.json(
        { jsonrpc: '2.0', id: null, error: { code: -32700, message: 'Parse error' } },
        { status: 400, headers: cors }
      );
    }

    const messages = Array.isArray(body) ? body : [body];
    const responses = (await Promise.all(messages.map((m) => handleMcpMessage(m, env, request)))).filter(
      (r) => r !== null
    );

    if (responses.length === 0) {
      return new Response(null, { status: 202, headers: cors });
    }

    const payload = Array.isArray(body) ? responses : responses[0];
    return Response.json(payload, { headers: cors });
  },
};
