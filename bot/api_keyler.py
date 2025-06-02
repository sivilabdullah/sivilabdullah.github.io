import os

# Binance API Credentials - Web sitesi üzerinden dinamik olarak alınır
# Environment variables sadece local development için fallback
API_KEY = os.environ.get("BINANCE_API_KEY", "")
API_SECRET = os.environ.get("BINANCE_API_SECRET", "")

DEFAULT_SYMBOL = "BTCUSDT"

# Discord Configuration - Opsiyonel notifications için
DISCORD_CHANNEL_ID = os.environ.get("DISCORD_CHANNEL_ID", "")
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN", "")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")

USE_TESTNET = "True"

# NOT: Production'da API key'ler web sitesi üzerinden kullanıcıdan alınır
# Environment variables sadece development/testing için kullanılır 