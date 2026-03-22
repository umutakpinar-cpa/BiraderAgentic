# Vergi Merkezi AI — Proje Tanım Belgesi

## Vizyonun Özü

Cursor nasıl "geliştiricinin AI'ı" ise, Vergi Merkezi AI de **küçük ve orta ölçekli işletmenin AI muhasebecisi**dir.

Kullanıcı uygulamayı açtığında karşısında bir sohbet kutusu değil, mali işlerini bilen, portala bağlı, sesli veya yazılı komutla tüm muhasebe kayıtlarını alabilen, raporları yorumlayan, uyarılar veren bir **dijital muhasebe ortağı** bulur.

---

## Üç Ana Kaynak (Kapsam Dışına Çıkılmaz)

| Kaynak | Rol |
|---|---|
| `portal.vergimerkezi.com.tr` | Birincil işlem ve veri API'si (cari, fatura, banka, kasa, rapor) |
| `dijital.vergimerkezi.com.tr` | Dijital dönüşüm araçları, e-fatura, e-defter, e-arşiv |
| `vergimerkezi.com.tr` | Mevzuat, pratik bilgi, vergi takvimi, rehber içerik |

Uygulama bu üç kaynağın verilerini birleştirerek çalışır. Kullanıcıya harici bilgi verilmez; her yanıt kendi şirket verisine ve vergimerkezi.com.tr'nin bilgi tabanına dayanır.

---

## Ürün Kimliği

```
Vergi Merkezi AI
"Şirketinizin AI muhasebecisi"

— Sesli veya yazılı komutla fatura kaydet
— Cari hesapları anlık izle
— KDV, gelir, gider raporlarını sorgula
— Banka ve kasa hareketlerini takip et
— Mevzuat sorularını cevapla
```

---

## Kullanıcı Tipi ve Günlük İş Akışı

### Hedef Kullanıcı
- Muhasebe bilgisi sınırlı, işletme sahibi
- Serbest muhasebeci (birden fazla şirket yöneten)
- İşletme muhasebe sorumlusu

### Tipik Günlük Kullanım Senaryoları

1. **"Bugünkü faturayı gir"**  
   → AI: Tür, tutar, tarih, karşı taraf bilgilerini toplar → portal API'ye kaydeder → onay verir

2. **"Bu ay ne kadar KDV ödeyeceğiz?"**  
   → AI: `vat_report` aracını çalıştırır → hesaplanan / indirilecek KDV farkını Türkçe özetle sunar

3. **"ABC Ltd. ne kadar borcu var?"**  
   → AI: `list_caris` ile ABC Ltd.'yi bulur → bakiyesini getirir → ödemesi gecikmiş kalemleri listeler

4. **"Bu yılın gelir gider özeti nedir?"**  
   → AI: `summary_report` çeker → rakamları yorumlar → önceki yıl varsa karşılaştırır

5. **"Sesli komut: Yarın tarihli 8500 lira elektrik faturası gir, tedarikçi İstanbul Elektrik"**  
   → STT → metin → AI parametreleri çıkarır → `create_invoice_draft` → kayıt edildi yanıtını sesli okur

---

## Mimari Genel Bakış

```
┌─────────────────────────────────────────────────────┐
│                  TARAYICI / PWA                      │
│                                                      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Dashboard│  │ AI Muhasebeci│  │ Modül Sayfalar│  │
│  │ (özet)   │  │ (sohbet+ses) │  │ Cari/Fatura   │  │
│  └──────────┘  └──────────────┘  │ Banka/Raporlar│  │
│                                  └───────────────┘  │
└───────────────────┬─────────────────────────────────┘
                    │ HTTPS
┌───────────────────▼─────────────────────────────────┐
│              CLOUDFLARE WORKER                       │
│                                                      │
│   /api/v1/*  proxy    /ai/chat  (OpenAI fn-call)    │
│   /ai/tts    (TTS)    /health   (monitor)            │
└──────────┬────────────────────┬────────────────────┘
           │                    │
┌──────────▼──────────┐  ┌──────▼─────────────────────┐
│portal.vergimerkezi  │  │   OpenAI API               │
│.com.tr /api/v1/*    │  │   GPT-4o + TTS + Whisper   │
│(şirket verileri)    │  │                            │
└─────────────────────┘  └────────────────────────────┘
           │
┌──────────▼──────────┐
│dijital.vergimerkezi │
│.com.tr (e-fatura,   │
│e-defter, e-arşiv)   │
└─────────────────────┘
```

---

## Modül Haritası

