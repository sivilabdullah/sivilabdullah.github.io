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
        this.setupEventListeners();
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
            }
        } catch (error) {
            console.error('Error loading API keys status:', error);
        }
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
        }
    }

    enableBotControls() {
        const startBtn = document.getElementById('start-bot');
        const stopBtn = document.getElementById('stop-bot');
        const botInfo = document.querySelector('.bot-info');

        if (startBtn) startBtn.disabled = false;
        if (stopBtn) stopBtn.disabled = false;
        if (botInfo) botInfo.textContent = 'Ready to start trading';
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

        const apiKey = document.getElementById('api-key').value;
        const secretKey = document.getElementById('secret-key').value;
        const submitBtn = e.target.querySelector('button[type="submit"]');

        if (!apiKey || !secretKey) {
            showMessage('Please enter both API key and secret key', 'error');
            return;
        }

        // Disable submit button
        submitBtn.disabled = true;
        submitBtn.textContent = 'Testing Connection...';

        try {
            const result = await authAPI.saveAPIKeys(apiKey, secretKey);

            if (result.success) {
                showMessage('API keys saved and tested successfully!', 'success');
                this.updateAPIStatus(true, { api_key: apiKey });
                this.enableBotControls();
                
                // Clear secret key input for security
                document.getElementById('secret-key').value = '';
            } else {
                showMessage(result.message, 'error');
            }
        } catch (error) {
            showMessage('Error saving API keys. Please try again.', 'error');
        }

        // Re-enable submit button
        submitBtn.disabled = false;
        submitBtn.textContent = 'Save & Test Connection';
    }

    startBot() {
        const botStatus = document.getElementById('bot-status');
        const statusDot = botStatus.querySelector('.status-dot');
        const statusText = botStatus.querySelector('span:last-child');
        const startBtn = document.getElementById('start-bot');

        // Update UI
        statusDot.className = 'status-dot online';
        statusText.textContent = 'Running';
        startBtn.disabled = true;

        showMessage('Trading bot started successfully!', 'success');

        // TODO: Actually start the bot via API call
        console.log('Starting bot...');
    }

    stopBot() {
        const botStatus = document.getElementById('bot-status');
        const statusDot = botStatus.querySelector('.status-dot');
        const statusText = botStatus.querySelector('span:last-child');
        const startBtn = document.getElementById('start-bot');

        // Update UI
        statusDot.className = 'status-dot offline';
        statusText.textContent = 'Stopped';
        startBtn.disabled = false;

        showMessage('Trading bot stopped', 'info');

        // TODO: Actually stop the bot via API call
        console.log('Stopping bot...');
    }
}

// Initialize dashboard when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    new Dashboard();
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