// Dashboard functionality
class Dashboard {
    constructor() {
        this.user = authAPI.getCurrentUser();
        this.addDangerButtonStyles();
        this.init();
    }

    addDangerButtonStyles() {
        // Danger button için CSS stilleri ekle
        const style = document.createElement('style');
        style.textContent = `
            .button-danger {
                background: #dc3545 !important;
                color: white !important;
                border: 1px solid #dc3545 !important;
            }
            .button-danger:hover {
                background: #c82333 !important;
                border-color: #bd2130 !important;
            }
            .button-danger:disabled {
                background: #6c757d !important;
                border-color: #6c757d !important;
                opacity: 0.6;
                cursor: not-allowed;
            }
        `;
        document.head.appendChild(style);
    }

    init() {
        // Check if user is logged in
        if (!authAPI.isLoggedIn()) {
            window.location.href = 'login.html';
            return;
        }

        this.loadUserInfo();
        this.loadAPIKeysStatus();
        this.loadBotStatus();
        this.setupEventListeners();
        this.startStatusUpdates();
    }

    loadUserInfo() {
        if (this.user) {
            // Display user email in navigation
            const userEmailElement = document.getElementById('user-email');
            if (userEmailElement) {
                userEmailElement.textContent = this.user.email;
            }

            // Display subscription plan
            const planNameElement = document.getElementById('plan-name');
            if (planNameElement) {
                planNameElement.textContent = this.user.subscription_plan || 'Free Plan';
            }
        }
    }

    async loadAPIKeysStatus() {
        try {
            // localStorage'den direkt API key'leri kontrol et
            const user = authAPI.getCurrentUser();
            if (!user) return;

            const savedKeys = localStorage.getItem('demo_api_keys');
            if (savedKeys) {
                const keyData = JSON.parse(savedKeys);
                if (keyData.userId === user.id && keyData.api_key) {
                    // API key'ler mevcut
                    this.updateAPIStatus(true, {
                        api_key: authAPI.maskAPIKey(keyData.api_key),
                        connected_at: keyData.timestamp
                    });
                    this.enableBotControls();
                    this.showConnectedState();
                    return;
                }
            }

            // API key'ler yok
            this.updateAPIStatus(false);
            this.disableBotControls();
            this.showDisconnectedState();
        } catch (error) {
            console.error('Error loading API keys status:', error);
            this.updateAPIStatus(false);
            this.showDisconnectedState();
        }
    }

    loadBotStatus() {
        const status = authAPI.getBotStatus();
        this.updateBotStatus(status);
    }

    updateAPIStatus(hasKeys, data = null) {
        const apiStatus = document.getElementById('api-status');
        const statusDot = apiStatus.querySelector('.status-dot');
        const statusText = apiStatus.querySelector('span:last-child');

        if (hasKeys) {
            statusDot.className = 'status-dot online';
            statusText.textContent = 'Connected';
            
            // Show masked API key
            const apiKeyInput = document.getElementById('api-key');
            if (apiKeyInput && data.api_key) {
                apiKeyInput.value = data.api_key;
                apiKeyInput.disabled = true;
            }
        } else {
            statusDot.className = 'status-dot offline';
            statusText.textContent = 'Not Configured';
            
            // Clear and enable API key input
            const apiKeyInput = document.getElementById('api-key');
            if (apiKeyInput) {
                apiKeyInput.value = '';
                apiKeyInput.disabled = false;
            }
        }
    }

    updateBotStatus(status) {
        const botStatus = document.getElementById('bot-status');
        const statusDot = botStatus.querySelector('.status-dot');
        const statusText = botStatus.querySelector('span:last-child');
        const startBtn = document.getElementById('start-bot');
        const stopBtn = document.getElementById('stop-bot');

        switch(status) {
            case 'running':
                statusDot.className = 'status-dot online';
                statusText.textContent = 'Running';
                if (startBtn) startBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = false;
                break;
            case 'stopped':
                statusDot.className = 'status-dot warning';
                statusText.textContent = 'Stopped';
                if (startBtn) startBtn.disabled = false;
                if (stopBtn) stopBtn.disabled = true;
                break;
            default:
                statusDot.className = 'status-dot offline';
                statusText.textContent = 'Offline';
                if (startBtn) startBtn.disabled = true;
                if (stopBtn) stopBtn.disabled = true;
        }
    }