### M1 — Dashboard (Ana Sayfa)
- Aktif şirket seçici
- 6 anlık metrik: Gelir / Gider / KDV borcu / Açık alacak / Açık borç / Net nakit
- Son 10 işlem özet listesi
- Bekleyen uyarılar: geciken ödemeler, yaklaşan KDV beyanı, fatura son günü

### M2 — AI Muhasebeci (Merkez Ekran)
Uygulamanın kalbi. Cursor'un kod editörü gibi her şeyin bu ekranda döndüğü yüzey.

**Özellikler:**
- Türkçe sohbet + sesli komut (STT)
- Sesli yanıt (TTS — nova sesi)
- Bağlam farkındalığı: aktif şirket, son işlemler, sezon (KDV dönemi, beyan tarihleri)
- Araç çağrıları tamamen şeffaf: "Cari listesi alınıyor…" bildirimleri
- Hızlı eylem önerileri: "Fatura gir", "KDV özeti", "Cari bak"
- Konuşma geçmişi kalıcı (localStorage)
- Ekran paylaşımlı çalışma: AI düzenleme yaparken kullanıcı sonucu anlık görür

**AI Muhasebeci Karakteri:**
```
Sen Vergi Merkezi AI muhasebe asistanısın. 
Türk ön muhasebe mevzuatına hakimsin.
Kullanıcıya ait şirketlerin portal verilerine 
API üzerinden erişebiliyorsun.
Tüm işlemleri kayıt altına almak, raporları 
yorumlamak ve kullanıcıya yol göstermek senin 
görevindir.
Hiçbir zaman "yapamam" veya "bilemem" demezsin;
gerekli bilgiyi API'den çekersin.
```

### M3 — Cari Hesaplar
- Müşteri ve tedarikçi listesi (DataTable)
- Arama + filtreleme
- Cari detay: bakiye, hareket geçmişi
- Hızlı tahsilat / ödeme kaydı

### M4 — Fatura & Belgeler
- Gelen / giden fatura listesi
- Görsel AI fatura okuma (OCR, kamera veya dosya)
- Yeni fatura taslağı (adım adım wizard)
- Durum takibi: taslak / onaylı / iptal

### M5 — Banka & Kasa
- Banka hesapları ve bakiyeleri
- Kasa bakiyeleri
- Hareket listesi

### M6 — Raporlar
- KDV beyanname özeti
- Mizan
- Gelir tablosu
- Yıllık özet
- Evrak listesi (filtrelenebilir tarih/tür)

### M7 — Şirket Yönetimi
- Bağlı şirket listesi
- Aktif şirket değiştirme
- Her şirket için ayrı bağlam

### M8 — Ayarlar & Bağlantı
- Worker URL yapılandırması
- Bağlantı test
- Hesap çıkış

---

## AI Araç Seti (Portal API → OpenAI Tools)

| Araç | Endpoint | Açıklama |
|---|---|---|
| `list_companies` | `GET /agent/companies` | Bağlı şirketler |
| `list_caris` | `GET /agent/lookup/caris` | Cari hesap listesi |
| `list_categories` | `GET /agent/accounting/categories` | Gider/gelir kategorileri |
| `list_bank_accounts` | `GET /agent/lookup/bank-accounts` | Banka hesapları |
| `list_cash_registers` | `GET /agent/lookup/cash-registers` | Kasalar |
| `list_items` | `GET /agent/lookup/items` | Stok/hizmet kartları |
| `list_documents` | `GET /agent/reports/documents` | Evrak/fatura listesi |
| `vat_report` | `GET /agent/reports/vat` | KDV özeti |
| `trial_balance` | `GET /agent/reports/trial-balance` | Mizan |
| `income_statement` | `GET /agent/reports/income-statement` | Gelir tablosu |
| `summary_report` | `GET /agent/reports/summary` | Yıllık özet |
| `create_invoice_draft` | `POST /agent/accounting/record-invoice-draft` | Fatura/gider kaydı |
| `search_cari_movements` | `GET /agent/lookup/cari-movements` | Cari hareketleri |

**Planlanan ek araçlar (portal API doğrulandığında eklenecek):**
- `record_collection` — tahsilat girişi
- `record_payment` — ödeme girişi
- `list_bank_movements` — banka hareketleri
- `create_cari` — yeni cari oluştur
- `get_invoice_detail` — fatura detayı
- `list_overdue_caris` — vadesi geçmiş cariler

---

## Sesli Çalışma Akışı

