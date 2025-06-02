"""
İşlem istatistikleri ve performans takibi için yardımcı fonksiyonlar
"""
import json
import datetime
import os
import pandas as pd
import matplotlib.pyplot as plt
from matplotlib.dates import DateFormatter

# İstatistik dosyaları
TRADES_FILE = "trades_history.json"
DAILY_PERFORMANCE_FILE = "daily_performance.json"

class TradeStats:
    def __init__(self):
        # İstatistik dosyalarını yükle veya oluştur
        self.trades = self._load_file(TRADES_FILE, [])
        self.daily_performance = self._load_file(DAILY_PERFORMANCE_FILE, {})
        
    def _load_file(self, filename, default_value):
        """Dosyayı yükler, yoksa varsayılan değer döner"""
        try:
            if os.path.exists(filename):
                with open(filename, 'r') as f:
                    return json.load(f)
            return default_value
        except Exception as e:
            print(f"Dosya yükleme hatası ({filename}): {e}")
            return default_value
    
    def _save_file(self, filename, data):
        """Veriyi dosyaya kaydeder"""
        try:
            with open(filename, 'w') as f:
                json.dump(data, f, indent=4)
            return True
        except Exception as e:
            print(f"Dosya kaydetme hatası ({filename}): {e}")
            return False
    
    def record_trade(self, trade_data):
        """
        İşlem verilerini kaydeder
        
        Args:
            trade_data: İşlem verileri (dictionary)
                - symbol: İşlem sembolü
                - side: İşlem yönü (BUY/SELL)
                - entry_price: Giriş fiyatı
                - exit_price: Çıkış fiyatı (varsa)
                - entry_time: Giriş zamanı
                - exit_time: Çıkış zamanı (varsa)
                - profit_loss: Kar/zarar miktarı (varsa)
                - profit_loss_percent: Kar/zarar yüzdesi (varsa)
                - status: İşlem durumu (OPEN, CLOSED, SL, TP1, TP2, TP3)
        """
        # Tarih formatını kontrol et ve ISO formatına dönüştür
        for time_key in ['entry_time', 'exit_time']:
            if time_key in trade_data and trade_data[time_key]:
                if isinstance(trade_data[time_key], str):
                    try:
                        # Eğer timestamp ise datetime'a çevir
                        if trade_data[time_key].isdigit():
                            dt = datetime.datetime.fromtimestamp(int(trade_data[time_key]))
                            trade_data[time_key] = dt.isoformat()
                    except:
                        pass
        
        # Trade ID oluştur
        trade_id = f"{trade_data['symbol']}_{trade_data.get('entry_time', datetime.datetime.now().isoformat())}"
        trade_data['id'] = trade_id
        
        # Eğer bu trade ID zaten varsa güncelle, yoksa yeni ekle
        existing_trade = None
        for i, trade in enumerate(self.trades):
            if trade.get('id') == trade_id:
                existing_trade = i
                break
        
        if existing_trade is not None:
            self.trades[existing_trade] = trade_data
        else:
            self.trades.append(trade_data)
        
        # Dosyaya kaydet
        self._save_file(TRADES_FILE, self.trades)
        
        # Günlük performans verisi güncelle
        if 'profit_loss' in trade_data and trade_data['status'] == 'CLOSED':
            trade_date = trade_data.get('exit_time', datetime.datetime.now().isoformat())[:10]  # YYYY-MM-DD
            
            if trade_date not in self.daily_performance:
                self.daily_performance[trade_date] = {
                    'total_trades': 0,
                    'winning_trades': 0,
                    'losing_trades': 0,
                    'profit_loss': 0
                }
            
            self.daily_performance[trade_date]['total_trades'] += 1
            
            if trade_data['profit_loss'] > 0:
                self.daily_performance[trade_date]['winning_trades'] += 1
            else:
                self.daily_performance[trade_date]['losing_trades'] += 1
                
            self.daily_performance[trade_date]['profit_loss'] += trade_data['profit_loss']
            
            # Günlük performansı kaydet
            self._save_file(DAILY_PERFORMANCE_FILE, self.daily_performance)
    
    def update_trade_status(self, trade_id, new_status, exit_price=None, exit_time=None, profit_loss=None, profit_loss_percent=None):
        """İşlem durumunu günceller"""
        for i, trade in enumerate(self.trades):
            if trade.get('id') == trade_id:
                self.trades[i]['status'] = new_status
                
                if exit_price is not None:
                    self.trades[i]['exit_price'] = exit_price
                    
                if exit_time is not None:
                    self.trades[i]['exit_time'] = exit_time
                else:
                    self.trades[i]['exit_time'] = datetime.datetime.now().isoformat()
                    
                if profit_loss is not None:
                    self.trades[i]['profit_loss'] = profit_loss
                    
                if profit_loss_percent is not None:
                    self.trades[i]['profit_loss_percent'] = profit_loss_percent
                    
                # Günlük performans verisi güncelle
                if new_status == 'CLOSED' and profit_loss is not None:
                    trade_date = self.trades[i].get('exit_time', datetime.datetime.now().isoformat())[:10]  # YYYY-MM-DD
                    
                    if trade_date not in self.daily_performance:
                        self.daily_performance[trade_date] = {
                            'total_trades': 0,
                            'winning_trades': 0,
                            'losing_trades': 0,
                            'profit_loss': 0
                        }
                    
                    self.daily_performance[trade_date]['total_trades'] += 1
                    
                    if profit_loss > 0:
                        self.daily_performance[trade_date]['winning_trades'] += 1
                    else:
                        self.daily_performance[trade_date]['losing_trades'] += 1
                        
                    self.daily_performance[trade_date]['profit_loss'] += profit_loss
                    
                # Kaydet
                self._save_file(TRADES_FILE, self.trades)
                self._save_file(DAILY_PERFORMANCE_FILE, self.daily_performance)
                return True
                
        return False
    
    def get_open_trades(self):
        """Açık işlemleri döner"""
        return [t for t in self.trades if t.get('status') == 'OPEN']
    
    def get_closed_trades(self, days=None):
        """Kapanmış işlemleri döner"""
        closed_trades = [t for t in self.trades if t.get('status') == 'CLOSED']
        
        if days:
            # Son N gün içindeki işlemleri filtrele
            cutoff_date = (datetime.datetime.now() - datetime.datetime.timedelta(days=days)).isoformat()
            closed_trades = [t for t in closed_trades if t.get('exit_time', '') >= cutoff_date]
            
        return closed_trades
    
    def get_trade_stats(self, days=None):
        """İşlem istatistiklerini hesaplar"""
        closed_trades = self.get_closed_trades(days)
        
        if not closed_trades:
            return {
                'total_trades': 0,
                'winning_trades': 0,
                'losing_trades': 0,
                'win_rate': 0,
                'total_profit_loss': 0,
                'avg_profit_loss': 0,
                'avg_win': 0,
                'avg_loss': 0,
                'largest_win': 0,
                'largest_loss': 0,
                'profit_factor': 0,
                'expectancy': 0
            }
        
        winning_trades = [t for t in closed_trades if t.get('profit_loss', 0) > 0]
        losing_trades = [t for t in closed_trades if t.get('profit_loss', 0) <= 0]
        
        total_trades = len(closed_trades)
        winning_count = len(winning_trades)
        losing_count = len(losing_trades)
        
        win_rate = (winning_count / total_trades) * 100 if total_trades > 0 else 0
        
        total_profit_loss = sum(t.get('profit_loss', 0) for t in closed_trades)
        avg_profit_loss = total_profit_loss / total_trades if total_trades > 0 else 0
        
        avg_win = sum(t.get('profit_loss', 0) for t in winning_trades) / winning_count if winning_count > 0 else 0
        avg_loss = sum(t.get('profit_loss', 0) for t in losing_trades) / losing_count if losing_count > 0 else 0
        
        largest_win = max([t.get('profit_loss', 0) for t in winning_trades]) if winning_trades else 0
        largest_loss = min([t.get('profit_loss', 0) for t in losing_trades]) if losing_trades else 0
        
        gross_profit = sum(t.get('profit_loss', 0) for t in winning_trades)
        gross_loss = abs(sum(t.get('profit_loss', 0) for t in losing_trades))
        
        profit_factor = gross_profit / gross_loss if gross_loss > 0 else float('inf')
        
        expectancy = (win_rate/100 * avg_win) - ((1-win_rate/100) * abs(avg_loss)) if total_trades > 0 else 0
        
        return {
            'total_trades': total_trades,
            'winning_trades': winning_count,
            'losing_trades': losing_count,
            'win_rate': win_rate,
            'total_profit_loss': total_profit_loss,
            'avg_profit_loss': avg_profit_loss,
            'avg_win': avg_win,
            'avg_loss': avg_loss,
            'largest_win': largest_win,
            'largest_loss': largest_loss,
            'profit_factor': profit_factor,
            'expectancy': expectancy
        }
    
    def generate_performance_report(self, days=30, output_file="performance_report.html"):
        """Performans raporu oluşturur ve HTML dosyası olarak kaydeder"""
        stats = self.get_trade_stats(days)
        closed_trades = self.get_closed_trades(days)
        
        # Pandas DataFrames oluştur
        trades_df = pd.DataFrame(closed_trades)
        
        if not trades_df.empty:
            # Tarih sütunlarını datetime'a dönüştür
            for col in ['entry_time', 'exit_time']:
                if col in trades_df.columns:
                    trades_df[col] = pd.to_datetime(trades_df[col])
            
            # Günlük performans verisini DataFrame'e dönüştür
            daily_df = pd.DataFrame(self.daily_performance).T
            daily_df.index = pd.to_datetime(daily_df.index)
            daily_df = daily_df.sort_index()
            
            # Son N günlük veriyi filtrele
            if days:
                cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
                daily_df = daily_df[daily_df.index >= cutoff_date]
            
            # Kümülatif kar/zarar hesapla
            daily_df['cumulative_pnl'] = daily_df['profit_loss'].cumsum()
            
            # HTML raporu oluştur
            html_content = f"""
            <html>
            <head>
                <title>Trade Bot Performans Raporu</title>
                <style>
                    body {{ font-family: Arial, sans-serif; margin: 20px; }}
                    h1, h2 {{ color: #333; }}
                    .stats-container {{ display: flex; flex-wrap: wrap; }}
                    .stat-box {{ 
                        border: 1px solid #ddd; 
                        border-radius: 5px; 
                        padding: 15px; 
                        margin: 10px; 
                        flex: 1; 
                        min-width: 200px;
                        background-color: #f9f9f9;
                    }}
                    .positive {{ color: green; }}
                    .negative {{ color: red; }}
                    table {{ border-collapse: collapse; width: 100%; margin-top: 20px; }}
                    th, td {{ border: 1px solid #ddd; padding: 8px; text-align: left; }}
                    th {{ background-color: #f2f2f2; }}
                    tr:nth-child(even) {{ background-color: #f9f9f9; }}
                </style>
            </head>
            <body>
                <h1>Trade Bot Performans Raporu</h1>
                <p>Oluşturulma Tarihi: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M')}</p>
                <p>Zaman Aralığı: Son {days} gün</p>
                
                <h2>Genel İstatistikler</h2>
                <div class="stats-container">
                    <div class="stat-box">
                        <h3>İşlem Sayıları</h3>
                        <p>Toplam İşlem: {stats['total_trades']}</p>
                        <p>Kazançlı İşlem: <span class="positive">{stats['winning_trades']}</span></p>
                        <p>Zararlı İşlem: <span class="negative">{stats['losing_trades']}</span></p>
                        <p>Kazanç Oranı: {stats['win_rate']:.2f}%</p>
                    </div>
                    
                    <div class="stat-box">
                        <h3>Karlılık</h3>
                        <p>Toplam Kar/Zarar: <span class="{'positive' if stats['total_profit_loss'] > 0 else 'negative'}">{stats['total_profit_loss']:.2f} USDT</span></p>
                        <p>Ortalama Kar/Zarar: <span class="{'positive' if stats['avg_profit_loss'] > 0 else 'negative'}">{stats['avg_profit_loss']:.2f} USDT</span></p>
                        <p>Ortalama Kazanç: <span class="positive">{stats['avg_win']:.2f} USDT</span></p>
                        <p>Ortalama Zarar: <span class="negative">{stats['avg_loss']:.2f} USDT</span></p>
                    </div>
                    
                    <div class="stat-box">
                        <h3>Risk Metrikleri</h3>
                        <p>En Büyük Kazanç: <span class="positive">{stats['largest_win']:.2f} USDT</span></p>
                        <p>En Büyük Zarar: <span class="negative">{stats['largest_loss']:.2f} USDT</span></p>
                        <p>Kar Faktörü: {stats['profit_factor']:.2f}</p>
                        <p>Expectancy: {stats['expectancy']:.2f}</p>
                    </div>
                </div>
                
                <h2>Son İşlemler</h2>
                <table>
                    <tr>
                        <th>Sembol</th>
                        <th>Yön</th>
                        <th>Giriş Fiyatı</th>
                        <th>Çıkış Fiyatı</th>
                        <th>Kar/Zarar</th>
                        <th>Kar/Zarar %</th>
                        <th>Durum</th>
                        <th>Tarih</th>
                    </tr>
            """
            
            # En son 20 işlemi ekle
            for _, trade in trades_df.sort_values('exit_time', ascending=False).head(20).iterrows():
                profit_class = "positive" if trade.get('profit_loss', 0) > 0 else "negative"
                html_content += f"""
                    <tr>
                        <td>{trade.get('symbol', '')}</td>
                        <td>{trade.get('side', '')}</td>
                        <td>{trade.get('entry_price', '')}</td>
                        <td>{trade.get('exit_price', '')}</td>
                        <td class="{profit_class}">{trade.get('profit_loss', 0):.2f}</td>
                        <td class="{profit_class}">{trade.get('profit_loss_percent', 0):.2f}%</td>
                        <td>{trade.get('status', '')}</td>
                        <td>{trade.get('exit_time', '').strftime('%Y-%m-%d %H:%M') if isinstance(trade.get('exit_time'), pd.Timestamp) else ''}</td>
                    </tr>
                """
            
            html_content += """
                </table>
            </body>
            </html>
            """
            
            # HTML dosyasını kaydet
            with open(output_file, 'w') as f:
                f.write(html_content)
            
            return output_file
        else:
            return None
    
    def plot_equity_curve(self, days=30, save_path="equity_curve.png"):
        """Sermaye eğrisi grafiği oluşturur ve kaydeder"""
        try:
            # Günlük performans verisini DataFrame'e dönüştür
            daily_df = pd.DataFrame(self.daily_performance).T
            daily_df.index = pd.to_datetime(daily_df.index)
            daily_df = daily_df.sort_index()
            
            # Son N günlük veriyi filtrele
            if days:
                cutoff_date = datetime.datetime.now() - datetime.timedelta(days=days)
                daily_df = daily_df[daily_df.index >= cutoff_date]
            
            if daily_df.empty:
                return None
            
            # Kümülatif kar/zarar hesapla
            daily_df['cumulative_pnl'] = daily_df['profit_loss'].cumsum()
            
            # Grafiği oluştur
            plt.figure(figsize=(12, 6))
            
            # Sermaye eğrisi
            plt.plot(daily_df.index, daily_df['cumulative_pnl'], 'b-', linewidth=2)
            plt.fill_between(daily_df.index, 0, daily_df['cumulative_pnl'], 
                            where=daily_df['cumulative_pnl'] >= 0, facecolor='green', alpha=0.3)
            plt.fill_between(daily_df.index, 0, daily_df['cumulative_pnl'], 
                            where=daily_df['cumulative_pnl'] < 0, facecolor='red', alpha=0.3)
            
            # Grafiği düzenle
            plt.title('Trade Bot Sermaye Eğrisi', fontsize=14)
            plt.ylabel('Kümülatif Kar/Zarar (USDT)', fontsize=12)
            plt.grid(True, linestyle='--', alpha=0.7)
            plt.gca().xaxis.set_major_formatter(DateFormatter('%Y-%m-%d'))
            plt.xticks(rotation=45)
            plt.tight_layout()
            
            # Grafiği kaydet
            plt.savefig(save_path)
            plt.close()
            
            return save_path
            
        except Exception as e:
            print(f"Sermaye eğrisi oluşturma hatası: {e}")
            return None
    
# Örnek kullanım
if __name__ == "__main__":
    # Test amaçlı
    stats = TradeStats()
    
    # Örnek işlem ekleme
    example_trade = {
        "symbol": "BTCUSDT",
        "side": "BUY",
        "entry_price": 50000,
        "exit_price": 52000,
        "entry_time": datetime.datetime.now().isoformat(),
        "exit_time": (datetime.datetime.now() + datetime.timedelta(hours=2)).isoformat(),
        "profit_loss": 2000,
        "profit_loss_percent": 4.0,
        "status": "CLOSED"
    }
    
    stats.record_trade(example_trade)
    
    # İstatistikleri göster
    print("İşlem İstatistikleri:")
    print(json.dumps(stats.get_trade_stats(), indent=4))
    
    # Performans raporu oluştur
    report_file = stats.generate_performance_report()
    if report_file:
        print(f"Performans raporu oluşturuldu: {report_file}")
    
    # Sermaye eğrisi oluştur
    equity_file = stats.plot_equity_curve()
    if equity_file:
        print(f"Sermaye eğrisi grafiği oluşturuldu: {equity_file}")