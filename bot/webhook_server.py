from flask import Flask, request, jsonify
import json
import os
import math  # Added import for math functions
try:
    from api_keyler import API_KEY, API_SECRET, DISCORD_TOKEN, DISCORD_CHANNEL_ID, DISCORD_WEBHOOK_URL, USE_TESTNET, DEFAULT_SYMBOL
except ImportError:
    import os
    API_KEY = os.environ.get("BINANCE_API_KEY")
    API_SECRET = os.environ.get("BINANCE_API_SECRET")
    DISCORD_TOKEN = os.environ.get("DISCORD_TOKEN")
    DISCORD_CHANNEL_ID = os.environ.get("DISCORD_CHANNEL_ID")
    DISCORD_WEBHOOK_URL = os.environ.get("DISCORD_WEBHOOK_URL")
    USE_TESTNET = os.environ.get("USE_TESTNET", "True")
    DEFAULT_SYMBOL = os.environ.get("DEFAULT_SYMBOL", "BTCUSDT")

from binance.um_futures import UMFutures
import logging
import requests
import datetime
import math
import time

# İşlem istatistikleri modülünü içe aktar
from trade_stats import TradeStats

# İstatistik yöneticisini başlat
trade_stats = TradeStats()

# İşlem limitleri ve başarısız işlem takibi için sınıf
class TradingLimits:
    def __init__(self):
        self.daily_trades = {}  # Günlük işlem sayısı
        self.failed_trades = {}  # Başarısız işlem sayısı
        self.daily_pnl = {}     # Günlük kar/zarar
        self.trade_blocked_symbols = set()  # İşlem engellenen semboller
        self.max_failed_trades = 3  # Maksimum başarısız işlem sayısı (günlük)
        self.max_daily_trades = 10  # Günlük maksimum işlem sayısı
        self.max_open_positions = 5  # Maksimum açık pozisyon sayısı
        
    def reset_daily_stats(self):
        """Her gün başında istatistikleri sıfırlar"""
        today = datetime.datetime.now().strftime('%Y-%m-%d')
        self.daily_trades[today] = {}
        self.failed_trades[today] = {}
        self.daily_pnl[today] = {}
        self.trade_blocked_symbols = set()
        logger.info("Günlük işlem istatistikleri sıfırlandı.")
        
    def get_today_key(self):
        """Bugünün tarih anahtarını döndürür"""
        return datetime.datetime.now().strftime('%Y-%m-%d')
        
    def record_trade(self, symbol, is_successful=True, profit_loss=None):
        """İşlemi kaydeder ve limitleri kontrol eder"""
        today = self.get_today_key()
        
        # Bugünün kayıtlarını hazırla
        if today not in self.daily_trades:
            self.daily_trades[today] = {}
        
        if today not in self.failed_trades:
            self.failed_trades[today] = {}
            
        if today not in self.daily_pnl:
            self.daily_pnl[today] = {}
            
        # Sembol için kayıtları hazırla
        if symbol not in self.daily_trades[today]:
            self.daily_trades[today][symbol] = 0
            
        if symbol not in self.failed_trades[today]:
            self.failed_trades[today][symbol] = 0
            
        if symbol not in self.daily_pnl[today]:
            self.daily_pnl[today][symbol] = 0
            
        # İşlemi kaydet
        self.daily_trades[today][symbol] += 1
        
        # Başarısız işlem ise sayacı artır
        if not is_successful:
            self.failed_trades[today][symbol] += 1
            
            # Maksimum başarısız işlem sayısına ulaşıldı mı kontrol et
            if self.failed_trades[today][symbol] >= self.max_failed_trades:
                self.trade_blocked_symbols.add(symbol)
                logger.warning(f"{symbol} için bugün {self.max_failed_trades} kez başarısız işlem yapıldı, işlemler engellendi.")
                send_discord_message(f"⛔️ **İŞLEM ENGELLENDİ** - {symbol} için bugün {self.max_failed_trades} başarısız işlem nedeniyle daha fazla işlem yapılmayacak.")
        
        # Kar/zarar kaydı
        if profit_loss is not None:
            self.daily_pnl[today][symbol] += profit_loss
            
        logger.info(f"İşlem kaydedildi: {symbol}, Başarı: {is_successful}, Günlük İşlem: {self.daily_trades[today][symbol]}, Başarısız: {self.failed_trades[today][symbol]}")
        
    def can_trade(self, symbol):
        """Sembol için işlem yapılabilir mi kontrol eder"""
        today = self.get_today_key()
        
        # Sembol engellenmişse işlem yapılamaz
        if symbol in self.trade_blocked_symbols:
            logger.info(f"{symbol} için işlemler engellenmiş durumda (başarısız işlem limiti).")
            return False
            
        # Günlük işlem limiti kontrolü
        if today in self.daily_trades and symbol in self.daily_trades[today]:
            if self.daily_trades[today][symbol] >= self.max_daily_trades:
                logger.info(f"{symbol} için günlük maksimum işlem sayısına ({self.max_daily_trades}) ulaşıldı.")
                return False
                
        # Açık pozisyon sayısı kontrolü
        open_positions = len(get_open_positions())
        if open_positions >= self.max_open_positions:
            logger.info(f"Maksimum açık pozisyon sayısına ({self.max_open_positions}) ulaşıldı.")
            return False
            
        return True

