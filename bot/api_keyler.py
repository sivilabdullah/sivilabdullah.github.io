import os

# Binance API Credentials - Use environment variables for security
API_KEY = os.environ.get("BINANCE_API_KEY", "")
API_SECRET = os.environ.get("BINANCE_API_SECRET", "")

DEFAULT_SYMBOL = "BTCUSDT"

# Discord Configuration - Use environment variables for security  
DISCORD_CHANNEL_ID = os.environ.get("DISCORD_CHANNEL_ID", "")
DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN", "")
DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")

USE_TESTNET = "True"

# Example .env file (create this file locally):
# BINANCE_API_KEY=your_binance_api_key_here
# BINANCE_API_SECRET=your_binance_secret_key_here
# DISCORD_CHANNEL_ID=your_discord_channel_id
# DISCORD_TOKEN=your_discord_bot_token
# DISCORD_WEBHOOK_URL=your_discord_webhook_url 