// Dashboard functionality
class Dashboard {
    constructor() {
        this.user = authAPI.getCurrentUser();
        this.init();
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
            const result = await authAPI.getAPIKeys();
            
            if (result.success && result.data.has_keys) {
                this.updateAPIStatus(true, result.data);
                this.enableBotControls();
            } else {
                this.updateAPIStatus(false);
                this.disableBotControls();
            }
        } catch (error) {
            console.error('Error loading API keys status:', error);
            this.updateAPIStatus(false);
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
        if (apiKey.length !== 64 || secretKey.length !== 64) {
            showMessage('Invalid API key format. Binance API keys should be 64 characters long.', 'error');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Connecting to Bot...';

        try {
            const result = await authAPI.saveAPIKeys(apiKey, secretKey);

            if (result.success) {
                showMessage('✅ API keys saved and bot connected successfully!', 'success');
                this.updateAPIStatus(true, { api_key: apiKey });
                this.enableBotControls();
                
                // Clear secret key input for security
                document.getElementById('secret-key').value = '';
                
                // Add bot connection info
                this.addBotConnectionInfo();
            } else {
                showMessage(`❌ ${result.message}`, 'error');
            }
        } catch (error) {
            showMessage('❌ Error connecting to bot. Please try again.', 'error');
            console.error('API Keys error:', error);
        }

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Test Connection';
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
        }, 30000);
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