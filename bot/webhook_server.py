from flask import Flask, request, jsonify
import json
import os
import math
try:
    from api_keyler import API_KEY, API_SECRET, DISCORD_TOKEN, DISCORD_CHANNEL_ID, DISCORD_WEBHOOK_URL, USE_TESTNET, DEFAULT_SYMBOL
except ImportError:
    import os
    API_KEY = os.environ.get("BINANCE_API_KEY", "")
    API_SECRET = os.environ.get("BINANCE_API_SECRET", "")
    DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN", "")
    DISCORD_CHANNEL_ID = os.environ.get("DISCORD_CHANNEL_ID", "")
    DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL", "")
    USE_TESTNET = os.environ.get("USE_TESTNET", "True")
    DEFAULT_SYMBOL = os.environ.get("DEFAULT_SYMBOL", "BTCUSDT")

from binance.um_futures import UMFutures
import logging
import requests
import datetime
import time

# İşlem limitleri ve başarısız işlem takibi için sınıf
class TradingLimits:
    def __init__(self):
        self.daily_trades = {}
        self.failed_trades = {}
        self.daily_pnl = {}
        self.trade_blocked_symbols = set()
        self.max_failed_trades = 3
        self.max_daily_trades = 10
        self.max_open_positions = 5
        
    def reset_daily_stats(self):
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        self.daily_trades[today] = {}
        self.failed_trades[today] = {}
        self.daily_pnl[today] = {}
        self.trade_blocked_symbols = set()
        logger.info("Günlük işlem istatistikleri sıfırlandı.")
        
    def get_today_key(self):
        return datetime.datetime.now().strftime('%Y-%m-%d')
        
    def record_trade(self, symbol, is_successful=True, profit_loss=None):
        today = self.get_today_key()
        
        if today not in self.daily_trades:
            self.daily_trades[today] = {}
        if today not in self.failed_trades:
            self.failed_trades[today] = {}
        if today not in self.daily_pnl:
            self.daily_pnl[today] = {}
            
        if symbol not in self.daily_trades[today]:
            self.daily_trades[today][symbol] = 0
        if symbol not in self.failed_trades[today]:
            self.failed_trades[today][symbol] = 0
        if symbol not in self.daily_pnl[today]:
            self.daily_pnl[today][symbol] = 0
            
        self.daily_trades[today][symbol] += 1
        
        if not is_successful:
            self.failed_trades[today][symbol] += 1
            if self.failed_trades[today][symbol] >= self.max_failed_trades:
                self.trade_blocked_symbols.add(symbol)
                logger.warning(f"{symbol} için işlemler engellendi.")
                send_discord_message(f"⛔️ **İŞLEM ENGELLENDİ** - {symbol}")
        
        if profit_loss is not None:
            self.daily_pnl[today][symbol] += profit_loss
            
        logger.info(f"İşlem kaydedildi: {symbol}, Başarı: {is_successful}")
        
    def can_trade(self, symbol):
        today = self.get_today_key()
        
        if symbol in self.trade_blocked_symbols:
            return False
            
        if today in self.daily_trades and symbol in self.daily_trades[today]:
            if self.daily_trades[today][symbol] >= self.max_daily_trades:
                return False
                
        open_positions = len(get_open_positions())
        if open_positions >= self.max_open_positions:
            return False
            
        return True

# Global değişkenler
trade_limits = TradingLimits()
user_api_keys = {}
active_trading_user = None
bot_status = "offline"

# Loglama sistemi
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot_logs.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("trade_bot")

# Flask uygulaması
app = Flask(__name__)

# Flask CORS desteği
from flask_cors import CORS
CORS(app, origins=["https://sivilabdullah.github.io", "http://localhost:3000", "http://127.0.0.1:5500"])