# İşlem limitleri nesnesi oluştur
trade_limits = TradingLimits()

# Kullanıcı API key'leri için basit veritabanı (production'da gerçek DB kullanın)
user_api_keys = {}

# Aktif trading kullanıcısı
active_trading_user = None

# Bot durumu takibi
bot_status = "offline"  # offline, running, stopped

# Loglama sistemini ayarla
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("bot_logs.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("trade_bot")

# Flask uygulamasını oluştur
app = Flask(__name__)

# Flask CORS desteği için
from flask_cors import CORS
CORS(app, origins=["https://sivilabdullah.github.io", "http://localhost:3000", "http://127.0.0.1:5500"])

# Her gün başlangıcında istatistikleri sıfırlamak için
def reset_daily_stats():
    """Her gün başında çalıştırılacak fonksiyon"""
    trade_limits.reset_daily_stats()
    logger.info("Günlük işlem istatistikleri sıfırlandı.")

def get_active_client():
    """
    Aktif kullanıcının API key'leriyle Binance client'ı döndürür
    """
    global active_trading_user
    
    # Aktif trading kullanıcısı varsa onun API key'lerini kullan
    if active_trading_user and active_trading_user in user_api_keys:
        user_keys = user_api_keys[active_trading_user]
        try:
            client = UMFutures(
                key=user_keys['api_key'], 
                secret=user_keys['secret_key'], 
                base_url="https://testnet.binancefuture.com"
            )
            logger.info(f"Aktif kullanıcı client'ı kullanılıyor: {active_trading_user}")
            return client
        except Exception as e:
            logger.error(f"Aktif kullanıcı client'ı oluşturulamadı: {e}")
            
    # Herhangi bir kullanıcının API key'leri varsa onu kullan
    if user_api_keys:
        for user_id, user_keys in user_api_keys.items():
            try:
                client = UMFutures(
                    key=user_keys['api_key'], 
                    secret=user_keys['secret_key'], 
                    base_url="https://testnet.binancefuture.com"
                )
                logger.info(f"Fallback kullanıcı client'ı kullanılıyor: {user_id}")
                return client
            except Exception as e:
                logger.error(f"User {user_id} client'ı oluşturulamadı: {e}")
                continue
    
    # Son çare olarak default API key'leri kullan (eğer varsa)
    if API_KEY and API_SECRET:
        logger.warning("Default API key'ler kullanılıyor - web sitesi API key'leri bulunamadı")
        return UMFutures(key=API_KEY, secret=API_SECRET, base_url="https://testnet.binancefuture.com")
    
    logger.error("Hiçbir geçerli API key bulunamadı!")
    return None

# Binance Client'ı dinamik olarak al
client = get_active_client()

def send_discord_message(content):
    """
    Discord webhook'una mesaj gönderir
    """
    try:
        webhook_url = DISCORD_WEBHOOK_URL
        data = {"content": content}
        response = requests.post(webhook_url, json=data)
        logger.info(f"Discord mesajı gönderildi: {content[:50]}...")
        return response
    except Exception as e:
        logger.error(f"Discord mesajı gönderme hatası: {e}")
        return None

def get_open_positions(symbol=None):
    """
    Açık pozisyonları getirir
    """
    try:
        # Aktif client'ı al
        active_client = get_active_client()
        if not active_client:
            logger.error("Hiçbir aktif client bulunamadı - pozisyonlar alınamıyor")
            return []
            
        # Doğru metod adı: get_position_risk
        positions = active_client.get_position_risk()
        # Eğer belirli bir sembol için filtreleme isteniyorsa
        if symbol:
            positions = [p for p in positions if p['symbol'] == symbol and float(p['positionAmt']) != 0]
        else:
            positions = [p for p in positions if float(p['positionAmt']) != 0]
        
        logger.info(f"Açık pozisyonlar alındı: {len(positions)} adet")
        return positions
    except Exception as e:
        logger.error(f"Pozisyon bilgisi alma hatası: {e}")
        return []

# Re-entry sistemi için global değişkenler
reentry_status = {}  # Her sembol için yeniden giriş durumu

def initialize_reentry_status(symbol):
    """
    Sembol için yeniden giriş durumunu başlatır
    """
    if symbol not in reentry_status:
        reentry_status[symbol] = {
            "waiting_for_reentry": False,  # Yeniden giriş bekleniyor mu?
            "last_position_side": None,    # Son pozisyonun yönü (BUY/SELL)
            "last_position_time": None,    # Son pozisyonun kapanma zamanı
            "reentry_attempts": 0,         # Yeniden giriş deneme sayısı
            "tp3_price": None,             # TP3 seviyesinde kapanış fiyatı
        }
    return reentry_status[symbol]

def set_waiting_for_reentry(symbol, position_side):
    """
    TP3 sonrası yeniden giriş bekleme durumunu ayarlar
    """
    status = initialize_reentry_status(symbol)
    status["waiting_for_reentry"] = True
    status["last_position_side"] = position_side
    status["last_position_time"] = time.time()
    status["reentry_attempts"] = 0
    
    # Pozisyon bilgilerini al (TP3 fiyatı için)
    positions = get_open_positions(symbol)
    if positions:
        status["tp3_price"] = float(positions[0]['entryPrice'])
    
    logger.info(f"Re-entry bekleniyor: {symbol} {position_side}")
    send_discord_message(f"🔄 **RE-ENTRY BEKLENİYOR** - {symbol} için {position_side} yönünde yeni sinyal bekleniyor")

def check_reentry_conditions(symbol, signal):
    """
    Re-entry koşullarını kontrol eder ve uygunsa True döner
    """
    status = initialize_reentry_status(symbol)
    
    # Re-entry beklenmiyor veya son işlem çok eskiyse
    if not status["waiting_for_reentry"]:
        return False
    
    # Son pozisyon kapanışından beri geçen süre (saat)
    hours_since_last_position = (time.time() - status["last_position_time"]) / 3600
    
    # 15 dakikalık mumlar için 4 saat bekle (24 saat yerine)
    if hours_since_last_position > 4:
        status["waiting_for_reentry"] = False
        logger.info(f"Re-entry iptal edildi (zaman aşımı): {symbol}")
        return False
    
    # Son pozisyon yönü ile gelen sinyal uyumlu mu?
    expected_signal = status["last_position_side"].lower()
    if signal.replace("smart_", "") != expected_signal:
        return False
    
    # Maksimum 3 yeniden giriş denemesi
    if status["reentry_attempts"] >= 3:
        status["waiting_for_reentry"] = False
        logger.info(f"Re-entry iptal edildi (maksimum deneme sayısı): {symbol}")
        return False
    
    return True

def perform_reentry(symbol, signal, atr_value=None):
    """
    Re-entry işlemini gerçekleştirir
    """
    status = initialize_reentry_status(symbol)
    side = "BUY" if signal in ["buy", "smart_buy"] else "SELL"
    
    # Deney sayısını artır
    status["reentry_attempts"] += 1
    
    logger.info(f"Re-entry gerçekleştiriliyor: {symbol} {side} (Deneme: {status['reentry_attempts']})")
    
    # İşlemi gerçekleştir
    quantity = calculate_position_size(symbol)
    send_binance_order(symbol, side, quantity, atr_value=atr_value)

def send_binance_order(symbol, side, quantity, order_type="MARKET", atr_value=None, risk_percentage=1.0, check_trend=False):
    """
    Binance'de işlem emri oluşturur
    
    Args:
        symbol (str): İşlem sembolü
        side (str): İşlem yönü (BUY/SELL)
        quantity (float): İşlem miktarı
        order_type (str): Emir tipi (MARKET, LIMIT vs.)
        atr_value (float, optional): ATR değeri
        risk_percentage (float): Risk yüzdesi
        check_trend (bool): Trend kontrolü yapılsın mı
    
    Returns:
        dict: Emir sonucu
    """
    try:
        # Aktif client'ı al
        active_client = get_active_client()
        if not active_client:
            logger.error("Hiçbir aktif client bulunamadı - API key'ler yapılandırılmamış")
            send_discord_message("⚠️ **HATA** - API key'ler yapılandırılmamış")
            return None
            
        # Miktar kontrolü
        if quantity <= 0:
            logger.error(f"Geçersiz işlem miktarı: {quantity}")
            send_discord_message(f"⚠️ **HATA** - {symbol} için geçersiz işlem miktarı: {quantity}")
            return None
            
        # İşlemi oluştur
        order = active_client.new_order(
            symbol=symbol,
            side=side,
            type=order_type,
            quantity=quantity
        )
        
        # Başarılı işlem
        if order:
            action = "ALIŞ" if side == "BUY" else "SATIŞ"
            logger.info(f"İşlem emri oluşturuldu: {symbol} {side} {quantity} (User: {active_trading_user})")
            send_discord_message(f"✅ **{action} EMRİ** - {symbol}: {quantity} miktar (User: {active_trading_user})")
            
            # İşlem istatistiklerini kaydet
            trade_limits.record_trade(symbol, is_successful=True)
            
            return order
        else:
            logger.error(f"İşlem emri başarısız: {symbol} {side} {quantity}")
            send_discord_message(f"❌ **İŞLEM BAŞARISIZ** - {symbol} {side} emri oluşturulamadı")
            
            # Başarısız işlemi kaydet
            trade_limits.record_trade(symbol, is_successful=False)
            
            return None
    except Exception as e:
        logger.error(f"İşlem emri hatası: {e}")
        send_discord_message(f"❌ **İŞLEM HATASI** - {symbol} {side}: {str(e)}")
        
        # Başarısız işlemi kaydet
        trade_limits.record_trade(symbol, is_successful=False)
        
        return None
        
def reverse_position(symbol, side, atr_value=None):
    """
    Mevcut pozisyonu tersine çevirir
    """
    try:
        positions = get_open_positions(symbol)
        if not positions:
            logger.warning(f"Tersine çevrilecek pozisyon bulunamadı: {symbol}")
            return False
            
        position = positions[0]
        position_amt = float(position['positionAmt'])
        
        # Pozisyonu kapat
        close_result = close_position(symbol, position['positionAmt'])
        if not close_result:
            logger.error(f"Pozisyon kapatma başarısız, tersine çevirme işlemi iptal edildi: {symbol}")
            return False
        
        # Pozisyon yönünü belirle
        old_position_side = "LONG" if position_amt > 0 else "SHORT"
        new_position_side = "LONG" if side == "BUY" else "SHORT"
        
        # Yeni işlemi aç
        quantity = calculate_position_size(symbol)
        order = send_binance_order(symbol, side, quantity, atr_value=atr_value)
        
        if order:
            logger.info(f"Pozisyon tersine çevrildi: {symbol} {old_position_side} -> {new_position_side}")
            send_discord_message(f"🔄 **POZİSYON DEĞİŞİMİ** - {symbol}: {old_position_side} -> {new_position_side}")
            return True
        else:
            logger.error(f"Pozisyon tersine çevirme başarısız: {symbol}")
            return False
    except Exception as e:
        logger.error(f"Pozisyon tersine çevirme hatası: {e}")
        return False

def close_position(symbol, position_amt):
    """
    Pozisyonu kapatır
    """
    try:
        # Aktif client'ı al
        active_client = get_active_client()
        if not active_client:
            logger.error("Hiçbir aktif client bulunamadı - pozisyon kapatılamıyor")
            return False
            
        # Pozisyon miktarına göre kapatma yönü belirle
        position_amt = float(position_amt)
        close_side = "SELL" if position_amt > 0 else "BUY"
        close_quantity = abs(position_amt)
        
        # İşlemi oluştur
        order = active_client.new_order(
            symbol=symbol,
            side=close_side,
            type="MARKET",
            quantity=close_quantity
        )
        
        if order:
            logger.info(f"Pozisyon kapatıldı: {symbol} {close_side} {close_quantity}")
            send_discord_message(f"📊 **POZİSYON KAPATILDI** - {symbol}: {close_quantity} miktar")
            return True
        else:
            logger.error(f"Pozisyon kapatma başarısız: {symbol}")
            return False
    except Exception as e:
        logger.error(f"Pozisyon kapatma hatası: {e}")
        return False

def take_partial_profit(symbol, percentage, tp_level):
    """
    Kısmi kar alma işlemi gerçekleştirir
    
    Args:
        symbol (str): İşlem sembolü
        percentage (float): Kapatılacak pozisyon yüzdesi
        tp_level (int): Kar alma seviyesi (1, 2, 3)
    """
    try:
        # Aktif client'ı al
        active_client = get_active_client()
        if not active_client:
            logger.error("Hiçbir aktif client bulunamadı - kar alma işlemi yapılamıyor")
            return False
            
        positions = get_open_positions(symbol)
        if not positions:
            logger.warning(f"Kar alınacak pozisyon bulunamadı: {symbol}")
            return False
            
        position = positions[0]
        position_amt = float(position['positionAmt'])
        close_side = "SELL" if position_amt > 0 else "BUY"
        
        # Kapatılacak miktar
        close_amount = abs(position_amt) * (percentage / 100)
        
        # Sembol için lot precision bilgisini al
        symbol_info = next((s for s in active_client.exchange_info()['symbols'] if s['symbol'] == symbol), None)
        quantity_precision = 5  # Varsayılan değer
        
        if symbol_info:
            quantity_precision = symbol_info['quantityPrecision']
            
        close_amount = round(close_amount, quantity_precision)
        
        # İşlemi oluştur
        order = active_client.new_order(
            symbol=symbol,
            side=close_side,
            type="MARKET",
            quantity=close_amount
        )
        
        if order:
            logger.info(f"TP{tp_level} gerçekleştirildi: {symbol} {close_side} {close_amount}")
            send_discord_message(f"💰 **TP{tp_level}** - {symbol}: %{percentage} pozisyon kapatıldı")
            return True
        else:
            logger.error(f"Kar alma işlemi başarısız: {symbol}")
            return False
    except Exception as e:
        logger.error(f"Kar alma hatası: {e}")
        return False

def calculate_position_size(symbol, account_balance=None, risk_percentage=1.0, sl_distance_percentage=None):
    """
    Risk yönetimine dayalı pozisyon büyüklüğünü hesaplar.
    
    Args:
        symbol: İşlem sembolü
        account_balance: Hesap bakiyesi (varsa)
        risk_percentage: Riske edilecek bakiye yüzdesi (varsayılan %1)
        sl_distance_percentage: Stop-loss mesafesi yüzdesi (varsa)
        
    Returns:
        float: Hesaplanan pozisyon büyüklüğü (lot cinsinden)
    """
    try:
        # Aktif client'ı al
        active_client = get_active_client()
        if not active_client:
            logger.error("Hiçbir aktif client bulunamadı - pozisyon büyüklüğü hesaplanamıyor")
            return 0.01  # Güvenli varsayılan değer
            
        # Sembol fiyat bilgisini al
        ticker = active_client.ticker_price(symbol=symbol)
        current_price = float(ticker['price'])
        
        # Basitleştirilmiş pozisyon büyüklüğü hesaplama
        # Minimum 25 USDT değerinde işlem (güvenli miktar)
        min_notional = 25.0
        position_size_in_coins = min_notional / current_price
        
        # Sembol için precision bilgisini al
        try:
            symbol_info = next((s for s in active_client.exchange_info()['symbols'] if s['symbol'] == symbol), None)
            if symbol_info:
                quantity_precision = symbol_info['quantityPrecision']
                position_size_in_coins = round(position_size_in_coins, quantity_precision)
        except Exception as e:
            logger.warning(f"Symbol info alınamadı, varsayılan precision kullanılıyor: {e}")
            position_size_in_coins = round(position_size_in_coins, 5)
        
        # Sıfır kontrolü ve minimum değer garantisi
        if position_size_in_coins <= 0:
            if symbol in ["SOLUSDT"]:
                position_size_in_coins = 0.15  # SOLUSDT için özel değer
            else:
                position_size_in_coins = 0.01  # Diğer coinler için minimum değer
            logger.warning(f"Pozisyon büyüklüğü çok düşük, minimum değer kullanılıyor: {symbol} - {position_size_in_coins}")
        
        # Final kontrol: notional değer kontrolü
        notional_value = position_size_in_coins * current_price
        if notional_value < min_notional:
            # Minimum notional'ı sağlayacak şekilde artır
            position_size_in_coins = (min_notional * 1.1) / current_price  # %10 pay ekle
            if symbol in ["SOLUSDT"] and position_size_in_coins < 0.15:
                position_size_in_coins = 0.15
            elif position_size_in_coins < 0.01:
                position_size_in_coins = 0.01
                
        logger.info(f"Basitleştirilmiş pozisyon hesaplandı: {symbol} - Fiyat: {current_price} USDT, Miktar: {position_size_in_coins}, Notional: {position_size_in_coins * current_price:.2f} USDT")
        return position_size_in_coins
    
    except Exception as e:
        logger.error(f"Pozisyon büyüklüğü hesaplama hatası: {e}")
        # Hata durumunda güvenli varsayılan değerler
        if symbol in ["SOLUSDT"]:
            return 0.15
        else:
            return 0.01

def analyze_market_trend(symbol):
    """
    Sembol için piyasa trendini analiz eder (DEAKTİF EDİLMİŞ)
    
    Returns:
        dict: Trend bilgisi içeren dictionary
            - status: Her zaman "neutral" olarak döner (deaktif edilmiş)
            - score: Her zaman 0 olarak döner (deaktif edilmiş)
    """
    logger.info(f"Trend analizi devre dışı bırakılmış: {symbol}")
    return {
        "status": "neutral",
        "score": 0,
        "changes": {
            "4h": 0,
            "12h": 0,
            "24h": 0
        }
    }

def is_trade_aligned_with_trend(symbol, direction, min_score=0.2):
    """
    İşlem yönünün mevcut trend ile uyumlu olup olmadığını kontrol eder (DEAKTİF EDİLMİŞ)
    
    Args:
        symbol (str): İşlem sembolü
        direction (str): İşlem yönü ("buy" veya "sell")
        min_score (float): Minimum trend skoru eşiği (default: 0.2)
        
    Returns:
        bool: Her zaman True döner (deaktif edilmiş)
    """
    logger.info(f"Trend kontrolü devre dışı bırakılmış: {symbol}")
    return True  # Her zaman işlemi onayla

@app.route('/webhook', methods=['POST'])
def webhook():
    try:
        # Bot durumu kontrolü - Bot çalışmıyorsa sinyalleri işleme
        global bot_status
        if bot_status != "running":
            logger.warning(f"Bot durumu: {bot_status} - Sinyal işlenmedi")
            send_discord_message(f"⚠️ **BOT PASİF** - Bot çalışmıyor, sinyal işlenmedi. Bot durumu: {bot_status}")
            return jsonify({"status": "error", "message": f"Bot is not running. Current status: {bot_status}"}), 400
        
        # Aktif trading kullanıcısı kontrolü
        if not active_trading_user or active_trading_user not in user_api_keys:
            logger.warning("Aktif trading kullanıcısı bulunamadı veya API key'ler eksik")
            send_discord_message("⚠️ **API HATA** - Aktif kullanıcı veya API key'ler bulunamadı")
            return jsonify({"status": "error", "message": "No active trading user or API keys not configured"}), 400
        
        # Ham veriyi al ve Content-Type'ı kontrol et
        content_type = request.content_type
        raw_data = request.data.decode('utf-8')
        logger.info(f"Content-Type: {content_type}")
        logger.info(f"Alınan ham veri: {raw_data[:100]}...")
        
        data = None
        
        # TradingView'dan gelen farklı format desteği
        try:
            # 1. JSON Content-Type kontrolü
            if content_type and 'application/json' in content_type:
                data = request.json
                if not data:
                    raise ValueError("Empty JSON data")
                logger.info("JSON formatında veri alındı")
                
            # 2. Form-data veya diğer Content-Type'lar için
            elif request.form:
                # Form verisi var ise, ilk değeri JSON olarak parse et
                form_data = dict(request.form)
                logger.info(f"Form data alındı: {form_data}")
                
                # İlk form field'ını JSON olarak parse etmeye çalış
                first_key = list(form_data.keys())[0] if form_data else None
                if first_key:
                    try:
                        data = json.loads(first_key)
                        logger.info("Form data JSON olarak parse edildi")
                    except:
                        # Form data'yı direkt kullan
                        data = form_data
                        logger.info("Form data direkt kullanıldı")
                        
            # 3. Raw data'dan JSON parse etme (TradingView alert() formatı)
            elif 'alert(' in raw_data or '{' in raw_data:
                try:
                    # alert('{ ... }', alert.freq_once_per_bar_close) formatını algıla
                    if 'alert(' in raw_data:
                        start_index = raw_data.find('{')
                        end_index = raw_data.rfind('}')
                        if start_index != -1 and end_index != -1:
                            json_str = raw_data[start_index:end_index+1]
                            logger.info(f"Alert formatından JSON ayıklandı: {json_str[:100]}...")
                            data = json.loads(json_str)
                        else:
                            raise ValueError("JSON yapısı bulunamadı")
                    else:
                        # Direkt JSON parse et
                        data = json.loads(raw_data)
                        logger.info("Raw data JSON olarak parse edildi")
                except Exception as e:
                    logger.error(f"JSON parse hatası: {e}")
                    return jsonify({"status": "error", "message": f"JSON parse error: {str(e)}"}), 400
                    
            # 4. URL-encoded data kontrolü
            elif request.values:
                data = dict(request.values)
                logger.info(f"URL-encoded data alındı: {data}")
                
            else:
                logger.error(f"Desteklenmeyen veri formatı. Content-Type: {content_type}, Raw data: {raw_data[:200]}")
                return jsonify({"status": "error", "message": "Unsupported data format"}), 400
                
        except Exception as e:
            logger.error(f"Veri işleme hatası: {e}")
            return jsonify({"status": "error", "message": f"Data processing error: {str(e)}"}), 400
        
        # Data boş mu kontrolü
        if not data:
            logger.error("Hiçbir veri alınamadı")
            return jsonify({"status": "error", "message": "No data received"}), 400
            
        logger.info(f"İşlenmiş data: {data}")
        
        # Gerekli alanları kontrol et
        if not all(key in data for key in ['signal', 'symbol']):
            logger.error(f"Eksik alanlar. Mevcut alanlar: {list(data.keys())}")
            return jsonify({"status": "error", "message": "Missing required fields: signal, symbol"}), 400
            
        # Verileri çıkar
        signal = data['signal']
        symbol = data['symbol']
        price = data.get('price', '0')
        atr = data.get('atr', None)  # ATR değeri (opsiyonel)
        risk_percentage = float(data.get('risk', 1.0))  # Risk yüzdesi (varsayılan %1)
        
        logger.info(f"Webhook sinyali alındı: {signal} {symbol} {price} ATR: '{atr}' Risk: %{risk_percentage} (User: {active_trading_user})")
        
        # İşlem limitlerini kontrol et
        if not trade_limits.can_trade(symbol):
            logger.warning(f"{symbol} için işlem limitleri aşıldı veya işlemler engellendi.")
            send_discord_message(f"⛔️ **İŞLEM ENGELLENDİ** - {symbol} için işlem limitleri veya başarısız işlem sayısı nedeniyle işlem yapılamaz.")
            return jsonify({"status": "error", "message": "Trading limits exceeded"}), 429
        
        # Trend analizi yap - her işlem için trend analizi yap ama sadece smart_ işlemlerde kontrolü zorunlu tut
        trend_info = analyze_market_trend(symbol)
        trend_status = trend_info["status"]
        trend_score = trend_info["score"]
        
        # Trend bilgisini Discord'a gönder
        send_discord_message(f"📊 **TREND ANALİZİ** - {symbol}: {trend_status} (Skor: {trend_score:.2f})")
        
        # Smart sinyaller için trend kontrolünü zorunlu tut
        check_trend = False
        if signal.startswith("smart_"):
            check_trend = True
            # Trend yönü ile işlem yönü uyumsuz mu?
            expected_direction = "buy" if signal == "smart_buy" else "sell"
            if not is_trade_aligned_with_trend(symbol, expected_direction, min_score=0.2):
                logger.info(f"{signal} sinyali trend ile uyumsuz, işlem engellendi.")
                send_discord_message(f"⛔️ **İŞLEM ENGELLENDİ** - {symbol} için {signal} sinyali, mevcut trend ile uyumsuz!")
                
                # Başarısız işlemi kaydet
                trade_limits.record_trade(symbol, is_successful=False)
                return jsonify({"status": "error", "message": "Signal not aligned with trend"}), 400
        
        # Re-entry kontrolü
        if check_reentry_conditions(symbol, signal):
            logger.info(f"Re-entry koşulları sağlandı: {symbol} {signal}")
            send_discord_message(f"🔄 **RE-ENTRY BAŞLATILIYOR** - {symbol} için {signal} sinyali")
            perform_reentry(symbol, signal, atr)
        
        # Sinyale göre Binance işlemi başlat
        if signal in ["buy", "smart_buy"]:
            # Eğer trend skoru oldukça düşükse uyarı gönder ama işlemi engelleme
            if trend_score < -0.5:
                send_discord_message(f"⚠️ **TREND UYARISI** - {symbol} için yükseliş sinyali, ancak düşüş trendi var! Dikkatli olun.")
            
            # Mevcut pozisyonları kontrol et, gerekirse tersine çevir
            positions = get_open_positions(symbol)
            if positions and float(positions[0]['positionAmt']) < 0:  # Short pozisyon açıksa
                reverse_position(symbol, "BUY", atr)
            else:
                # Risk yönetimine dayalı işlem miktarı hesapla
                quantity = calculate_position_size(symbol, risk_percentage=risk_percentage)
                send_binance_order(symbol, "BUY", quantity=quantity, atr_value=atr, risk_percentage=risk_percentage, check_trend=check_trend)
                
        elif signal in ["sell", "smart_sell"]:
            # Eğer trend skoru oldukça yüksekse uyarı gönder ama işlemi engelleme
            if trend_score > 0.5:
                send_discord_message(f"⚠️ **TREND UYARISI** - {symbol} için düşüş sinyali, ancak yükseliş trendi var! Dikkatli olun.")
            
            # Mevcut pozisyonları kontrol et, gerekirse tersine çevir
            positions = get_open_positions(symbol)
            if positions and float(positions[0]['positionAmt']) > 0:  # Long pozisyon açıksa
                reverse_position(symbol, "SELL", atr)
            else:
                # Risk yönetimine dayalı işlem miktarı hesapla
                quantity = calculate_position_size(symbol, risk_percentage=risk_percentage)
                send_binance_order(symbol, "SELL", quantity=quantity, atr_value=atr, risk_percentage=risk_percentage, check_trend=check_trend)
        
        # TP sinyalleri için kar al işlemleri
        elif signal == "tp1":
            take_partial_profit(symbol, 33.33, 1)  # Pozisyonun 1/3'ünü kapat
        elif signal == "tp2":
            take_partial_profit(symbol, 50, 2)     # Kalan pozisyonun yarısını kapat
        elif signal == "tp3":
            # Tüm pozisyonu kapat
            positions = get_open_positions(symbol)
            if positions:
                position_side = "BUY" if float(positions[0]['positionAmt']) > 0 else "SELL"
                position_amt = positions[0]['positionAmt']
                
                # Pozisyonu kapat
                result = close_position(symbol, position_amt)
                
                # İşlem başarılı ise istatistikleri güncelle
                if result:
                    try:
                        # Kar/zarar bilgisini hesapla
                        entry_price = float(positions[0]['entryPrice'])
                        mark_price = float(positions[0]['markPrice'])
                        position_size = abs(float(position_amt))
                        
                        if position_side == "BUY":  # Long
                            profit_loss = (mark_price - entry_price) * position_size
                        else:  # Short
                            profit_loss = (entry_price - mark_price) * position_size
                        
                        # İşlem limitlerini güncelle
                        trade_limits.record_trade(symbol, is_successful=True, profit_loss=profit_loss)
                        
                        # İşlem başarılı mı değil mi?
                        is_profitable = profit_loss > 0
                        if is_profitable:
                            send_discord_message(f"💰 **KARLI İŞLEM KAPATILDI** - {symbol}: {profit_loss:.2f} USDT kar")
                        else:
                            send_discord_message(f"📉 **ZARARLI İŞLEM KAPATILDI** - {symbol}: {profit_loss:.2f} USDT zarar")
                    except Exception as e:
                        logger.error(f"İşlem sonucu hesaplama hatası: {e}")
            
        return jsonify({"status": "ok"})
    except Exception as e:
        error_msg = f"Webhook işleme hatası: {e}"
        logger.error(error_msg)
        return jsonify({"status": "error", "message": str(e)}), 500

# Yeni API endpoint'leri - Web sitesi entegrasyonu için

@app.route('/api/keys', methods=['POST'])
def manage_api_keys():
    """API key'leri yönetir - web sitesinden gelen istekleri işler"""
    global active_trading_user
    try:
        data = request.json
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
                
            # API key formatını doğrula (esnek format)
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
                    
                    # Bu kullanıcıyı aktif trading kullanıcısı olarak ayarla
                    active_trading_user = user_id
                    
                    # Global client'ı güncelle (geriye uyumluluk için)
                    global client
                    client = test_client
                    
                    logger.info(f"User {user_id} API keys connected successfully and set as active trading user")
                    send_discord_message(f"🔑 **API BAĞLANTISI** - Kullanıcı {user_id} API key'lerini başarıyla bağladı ve aktif kullanıcı oldu")
                    
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
                return jsonify({"status": "error", "message": f"API key validation failed: {str(e)}"}), 400
                
        elif action == 'disconnect':
            if user_id in user_api_keys:
                del user_api_keys[user_id]
                
                # Eğer aktif kullanıcı disconnect ediyorsa, aktif kullanıcıyı temizle
                if active_trading_user == user_id:
                    active_trading_user = None
                    # Başka bir kullanıcı varsa onu aktif yap
                    if user_api_keys:
                        active_trading_user = list(user_api_keys.keys())[0]
                        logger.info(f"Active trading user switched to: {active_trading_user}")
                
                logger.info(f"User {user_id} API keys disconnected")
                send_discord_message(f"🔓 **API BAĞLANTI KESİLDİ** - Kullanıcı {user_id} API bağlantısını kesti")
                return jsonify({"status": "ok", "message": "API keys disconnected"})
            else:
                return jsonify({"status": "error", "message": "No API keys found for user"}), 404
                
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

@app.route('/api/bot/start', methods=['POST'])
def start_bot():
    """Bot'u başlatır"""
    try:
        global bot_status, active_trading_user
        data = request.json
        user_id = data.get('user_id') if data else None
        
        # API key'lerin bağlı olup olmadığını kontrol et
        if user_id and user_id not in user_api_keys:
            return jsonify({"status": "error", "message": "API keys not configured"}), 400
            
        if bot_status == "running":
            return jsonify({"status": "error", "message": "Bot is already running"}), 400
            
        # Aktif trading kullanıcısını ayarla
        if user_id and user_id in user_api_keys:
            active_trading_user = user_id
            logger.info(f"Active trading user set to: {user_id}")
        
        bot_status = "running"
        logger.info(f"Bot started by user {user_id}")
        send_discord_message(f"🚀 **BOT BAŞLATILDI** - Kullanıcı {user_id} tarafından bot aktif edildi")
        
        return jsonify({
            "status": "ok",
            "message": "Bot started successfully",
            "bot_status": bot_status,
            "active_user": active_trading_user
        })
        
    except Exception as e:
        logger.error(f"Bot start error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/bot/stop', methods=['POST'])
def stop_bot():
    """Bot'u durdurur"""
    try:
        global bot_status
        data = request.json
        user_id = data.get('user_id') if data else None
        
        if bot_status == "stopped" or bot_status == "offline":
            return jsonify({"status": "error", "message": "Bot is already stopped"}), 400
            
        bot_status = "stopped"
        logger.info(f"Bot stopped by user {user_id}")
        send_discord_message(f"⏹️ **BOT DURDURULDU** - Kullanıcı {user_id} tarafından bot durduruldu")
        
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
        # Açık pozisyonları al
        positions = get_open_positions()
        open_positions_count = len(positions)
        
        # Günlük istatistikleri al
        today = trade_limits.get_today_key()
        daily_trades = trade_limits.daily_trades.get(today, {})
        total_daily_trades = sum(daily_trades.values()) if daily_trades else 0
        
        return jsonify({
            "status": "ok",
            "bot_status": bot_status,
            "open_positions": open_positions_count,
            "daily_trades": total_daily_trades,
            "connected_users": len(user_api_keys),
            "uptime": "Running" if bot_status == "running" else "Stopped"
        })
        
    except Exception as e:
        logger.error(f"Status check error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/positions', methods=['GET'])
def get_positions():
    """Açık pozisyonları döndürür"""
    try:
        positions = get_open_positions()
        formatted_positions = []
        
        for pos in positions:
            formatted_positions.append({
                "symbol": pos['symbol'],
                "size": float(pos['positionAmt']),
                "side": "LONG" if float(pos['positionAmt']) > 0 else "SHORT",
                "entry_price": float(pos['entryPrice']),
                "mark_price": float(pos['markPrice']),
                "unrealized_pnl": float(pos['unRealizedProfit']),
                "percentage": float(pos['percentage']) if 'percentage' in pos else 0
            })
            
        return jsonify({
            "status": "ok",
            "positions": formatted_positions,
            "total_positions": len(formatted_positions)
        })
        
    except Exception as e:
        logger.error(f"Positions fetch error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/stats', methods=['GET'])
def get_trading_stats():
    """İşlem istatistiklerini döndürür"""
    try:
        today = trade_limits.get_today_key()
        
        # Günlük istatistikler
        daily_trades = trade_limits.daily_trades.get(today, {})
        failed_trades = trade_limits.failed_trades.get(today, {})
        daily_pnl = trade_limits.daily_pnl.get(today, {})
        
        total_trades = sum(daily_trades.values()) if daily_trades else 0
        total_failed = sum(failed_trades.values()) if failed_trades else 0
        total_pnl = sum(daily_pnl.values()) if daily_pnl else 0
        
        success_rate = ((total_trades - total_failed) / total_trades * 100) if total_trades > 0 else 0
        
        return jsonify({
            "status": "ok",
            "stats": {
                "total_trades": total_trades,
                "successful_trades": total_trades - total_failed,
                "failed_trades": total_failed,
                "success_rate": round(success_rate, 2),
                "daily_pnl": round(total_pnl, 2),
                "blocked_symbols": list(trade_limits.trade_blocked_symbols)
            }
        })
        
    except Exception as e:
        logger.error(f"Stats fetch error: {e}")
        return jsonify({"status": "error", "message": str(e)}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