    enableBotControls() {
        const startBtn = document.getElementById('start-bot');
        const stopBtn = document.getElementById('stop-bot');
        const botInfo = document.querySelector('.bot-info');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        if (botInfo) botInfo.textContent = 'Ready to start trading';
        
        // Update bot status display
        this.loadBotStatus();
    }

    disableBotControls() {
        const startBtn = document.getElementById('start-bot');
        const stopBtn = document.getElementById('stop-bot');
        const botInfo = document.querySelector('.bot-info');

        if (startBtn) startBtn.disabled = true;
        if (stopBtn) stopBtn.disabled = true;
        if (botInfo) botInfo.textContent = 'Configure your API keys to start trading';
    }

    setupEventListeners() {
        // API Keys form
        const apiForm = document.getElementById('api-keys-form');
        if (apiForm) {
            apiForm.addEventListener('submit', this.handleAPIKeysSubmit.bind(this));
        }

        // Bot controls
        const startBtn = document.getElementById('start-bot');
        const stopBtn = document.getElementById('stop-bot');

        if (startBtn) {
            startBtn.addEventListener('click', this.startBot.bind(this));
        }

        if (stopBtn) {
            stopBtn.addEventListener('click', this.stopBot.bind(this));
        }
    }

    async handleAPIKeysSubmit(e) {
        e.preventDefault();

        const apiKey = document.getElementById('api-key').value.trim();
        const secretKey = document.getElementById('secret-key').value.trim();
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!apiKey || !secretKey) {
            showMessage('Please enter both API key and secret key', 'error');
            return;
        }

        // Basic format validation
        if (apiKey.length < 20 || secretKey.length < 20) {
            showMessage('Invalid API key format. Please enter valid Binance API keys.', 'error');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting to Bot...';

        try {
            const result = await authAPI.saveAPIKeys(apiKey, secretKey);

            if (result.success) {
                showMessage('✅ API keys saved and bot connected successfully!', 'success');
                
                // UI'ı connected state'e geçir
                this.updateAPIStatus(true, { 
                    api_key: authAPI.maskAPIKey(apiKey) 
                });
                this.enableBotControls();
                this.showConnectedState();
                
            } else {
                showMessage(`❌ ${result.message}`, 'error');
                // Re-enable submit button on error
                submitBtn.disabled = false;
                submitBtn.textContent = 'Save & Test Connection';
            }
        } catch (error) {
            showMessage('❌ Error connecting to bot. Please try again.', 'error');
            console.error('API Keys error:', error);
            // Re-enable submit button on error
            submitBtn.disabled = false;
            submitBtn.textContent = 'Save & Test Connection';
        }
    }

    addBotConnectionInfo() {
        const botInfo = document.querySelector('.bot-info');
        if (botInfo) {
            botInfo.innerHTML = `
                <div style="color: #28a745; font-weight: 500;">
                    🤖 Bot connected successfully!<br>
                    <small style="color: #6c757d;">Your trading bot is now ready to receive signals</small>
                </div>
            `;
        }
    }

    async startBot() {
        const startBtn = document.getElementById('start-bot');
        const originalText = startBtn.textContent;
        
        startBtn.disabled = true;
        startBtn.textContent = 'Starting Bot...';

        try {
            const result = await authAPI.startBot();

            if (result.success) {
                showMessage('🚀 ' + result.message, 'success');
                this.updateBotStatus('running');
                this.addPerformanceInfo();
            } else {
                showMessage('❌ ' + result.message, 'error');
                startBtn.disabled = false;
                startBtn.textContent = originalText;
            }
        } catch (error) {
            showMessage('❌ Error starting bot. Please try again.', 'error');
            startBtn.disabled = false;
            startBtn.textContent = originalText;
        }
    }

    async stopBot() {
        const stopBtn = document.getElementById('stop-bot');
        const originalText = stopBtn.textContent;
        
        stopBtn.disabled = true;
        stopBtn.textContent = 'Stopping Bot...';

        try {
            const result = await authAPI.stopBot();

            if (result.success) {
                showMessage('⏹️ ' + result.message, 'info');
                this.updateBotStatus('stopped');
            } else {
                showMessage('❌ ' + result.message, 'error');
            }
        } catch (error) {
            showMessage('❌ Error stopping bot. Please try again.', 'error');
        }

        stopBtn.disabled = false;
        stopBtn.textContent = originalText;
    }