def get_active_client():
    """Kullanıcıdan alınan API key'leriyle Binance client'ı döndürür"""
    global active_trading_user
    
    # 1. Web sitesinden alınan API key'ler (öncelik)
    if active_trading_user and active_trading_user in user_api_keys:
        user_keys = user_api_keys[active_trading_user]
        try:
            client = UMFutures(
                key=user_keys['api_key'], 
                secret=user_keys['secret_key'], 
                base_url="https://testnet.binancefuture.com"
            )
            logger.info(f"✅ Aktif kullanıcı API key'leri kullanılıyor: {active_trading_user}")
            return client
        except Exception as e:
            logger.error(f"Aktif kullanıcı client hatası: {e}")
            
    # 2. Herhangi bir kullanıcının API key'leri
    if user_api_keys:
        for user_id, user_keys in user_api_keys.items():
            try:
                client = UMFutures(
                    key=user_keys['api_key'], 
                    secret=user_keys['secret_key'], 
                    base_url="https://testnet.binancefuture.com"
                )
                logger.info(f"✅ Kullanıcı API key'leri kullanılıyor: {user_id}")
                active_trading_user = user_id
                return client
            except Exception as e:
                logger.error(f"User {user_id} client hatası: {e}")
                continue
    
    # 3. Environment variables (fallback)
    if API_KEY and API_SECRET:
        logger.warning("⚠️ Environment variables kullanılıyor")
        return UMFutures(key=API_KEY, secret=API_SECRET, base_url="https://testnet.binancefuture.com")
    
    logger.error("❌ Hiçbir API key bulunamadı!")
    return None

def send_discord_message(content):
    """Discord webhook'una mesaj gönderir"""
    try:
        if DISCORD_WEBHOOK_URL:
            webhook_url = DISCORD_WEBHOOK_URL
            data = {"content": content}
            response = requests.post(webhook_url, json=data)
            logger.info(f"Discord mesajı gönderildi: {content[:50]}...")
            return response
        else:
            logger.info(f"Discord mesajı (webhook yok): {content[:50]}...")
    except Exception as e:
        logger.error(f"Discord mesajı gönderme hatası: {e}")
        return None

def get_open_positions(symbol=None):
    """Açık pozisyonları getirir"""
    try:
        active_client = get_active_client()
        if not active_client:
            logger.error("Client bulunamadı - pozisyonlar alınamıyor")
            return []
            
        positions = active_client.get_position_risk()
        if symbol:
            positions = [p for p in positions if p['symbol'] == symbol and float(p['positionAmt']) != 0]
        else:
            positions = [p for p in positions if float(p['positionAmt']) != 0]
        
        logger.info(f"Açık pozisyonlar alındı: {len(positions)} adet")
        return positions
    except Exception as e:
        logger.error(f"Pozisyon bilgisi alma hatası: {e}")
        return []

def parse_webhook_data(request):
    """
    TradingView webhook verilerini farklı formatlardan parse eder
    """
    try:
        content_type = request.content_type or ""
        raw_data = request.data.decode('utf-8') if request.data else ""
        
        logger.info(f"📨 Webhook alındı - Content-Type: '{content_type}'")
        logger.info(f"📨 Raw data: {raw_data[:200]}...")
        
        data = None
        
        # 1. JSON Content-Type kontrolü
        if 'application/json' in content_type:
            try:
                data = request.get_json(force=False)
                if data:
                    logger.info("✅ JSON formatında parse edildi")
                    return data
            except Exception as e:
                logger.warning(f"JSON parse hatası: {e}")
        
        # 2. Form data kontrolü
        if request.form:
            form_data = dict(request.form)
            logger.info(f"📋 Form data alındı: {list(form_data.keys())}")
            
            # İlk key'i JSON olarak parse etmeye çalış
            if form_data:
                first_key = list(form_data.keys())[0]
                try:
                    data = json.loads(first_key)
                    logger.info("✅ Form data JSON olarak parse edildi")
                    return data
                except:
                    logger.info("📋 Form data direkt kullanılıyor")
                    return form_data
        
        # 3. Raw data parse (TradingView alert formatı)
        if raw_data:
            try:
                # alert('{ ... }') formatını algıla
                if 'alert(' in raw_data:
                    start_index = raw_data.find('{')
                    end_index = raw_data.rfind('}')
                    if start_index != -1 and end_index != -1:
                        json_str = raw_data[start_index:end_index+1]
                        data = json.loads(json_str)
                        logger.info("✅ Alert formatından JSON parse edildi")
                        return data
                
                # Direkt JSON parse
                if raw_data.strip().startswith('{'):
                    data = json.loads(raw_data)
                    logger.info("✅ Raw JSON parse edildi")
                    return data
                    
            except Exception as e:
                logger.warning(f"Raw data parse hatası: {e}")
        
        # 4. URL-encoded data
        if request.values:
            data = dict(request.values)
            logger.info(f"🌐 URL-encoded data alındı: {list(data.keys())}")
            return data
        
        # 5. En son çare - force JSON parse
        try:
            data = request.get_json(force=True)
            if data:
                logger.info("✅ Force JSON parse başarılı")
                return data
        except Exception as e:
            logger.warning(f"Force JSON parse hatası: {e}")
        
        logger.error("❌ Hiçbir format parse edilemedi")
        return None
        
    except Exception as e:
        logger.error(f"Webhook data parse hatası: {e}")
        return None