```
Kullanıcı konuşur
      │
      ▼
Web Speech API (STT, Türkçe, tarayıcı-native, ücretsiz)
      │
      ▼
Metin → AI Muhasebeci'ye gönderilir
      │
      ▼
AI araçları çağırır → portal API'den veri çeker
      │
      ▼
Yanıt metni üretilir
      │
      ▼
POST /ai/tts → Cloudflare Worker → OpenAI TTS (nova sesi)
      │
      ▼
audio/mpeg → tarayıcıda otomatik oynar
```

**Hedef:** Kullanıcı telefonu eline alıp "Bugün 12.500 liralık elektrik faturası gir, tedarikçi Başkent Doğalgaz" diyebilmeli ve işlem tamamlanmış olmalı.

---

## Tasarım Dili

**Renk paleti:**
- Zemin: `#0f172a` (koyu lacivert)
- Yüzey: `#1e293b`
- Vurgu: `#2563eb` (mavi)
- Başarı: `#16a34a`
- Uyarı: `#d97706`
- Hata: `#dc2626`
- Metin birincil: `#f1f5f9`
- Metin ikincil: `#64748b`

**İlkeler:**
- Mobil öncelikli (PWA, telefon ekranında kullanım birincil hedef)
- Her işlem max 3 adımda tamamlanabilmeli
- AI muhasebeci her zaman görünür ve erişilebilir (floating butonu veya sabit alan)
- Sayfa başlıkları Türkçe, teknik terim yok
- Yükleme durumları her zaman gösterilir

---

## Geliştirme Aşamaları

### Faz 1 — Temel (Tamamlandı ✅)
- [x] Cloudflare Worker kurulumu
- [x] Portal API proxy
- [x] AI sohbet (GPT-4o-mini + function calling)
- [x] Login akışı
- [x] Dashboard (istatistik kartları + son belgeler)
- [x] Muhasebe sayfaları (DataTable tabanlı)
- [x] Sesli giriş (STT) + sesli yanıt (TTS)
- [x] Layout ikonlar + çıkış butonu

### Faz 2 — Derinleştirme (Sıradaki)
- [ ] Portal kaynak kodu analizi → tüm API endpoint'leri haritalanacak
- [ ] `record_collection` ve `record_payment` araçları
- [ ] Cari hareket geçmişi sayfası
- [ ] Fatura detay görünümü
- [ ] Geciken/vadesi yaklaşan ödemeler için dashboard uyarı kartı
- [ ] AI Muhasebeci'nin bağlam hafızası: "geçen hafta X'i konuşmuştuk" gibi referanslar

### Faz 3 — Akıllı Özellikler
- [ ] Görsel fatura OCR (kamera veya dosya yükleme)
- [ ] Vergi takvimi entegrasyonu (vergimerkezi.com.tr'den)
- [ ] e-fatura entegrasyonu (dijital.vergimerkezi.com.tr)
- [ ] Toplu işlem: "Bu ay gelen tüm faturaları özetler misin?"
- [ ] Otomatik kategori önerisi
- [ ] Aylık/dönemsel AI raporu: "Bu dönem dikkat edilmesi gerekenler"

### Faz 4 — Yayın
- [ ] Cloudflare Pages deploy
- [ ] PWA installable (iOS/Android)
- [ ] Push bildirimleri: vadesi yaklaşan ödemeler
- [ ] Multi-tenant güvenlik denetimi

---

## Teknik Kararlar ve Gerekçeler

| Karar | Seçilen Çözüm | Neden |
|---|---|---|
| AI backend | Cloudflare Worker | Edge'de çalışır, ölçeklenir, API anahtarı güvende |
| Dil modeli | GPT-4o-mini | Hız/maliyet dengesi; function calling desteği |
| STT | Web Speech API | Ücretsiz, Türkçe desteği var, sıfır gecikme |
| TTS | OpenAI nova sesi | Doğal Türkçe telaffuz |
| Frontend | Vite + React | Hızlı build, PWA desteği |
| Routing | react-router-dom | Client-side, PWA uyumlu |
| Auth | Bearer token | Portal'ın native mekanizması |
| State | React Context + localStorage | Basit, bağımlılık yok |

---

## Başarı Kriterleri

1. Kullanıcı sesli komutla 60 saniyeden kısa sürede fatura kaydedebilmeli
2. Dashboard açıldığında şirketin anlık mali durumu 5 metrikle görünmeli
3. AI muhasebeci, portal API'sinde olmayan bir soruyu kabul etmemeli — "bilmiyorum" yerine ilgili veriyi çekip yanıt vermeli
4. PWA olarak telefona kurulabilmeli, offline'da son durum görüntülenebilmeli
5. Tüm veriler yalnızca üç ana kaynaktan gelmeli

---

*Belge sürümü: 1.0 — Son güncelleme: Mart 2026*