    addPerformanceInfo() {
        const botInfo = document.querySelector('.bot-info');
        if (botInfo) {
            botInfo.innerHTML = `
                <div style="color: #28a745; font-weight: 500;">
                    🔄 Bot is actively trading!<br>
                    <small style="color: #6c757d;">Monitor performance in the dashboard below</small>
                </div>
            `;
        }
    }

    startStatusUpdates() {
        // Update bot status every 30 seconds
        setInterval(() => {
            this.loadBotStatus();
            this.loadRealTimeStats();
        }, 30000);
        
        // Initial load of real-time data
        this.loadRealTimeStats();
    }

    async loadRealTimeStats() {
        try {
            // Bot durumu
            const statusResponse = await fetch('http://localhost:5000/api/bot/status');
            if (statusResponse.ok) {
                const statusData = await statusResponse.json();
                if (statusData.status === 'ok') {
                    this.updateRealTimeStats(statusData);
                }
            }

            // İşlem istatistikleri
            const statsResponse = await fetch('http://localhost:5000/api/stats');
            if (statsResponse.ok) {
                const statsData = await statsResponse.json();
                if (statsData.status === 'ok') {
                    this.updateTradingStats(statsData.stats);
                }
            }

            // Açık pozisyonlar
            const positionsResponse = await fetch('http://localhost:5000/api/positions');
            if (positionsResponse.ok) {
                const positionsData = await positionsResponse.json();
                if (positionsData.status === 'ok') {
                    this.updatePositionsInfo(positionsData);
                }
            }
        } catch (error) {
            // Bot offline ise sessizce geç
            console.warn('Bot API not available:', error);
        }
    }

    updateRealTimeStats(data) {
        // Performance kartındaki istatistikleri güncelle
        const stats = document.querySelectorAll('.performance-stats .stat-item');
        
        if (stats.length >= 4) {
            // Toplam işlem sayısı
            const totalTradesValue = stats[0].querySelector('.stat-value');
            if (totalTradesValue && data.daily_trades !== undefined) {
                totalTradesValue.textContent = data.daily_trades;
            }

            // Açık pozisyon sayısı (Win Rate yerine)
            const winRateValue = stats[1].querySelector('.stat-value');
            if (winRateValue && data.open_positions !== undefined) {
                winRateValue.textContent = data.open_positions;
                const winRateLabel = stats[1].querySelector('.stat-label');
                if (winRateLabel) {
                    winRateLabel.textContent = 'Open Positions';
                }
            }

            // Bağlı kullanıcı sayısı (Total PnL yerine)
            const totalPnlValue = stats[2].querySelector('.stat-value');
            if (totalPnlValue && data.connected_users !== undefined) {
                totalPnlValue.textContent = data.connected_users;
                const totalPnlLabel = stats[2].querySelector('.stat-label');
                if (totalPnlLabel) {
                    totalPnlLabel.textContent = 'Connected Users';
                }
            }

            // Bot uptime
            const todayPnlValue = stats[3].querySelector('.stat-value');
            if (todayPnlValue && data.uptime) {
                todayPnlValue.textContent = data.uptime;
                const todayPnlLabel = stats[3].querySelector('.stat-label');
                if (todayPnlLabel) {
                    todayPnlLabel.textContent = 'Bot Status';
                }
            }
        }
    }

    updateTradingStats(stats) {
        // İstatistik kartlarını güncelle
        if (stats.total_trades !== undefined) {
            const totalTradesElements = document.querySelectorAll('.stat-value');
            totalTradesElements.forEach(el => {
                if (el.parentElement.querySelector('.stat-label')?.textContent === 'Total Trades') {
                    el.textContent = stats.total_trades;
                }
            });
        }

        // Başarı oranı göster
        if (stats.success_rate !== undefined) {
            const successRateElements = document.querySelectorAll('.stat-value');
            successRateElements.forEach(el => {
                if (el.parentElement.querySelector('.stat-label')?.textContent === 'Win Rate') {
                    el.textContent = stats.success_rate.toFixed(1) + '%';
                }
            });
        }

        // Günlük kar/zarar göster
        if (stats.daily_pnl !== undefined) {
            const pnlElements = document.querySelectorAll('.stat-value');
            pnlElements.forEach(el => {
                const label = el.parentElement.querySelector('.stat-label')?.textContent;
                if (label === 'Total PnL' || label === "Today's PnL") {
                    el.textContent = (stats.daily_pnl >= 0 ? '+' : '') + stats.daily_pnl.toFixed(2) + ' USDT';
                    el.style.color = stats.daily_pnl >= 0 ? '#2ecc71' : '#e74c3c';
                }
            });
        }
    }