@app.route('/webhook', methods=['POST'])
def webhook():
    """TradingView webhook endpoint'i - Gelişmiş Content-Type desteği"""
    try:
        logger.info("🎯 Webhook isteği alındı")
        
        # Bot durumu kontrolü
        global bot_status
        if bot_status != "running":
            logger.warning(f"Bot durumu: {bot_status} - Sinyal işlenmedi")
            send_discord_message(f"⚠️ **BOT PASİF** - Bot durumu: {bot_status}")
            return jsonify({"status": "error", "message": f"Bot is not running. Status: {bot_status}"}), 400
        
        # API key kontrolü
        if not user_api_keys:
            logger.warning("❌ Kullanıcı API key'i bulunamadı")
            send_discord_message("🔑 **API KEY GEREKLİ** - Web sitesinden API key bağlayın")
            return jsonify({
                "status": "error", 
                "message": "No user API keys found. Connect API keys via website.",
                "action_required": "Connect API keys"
            }), 400
        
        # Aktif kullanıcı kontrolü
        if not active_trading_user or active_trading_user not in user_api_keys:
            logger.warning("⚠️ Aktif trading kullanıcısı yok")
            if user_api_keys:
                active_trading_user = list(user_api_keys.keys())[0]
                logger.info(f"✅ İlk kullanıcı aktif yapıldı: {active_trading_user}")
            else:
                send_discord_message("⚠️ **AKTİF KULLANICI YOK**")
                return jsonify({
                    "status": "error", 
                    "message": "No active trading user. Login and connect API keys.",
                    "action_required": "Login and connect API keys"
                }), 400
        
        # Webhook verilerini parse et
        data = parse_webhook_data(request)
        
        if not data:
            logger.error("❌ Webhook verisi parse edilemedi")
            return jsonify({"status": "error", "message": "Failed to parse webhook data"}), 400
            
        logger.info(f"✅ Parse edilmiş data: {data}")
        
        # Gerekli alanları kontrol et
        if not all(key in data for key in ['signal', 'symbol']):
            logger.error(f"❌ Eksik alanlar. Mevcut: {list(data.keys())}")
            return jsonify({"status": "error", "message": "Missing required fields: signal, symbol"}), 400
            
        # Verileri çıkar
        signal = data['signal']
        symbol = data['symbol']
        price = data.get('price', '0')
        atr = data.get('atr', None)
        risk_percentage = float(data.get('risk', 1.0))
        
        logger.info(f"🚀 Sinyal işleniyor: {signal} {symbol} @{price} (User: {active_trading_user})")
        send_discord_message(f"🎯 **SİNYAL ALINDI** - {signal} {symbol} @{price}")
        
        # İşlem limitlerini kontrol et
        if not trade_limits.can_trade(symbol):
            logger.warning(f"⛔ {symbol} için işlem limitleri aşıldı")
            send_discord_message(f"⛔️ **İŞLEM ENGELLENDİ** - {symbol} limit aşımı")
            return jsonify({"status": "error", "message": "Trading limits exceeded"}), 429
        
        # Basit sinyal işleme
        if signal in ["buy", "smart_buy"]:
            logger.info(f"📈 BUY sinyali işleniyor: {symbol}")
            send_discord_message(f"📈 **BUY SİNYALİ** - {symbol} işlem hazırlanıyor")
            # İşlem mantığı buraya eklenecek
            
        elif signal in ["sell", "smart_sell"]:
            logger.info(f"📉 SELL sinyali işleniyor: {symbol}")
            send_discord_message(f"📉 **SELL SİNYALİ** - {symbol} işlem hazırlanıyor")
            # İşlem mantığı buraya eklenecek
            
        elif signal in ["tp1", "tp2", "tp3"]:
            logger.info(f"💰 Take Profit sinyali: {signal} {symbol}")
            send_discord_message(f"💰 **{signal.upper()}** - {symbol}")
            # TP mantığı buraya eklenecek
        
        # Başarılı işlem kaydı
        trade_limits.record_trade(symbol, is_successful=True)
        
        return jsonify({
            "status": "ok", 
            "message": "Webhook processed successfully",
            "signal": signal,
            "symbol": symbol,
            "user": active_trading_user
        })
        
    except Exception as e:
        error_msg = f"Webhook işleme hatası: {e}"
        logger.error(error_msg)
        send_discord_message(f"❌ **WEBHOOK HATASI** - {str(e)[:100]}")
        return jsonify({"status": "error", "message": str(e)}), 500

