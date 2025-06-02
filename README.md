# Crypto Trading Bot & Website

Bu proje bir kripto para ticaret botu ve web arayüzünü içerir.

## 🌐 Web Sitesi
- **URL**: https://sivilabdullah.github.io
- **Özellikler**: Kullanıcı kayıt/giriş, dashboard, bot kontrolü, API key yönetimi
- **Teknolojiler**: HTML, CSS, JavaScript

## 🤖 Trading Bot
- **API Endpoint**: `/webhook`
- **Özellikler**: TradingView sinyal işleme, otomatik ticaret, kullanıcı API key desteği
- **Teknolojiler**: Python, Flask, Binance API

## 🔑 Güvenlik Özellikleri
- ✅ **Kullanıcı API Key'leri**: Her kullanıcı kendi API key'lerini web sitesi üzerinden bağlar
- ✅ **Dinamik API Yönetimi**: Environment variables yerine kullanıcıdan alınan API key'ler
- ✅ **Güvenli Depolama**: API key'ler sadece runtime'da memory'de tutulur
- ✅ **Çoklu Kullanıcı Desteği**: Birden fazla kullanıcı API key bağlayabilir

## 📁 Proje Yapısı
```
├── index.html           # Ana sayfa
├── login.html          # Giriş sayfası  
├── register.html       # Kayıt sayfası
├── dashboard.html      # Dashboard
├── css/               # Stil dosyaları
├── js/                # JavaScript dosyaları
├── images/            # Resim dosyaları
└── bot/               # Trading bot dosyaları
    ├── webhook_server.py    # Ana webhook server
    ├── api_keyler.py       # API key konfigürasyonu
    ├── trade_stats.py      # İşlem istatistikleri
    └── requirements.txt    # Python bağımlılıkları
└── sync_bot.sh        # Bot dosyalarını senkronize etme scripti
```

## 🚀 Kurulum

### Bot için Python Bağımlılıkları
```bash
cd bot
pip install -r requirements.txt
```

### Local Development
```bash
cd bot
python3 webhook_server.py
```

## 🔄 Bot Dosyalarını Senkronize Etme

Bot dosyalarını güncelledikten sonra orijinal Binance-trade-bot klasörüne senkronize etmek için:

```bash
./sync_bot.sh
```

Bu script:
- `bot/` klasöründeki dosyaları `/Users/abdullah/Desktop/crypto-website/Binance-trade-bot/` klasörüne kopyalar
- Hedef klasör yoksa otomatik oluşturur
- Başarılı kopyalama sonrası dosya listesini gösterir

## 🔧 Production Deployment (Railway)

### 1. Environment Variables (Opsiyonel)
Production'da API key'ler web sitesinden alınır, bu yüzden environment variables opsiyoneldir:
```
DISCORD_WEBHOOK_URL=your_discord_webhook_url (opsiyonel)
```

### 2. Kullanıcı Akışı
1. Kullanıcı web sitesine kayıt olur/giriş yapar
2. Dashboard'dan Binance API key'lerini bağlar
3. Bot'u başlatır
4. TradingView sinyalleri kullanıcının API key'leriyle işlenir

## 📋 TradingView Webhook URL
```
https://your-railway-domain.com/webhook
```

## 🎯 API Endpoints

### Bot Kontrolü
- `POST /api/bot/start` - Bot'u başlat (API key gerekli)
- `POST /api/bot/stop` - Bot'u durdur
- `GET /api/bot/status` - Bot durumu

### API Key Yönetimi
- `POST /api/keys` - API key bağla/çöz/kontrol et

### Trading
- `POST /webhook` - TradingView sinyal endpoint'i
- `GET /api/positions` - Açık pozisyonlar
- `GET /api/stats` - İşlem istatistikleri

## 💡 Avantajlar

1. **Güvenlik**: Her kullanıcı kendi API key'lerini kullanır
2. **Sıfır Konfigürasyon**: Production'da environment variables gerekmez
3. **Çoklu Kullanıcı**: Birden fazla kullanıcı destegi
4. **Kolay Yönetim**: Web arayüzünden tam kontrol
5. **Şeffaflık**: Kullanıcılar kendi hesaplarında işlemleri görür
6. **Otomatik Senkronizasyon**: Script ile orijinal bot dosyalarını güncel tutar 