    updatePositionsInfo(data) {
        // Pozisyon bilgilerini bot info alanında göster
        const botInfo = document.querySelector('.bot-info');
        if (botInfo && data.total_positions !== undefined) {
            if (data.total_positions > 0) {
                let positionText = `🔄 Bot aktif! ${data.total_positions} açık pozisyon:<br>`;
                data.positions.forEach(pos => {
                    const pnlColor = pos.unrealized_pnl >= 0 ? '#2ecc71' : '#e74c3c';
                    positionText += `<small style="color: ${pnlColor};">${pos.symbol} ${pos.side}: ${pos.unrealized_pnl.toFixed(2)} USDT</small><br>`;
                });
                botInfo.innerHTML = positionText;
            } else if (authAPI.getBotStatus() === 'running') {
                botInfo.innerHTML = `
                    <div style="color: #28a745; font-weight: 500;">
                        🤖 Bot aktif - Yeni sinyaller bekleniyor<br>
                        <small style="color: #6c757d;">Açık pozisyon yok</small>
                    </div>
                `;
            }
        }
    }

    showConnectedState() {
        // API key form'unu connected moduna al
        const apiForm = document.getElementById('api-keys-form');
        const apiKeyInput = document.getElementById('api-key');
        const secretKeyInput = document.getElementById('secret-key');
        const submitBtn = apiForm?.querySelector('button[type="submit"]');

        if (apiForm) {
            // Form'u "connected" moduna al
            if (apiKeyInput) apiKeyInput.disabled = true;
            if (secretKeyInput) {
                secretKeyInput.value = '••••••••••••••••••••••••••••••••';
                secretKeyInput.disabled = true;
            }
            
            // Mevcut submit butonunu gizle ve yeni butonlar ekle
            if (submitBtn) {
                submitBtn.style.display = 'none';
            }
            
            // Connected state butonlarını kontrol et ve ekle
            this.addConnectedStateButtons(apiForm);
        }

        // Bağlantı bilgilerini göster
        this.addBotConnectionInfo();
    }

    addConnectedStateButtons(apiForm) {
        // Eğer butonlar zaten varsa, tekrar ekleme
        let buttonContainer = apiForm.querySelector('.connected-buttons');
        if (buttonContainer) {
            return;
        }

        // Buton container'ı oluştur
        buttonContainer = document.createElement('div');
        buttonContainer.className = 'connected-buttons';
        buttonContainer.style.cssText = `
            display: flex; 
            gap: 10px; 
            margin-top: 15px;
            flex-wrap: wrap;
        `;

        // Update API Keys butonu
        const updateBtn = document.createElement('button');
        updateBtn.type = 'button';
        updateBtn.className = 'button button-secondary';
        updateBtn.textContent = '🔄 Update API Keys';
        updateBtn.style.cssText = 'flex: 1; min-width: 140px;';
        updateBtn.onclick = this.switchToUpdateMode.bind(this);

        // Delete API Keys butonu
        const deleteBtn = document.createElement('button');
        deleteBtn.type = 'button';
        deleteBtn.className = 'button button-danger';
        deleteBtn.textContent = '🗑️ Delete API Keys';
        deleteBtn.style.cssText = 'flex: 1; min-width: 140px;';
        deleteBtn.onclick = this.deleteAPIKeys.bind(this);

        // Show API Key butonu
        const showBtn = document.createElement('button');
        showBtn.type = 'button';
        showBtn.className = 'button button-secondary';
        showBtn.textContent = '👁️ Show Keys';
        showBtn.style.cssText = 'flex: 1; min-width: 100px; font-size: 12px;';
        showBtn.onclick = this.showAPIKeys.bind(this);

        buttonContainer.appendChild(updateBtn);
        buttonContainer.appendChild(deleteBtn);
        buttonContainer.appendChild(showBtn);
        
        apiForm.appendChild(buttonContainer);
    }