# API key yönetimi endpoint'i
@app.route('/api/keys', methods=['POST'])
def manage_api_keys():
    """API key'leri yönetir"""
    global active_trading_user
    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"status": "error", "message": "No data provided"}), 400
            
        user_id = data.get('user_id')
        api_key = data.get('api_key')
        secret_key = data.get('secret_key')
        action = data.get('action', 'connect')
        
        if not user_id:
            return jsonify({"status": "error", "message": "User ID required"}), 400
            
        if action == 'connect':
            if not api_key or not secret_key:
                return jsonify({"status": "error", "message": "API key and secret required"}), 400
                
            # API key formatını doğrula
            if len(api_key) < 40 or len(secret_key) < 40:
                return jsonify({"status": "error", "message": "Invalid API key format"}), 400
                
            # Binance bağlantısını test et
            try:
                test_client = UMFutures(key=api_key, secret=secret_key, base_url="https://testnet.binancefuture.com")
                account_info = test_client.account()
                if account_info:
                    # API key'leri kaydet
                    user_api_keys[user_id] = {
                        'api_key': api_key,
                        'secret_key': secret_key,
                        'connected_at': time.time(),
                        'status': 'active'
                    }
                    
                    active_trading_user = user_id
                    
                    logger.info(f"✅ User {user_id} API keys connected")
                    send_discord_message(f"🔑 **API BAĞLANTISI** - User {user_id}")
                    
                    return jsonify({
                        "status": "ok", 
                        "message": "API keys connected successfully",
                        "balance": account_info.get('totalWalletBalance', '0'),
                        "active_user": user_id
                    })
                else:
                    return jsonify({"status": "error", "message": "Invalid API credentials"}), 400
                    
            except Exception as e:
                logger.error(f"API key test failed: {e}")
                return jsonify({"status": "error", "message": f"API validation failed: {str(e)}"}), 400
                
        elif action == 'disconnect':
            if user_id in user_api_keys:
                del user_api_keys[user_id]
                
                if active_trading_user == user_id:
                    active_trading_user = None
                    if user_api_keys:
                        active_trading_user = list(user_api_keys.keys())[0]
                
                logger.info(f"🔓 User {user_id} API keys disconnected")
                send_discord_message(f"🔓 **API BAĞLANTI KESİLDİ** - User {user_id}")
                return jsonify({"status": "ok", "message": "API keys disconnected"})
            else:
                return jsonify({"status": "error", "message": "No API keys found"}), 404
                
        elif action == 'status':
            if user_id in user_api_keys:
                return jsonify({
                    "status": "ok",
                    "connected": True,
                    "api_key_preview": user_api_keys[user_id]['api_key'][:8] + "..." + user_api_keys[user_id]['api_key'][-8:],
                    "connected_at": user_api_keys[user_id]['connected_at']
                })
            else:
                return jsonify({"status": "ok", "connected": False})
                
        else:
            return jsonify({"status": "error", "message": "Invalid action"}), 400
            
    except Exception as e:
        logger.error(f"API key management error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Bot kontrol endpoint'leri
@app.route('/api/bot/start', methods=['POST'])
def start_bot():
    """Bot'u başlatır"""
    try:
        global bot_status, active_trading_user
        data = request.get_json(force=True) if request.data else {}
        user_id = data.get('user_id') if data else None
        
        # API key kontrolü
        if not user_api_keys:
            logger.warning("❌ Bot başlatılamaz - API key yok")
            return jsonify({
                "status": "error", 
                "message": "No API keys connected. Connect via website first.",
                "action_required": "Connect Binance API keys"
            }), 400
        
        if user_id and user_id not in user_api_keys:
            logger.warning(f"❌ User {user_id} API key bulunamadı")
            return jsonify({
                "status": "error", 
                "message": f"User {user_id} has no API keys connected.",
                "action_required": "Connect Binance API keys"
            }), 400
            
        if bot_status == "running":
            return jsonify({"status": "error", "message": "Bot is already running"}), 400
            
        # Aktif kullanıcıyı ayarla
        if user_id and user_id in user_api_keys:
            active_trading_user = user_id
            logger.info(f"✅ Aktif kullanıcı: {user_id}")
        elif user_api_keys:
            active_trading_user = list(user_api_keys.keys())[0]
            logger.info(f"✅ İlk kullanıcı aktif: {active_trading_user}")
        
        bot_status = "running"
        logger.info(f"🚀 Bot başlatıldı - User: {active_trading_user}")
        send_discord_message(f"🚀 **BOT BAŞLATILDI** - User: {active_trading_user}")
        
        return jsonify({
            "status": "ok",
            "message": "Bot started successfully",
            "bot_status": bot_status,
            "active_user": active_trading_user,
            "api_source": "website"
        })
        
    except Exception as e:
        logger.error(f"Bot start error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/bot/stop', methods=['POST'])
def stop_bot():
    """Bot'u durdurur"""
    try:
        global bot_status
        data = request.get_json(force=True) if request.data else {}
        user_id = data.get('user_id') if data else None
        
        if bot_status in ["stopped", "offline"]:
            return jsonify({"status": "error", "message": "Bot is already stopped"}), 400
            
        bot_status = "stopped"
        logger.info(f"⏹️ Bot durduruldu - User: {user_id}")
        send_discord_message(f"⏹️ **BOT DURDURULDU** - User: {user_id}")
        
        return jsonify({
            "status": "ok",
            "message": "Bot stopped successfully",
            "bot_status": bot_status
        })
        
    except Exception as e:
        logger.error(f"Bot stop error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/bot/status', methods=['GET'])
def get_bot_status():
    """Bot durumunu döndürür"""
    try:
        positions = get_open_positions()
        open_positions_count = len(positions)
        
        today = trade_limits.get_today_key()
        daily_trades = trade_limits.daily_trades.get(today, {})
        total_daily_trades = sum(daily_trades.values()) if daily_trades else 0
        
        return jsonify({
            "status": "ok",
            "bot_status": bot_status,
            "open_positions": open_positions_count,
            "daily_trades": total_daily_trades,
            "connected_users": len(user_api_keys),
            "active_user": active_trading_user,
            "uptime": "Running" if bot_status == "running" else "Stopped"
        })
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

# Sağlık kontrol endpoint'i
@app.route('/health', methods=['GET'])
def health_check():
    """Railway health check endpoint'i"""
    return jsonify({
        "status": "healthy",
        "bot_status": bot_status,
        "connected_users": len(user_api_keys),
        "timestamp": datetime.datetime.utcnow().isoformat()
    })

# Ana çalıştırma
if __name__ == "__main__":
    port = int(os.environ.get('PORT', 5000))
    logger.info(f"🚀 Webhook server başlatılıyor - Port: {port}")
    app.run(host='0.0.0.0', port=port, debug=False) 