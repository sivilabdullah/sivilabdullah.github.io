#!/bin/bash

# Bot dosyalarını Binance-trade-bot klasörüne senkronize eder

BOT_SOURCE="./bot/"
BOT_TARGET="/Users/abdullah/Desktop/crypto-website/Binance-trade-bot/"

echo "🔄 Bot dosyaları senkronize ediliyor..."

# Hedef klasör yoksa oluştur
if [ ! -d "$BOT_TARGET" ]; then
    echo "📁 Binance-trade-bot klasörü oluşturuluyor..."
    mkdir -p "$BOT_TARGET"
fi

# Bot klasörü varsa dosyaları kopyala
if [ -d "$BOT_SOURCE" ]; then
    echo "📋 Dosyalar kopyalanıyor: $BOT_SOURCE -> $BOT_TARGET"
    cp -r ${BOT_SOURCE}* "$BOT_TARGET"
    echo "✅ Senkronizasyon tamamlandı!"
    echo "📊 Kopyalanan dosyalar:"
    ls -la "$BOT_TARGET"
else
    echo "❌ Bot klasörü bulunamadı: $BOT_SOURCE"
    echo "💡 Önce bot klasörünü oluşturun ve dosyaları ekleyin"
fi 