    switchToUpdateMode() {
        // Form'u update moduna geçir
        const apiKeyInput = document.getElementById('api-key');
        const secretKeyInput = document.getElementById('secret-key');
        const submitBtn = document.querySelector('#api-keys-form button[type="submit"]');
        const buttonContainer = document.querySelector('.connected-buttons');

        if (apiKeyInput) {
            apiKeyInput.disabled = false;
            apiKeyInput.value = '';
            apiKeyInput.placeholder = 'Enter new Binance API Key';
        }
        if (secretKeyInput) {
            secretKeyInput.disabled = false;
            secretKeyInput.value = '';
            secretKeyInput.placeholder = 'Enter new Binance Secret Key';
        }
        if (submitBtn) {
            submitBtn.style.display = 'block';
            submitBtn.textContent = 'Update & Test Connection';
            submitBtn.className = 'button button-primary';
        }
        if (buttonContainer) {
            buttonContainer.style.display = 'none';
        }

        showMessage('💡 You can now update your API keys', 'info');
    }

    async deleteAPIKeys() {
        const result = await this.showDeleteConfirmDialog();
        if (!result) return;

        try {
            const user = authAPI.getCurrentUser();
            if (!user) return;

            // Loading state göster
            const deleteBtn = document.querySelector('.connected-buttons .button-danger');
            if (deleteBtn) {
                deleteBtn.disabled = true;
                deleteBtn.textContent = '🗑️ Deleting...';
            }

            // Bot'u durdur
            await authAPI.stopBot();
            
            // localStorage'den API key'leri sil
            localStorage.removeItem('demo_api_keys');
            localStorage.removeItem('bot_status');
            
            // UI'ı güncelle
            this.updateAPIStatus(false);
            this.disableBotControls();
            this.showDisconnectedState();
            
            showMessage('🗑️ API keys deleted successfully! Bot has been stopped.', 'success');
            
            // Bot bilgisini güncelle
            const botInfo = document.querySelector('.bot-info');
            if (botInfo) {
                botInfo.innerHTML = 'Configure your API keys to start trading';
            }
        } catch (error) {
            console.error('Delete error:', error);
            showMessage('❌ Error deleting API keys', 'error');
            
            // Button'ı normale döndür
            const deleteBtn = document.querySelector('.connected-buttons .button-danger');
            if (deleteBtn) {
                deleteBtn.disabled = false;
                deleteBtn.textContent = '🗑️ Delete API Keys';
            }
        }
    }

    async showDeleteConfirmDialog() {
        return new Promise((resolve) => {
            // Custom confirmation dialog oluştur
            const overlay = document.createElement('div');
            overlay.style.cssText = `
                position: fixed; top: 0; left: 0; right: 0; bottom: 0;
                background: rgba(0,0,0,0.7); z-index: 10000;
                display: flex; align-items: center; justify-content: center;
            `;

            const dialog = document.createElement('div');
            dialog.style.cssText = `
                background: white; padding: 30px; border-radius: 12px;
                max-width: 400px; margin: 20px; text-align: center;
                box-shadow: 0 10px 30px rgba(0,0,0,0.3);
            `;

            dialog.innerHTML = `
                <div style="font-size: 48px; margin-bottom: 15px;">⚠️</div>
                <h3 style="color: #dc3545; margin-bottom: 15px;">Delete API Keys?</h3>
                <p style="margin-bottom: 25px; color: #666;">
                    This will permanently delete your API keys and stop the trading bot.<br>
                    <strong>This action cannot be undone.</strong>
                </p>
                <div style="display: flex; gap: 15px; justify-content: center;">
                    <button id="cancel-delete" class="button button-secondary">
                        Cancel
                    </button>
                    <button id="confirm-delete" class="button button-danger">
                        🗑️ Delete Keys
                    </button>
                </div>
            `;

            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            // Event listeners
            document.getElementById('cancel-delete').onclick = () => {
                document.body.removeChild(overlay);
                resolve(false);
            };

            document.getElementById('confirm-delete').onclick = () => {
                document.body.removeChild(overlay);
                resolve(true);
            };

            // ESC tuşu ile iptal
            const handleEscape = (e) => {
                if (e.key === 'Escape') {
                    document.body.removeChild(overlay);
                    document.removeEventListener('keydown', handleEscape);
                    resolve(false);
                }
            };
            document.addEventListener('keydown', handleEscape);
        });
    }

    async showAPIKeys() {
        const user = authAPI.getCurrentUser();
        if (!user) return;

        const savedKeys = localStorage.getItem('demo_api_keys');
        if (!savedKeys) {
            showMessage('❌ No API keys found', 'error');
            return;
        }

        const keyData = JSON.parse(savedKeys);
        
        // API key'leri göster modal
        const overlay = document.createElement('div');
        overlay.style.cssText = `
            position: fixed; top: 0; left: 0; right: 0; bottom: 0;
            background: rgba(0,0,0,0.7); z-index: 10000;
            display: flex; align-items: center; justify-content: center;
        `;

        const dialog = document.createElement('div');
        dialog.style.cssText = `
            background: white; padding: 30px; border-radius: 12px;
            max-width: 500px; margin: 20px;
            box-shadow: 0 10px 30px rgba(0,0,0,0.3);
        `;

        dialog.innerHTML = `
            <h3 style="margin-bottom: 20px; color: #333;">🔑 Your API Keys</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 8px; margin-bottom: 20px;">
                <p style="margin-bottom: 10px;"><strong>API Key:</strong></p>
                <code style="word-break: break-all; background: #e9ecef; padding: 5px; border-radius: 4px; display: block; font-size: 12px;">${keyData.api_key}</code>
                
                <p style="margin: 15px 0 10px 0;"><strong>Secret Key:</strong></p>
                <code style="word-break: break-all; background: #e9ecef; padding: 5px; border-radius: 4px; display: block; font-size: 12px;">${keyData.secret_key}</code>
            </div>
            <div style="text-align: center;">
                <button id="close-keys" class="button button-primary">Close</button>
            </div>
        `;

        overlay.appendChild(dialog);
        document.body.appendChild(overlay);

        document.getElementById('close-keys').onclick = () => {
            document.body.removeChild(overlay);
        };

        // ESC tuşu ile kapat
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                document.body.removeChild(overlay);
                document.removeEventListener('keydown', handleEscape);
            }
        };
        document.addEventListener('keydown', handleEscape);
    }

    showDisconnectedState() {
        // API key form'unu aktif et
        const apiForm = document.getElementById('api-keys-form');
        const apiKeyInput = document.getElementById('api-key');
        const secretKeyInput = document.getElementById('secret-key');
        const submitBtn = apiForm?.querySelector('button[type="submit"]');

        if (apiForm) {
            // Connected state butonlarını temizle
            const buttonContainer = apiForm.querySelector('.connected-buttons');
            if (buttonContainer) {
                buttonContainer.remove();
            }

            if (apiKeyInput) {
                apiKeyInput.disabled = false;
                apiKeyInput.value = '';
                apiKeyInput.placeholder = 'Enter your Binance API Key';
            }
            if (secretKeyInput) {
                secretKeyInput.disabled = false;
                secretKeyInput.value = '';
                secretKeyInput.placeholder = 'Enter your Binance Secret Key';
            }
            if (submitBtn) {
                submitBtn.style.display = 'block';
                submitBtn.textContent = 'Save & Test Connection';
                submitBtn.className = 'button button-primary';
                submitBtn.onclick = null; // Form submit handler'ı kullan
            }
        }
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new Dashboard();
});

// Add bot connection guide
function addBotConnectionGuide() {
    const apiHelp = document.querySelector('.api-help');
    if (apiHelp) {
        apiHelp.innerHTML += `
            <div style="margin-top: 20px; padding: 15px; background: #f8f9fa; border-radius: 8px; border-left: 4px solid #007bff;">
                <h4 style="margin-top: 0; color: #007bff;">🤖 Bot Connection</h4>
                <p style="margin-bottom: 10px;"><strong>When you save your API keys:</strong></p>
                <ul style="margin-bottom: 0;">
                    <li>Your trading bot will automatically receive the keys</li>
                    <li>The bot will connect to Binance and TradingView</li>
                    <li>You can start/stop the bot from this dashboard</li>
                    <li>All trades will be executed automatically</li>
                </ul>
            </div>
        `;
    }
}

// Add guide when page loads
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(addBotConnectionGuide, 1000);
});

// Add getAPIKeys method to AuthAPI if not exists
if (!authAPI.getAPIKeys) {
    authAPI.getAPIKeys = async function() {
        try {
            const response = await fetch(`${this.baseURL}/user/api-keys`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data: data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Get API Keys error:', error);
            return { success: false, message: 'Network error occurred' };
        }
    };
} 