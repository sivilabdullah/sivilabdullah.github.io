// Authentication API (backend integration for cross-browser compatibility)
class AuthAPI {
    constructor() {
        // Production mode with Railway backend
        this.demoMode = false;
        this.botApiUrl = 'https://tender-happiness-copy-production.up.railway.app';
        this.token = localStorage.getItem('token');
    }

    // Register user (backend integration)
    async register(email, password, name) {
        try {
            // Call backend registration endpoint
            const response = await fetch(`${this.botApiUrl}/api/auth/register`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password,
                    name: name
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                return { success: false, message: result.message || 'Registration failed' };
            }

            if (result.success) {
                // Save token and user data
                this.token = result.data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));

                return { 
                    success: true, 
                    data: result.data
                };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Network error: Could not connect to server' };
        }
    }

    // Login user (backend integration)
    async login(email, password) {
        try {
            // Call backend login endpoint
            const response = await fetch(`${this.botApiUrl}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const result = await response.json();
            
            if (!response.ok) {
                return { success: false, message: result.message || 'Login failed' };
            }

            if (result.success) {
                // Save token and user data
                this.token = result.data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(result.data.user));

                return { 
                    success: true, 
                    data: result.data
                };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error: Could not connect to server' };
        }
    }

    // Get user profile (backend integration)
    async getProfile() {
        try {
            if (!this.token) {
                return { success: false, message: 'No token found' };
            }

            const response = await fetch(`${this.botApiUrl}/api/auth/profile`, {
                method: 'GET',
                headers: {
                    'Authorization': `Bearer ${this.token}`,
                    'Content-Type': 'application/json',
                }
            });

            const result = await response.json();
            
            if (!response.ok) {
                if (response.status === 401) {
                    // Token is invalid, clear it
                    this.logout();
                }
                return { success: false, message: result.message || 'Failed to get profile' };
            }

            if (result.success) {
                // Update local user data
                localStorage.setItem('user', JSON.stringify(result.data));
                return { success: true, data: result.data };
            } else {
                return { success: false, message: result.message };
            }
        } catch (error) {
            console.error('Profile error:', error);
            return { success: false, message: 'Network error: Could not connect to server' };
        }
    }

    // Get API keys (keep existing functionality)
    async getAPIKeys() {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, message: 'User not logged in' };
            }

            // Get API keys from localStorage (this can stay local for demo)
            const apiKeys = localStorage.getItem('demo_api_keys');
            if (apiKeys) {
                const keys = JSON.parse(apiKeys);
                if (keys.userId === user.id) {
                    return { 
                        success: true, 
                        data: { 
                            has_keys: true,
                            api_key: this.maskAPIKey(keys.api_key),
                            secret_key: '••••••••••••••••'
                        } 
                    };
                }
            }

            return { success: true, data: { has_keys: false } };
        } catch (error) {
            console.error('Get API Keys error:', error);
            return { success: false, message: 'Failed to get API keys' };
        }
    }

    // Mask API key for display
    maskAPIKey(apiKey) {
        if (!apiKey || apiKey.length < 8) return '••••••••';
        return apiKey.substring(0, 8) + '••••••••••••••••';
    }

    // Save API keys (keep existing backend integration)
    async saveAPIKeys(apiKey, secretKey) {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, message: 'User not logged in' };
            }

            // Validate API key format (basic validation)
            if (!this.validateBinanceAPIKey(apiKey, secretKey)) {
                return { success: false, message: 'Invalid API key format. Please check your keys.' };
            }

            // Connect to REAL bot backend
            const response = await fetch(`${this.botApiUrl}/api/keys`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id,
                    api_key: apiKey,
                    secret_key: secretKey,
                    action: 'connect'
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || 'Failed to connect to trading bot' };
            }
            
            const result = await response.json();
            if (result.status !== 'ok') {
                return { success: false, message: result.message || 'Bot connection failed' };
            }

            // Save API keys to localStorage for UI purposes
            localStorage.setItem('demo_api_keys', JSON.stringify({
                api_key: apiKey,
                secret_key: secretKey,
                userId: user.id,
                timestamp: Date.now(),
                balance: result.balance,
                testnet: result.testnet
            }));

            return { 
                success: true, 
                message: `API keys connected! Balance: ${result.balance} USDT ${result.testnet ? '(Testnet)' : '(Live)'}`,
                data: result
            };
        } catch (error) {
            console.error('API Keys error:', error);
            return { success: false, message: 'Network error: Could not connect to trading bot' };
        }
    }

    // Validate Binance API key format (keep existing)
    validateBinanceAPIKey(apiKey, secretKey) {
        // Updated validation for modern Binance API key formats
        
        // Check for minimum lengths
        if (!apiKey || !secretKey || apiKey.trim().length < 20 || secretKey.trim().length < 20) {
            return false;
        }
        
        // Remove whitespace
        apiKey = apiKey.trim();
        secretKey = secretKey.trim();
        
        // Ed25519 keys (modern, recommended format)
        if (apiKey.startsWith('-----BEGIN PUBLIC KEY-----') && apiKey.includes('-----END PUBLIC KEY-----')) {
            // Ed25519 public key format
            return secretKey.length >= 40; // Ed25519 signatures are typically 64 chars in base64
        }
        
        // RSA keys (2048 or 4096 bit)
        if (apiKey.startsWith('-----BEGIN PUBLIC KEY-----') && apiKey.includes('-----END PUBLIC KEY-----')) {
            // RSA public key format
            return secretKey.length >= 40;
        }
        
        // HMAC keys (legacy format - 64 characters)
        const hmacApiKeyPattern = /^[A-Za-z0-9]{64}$/;
        const hmacSecretKeyPattern = /^[A-Za-z0-9]{64}$/;
        
        if (hmacApiKeyPattern.test(apiKey) && hmacSecretKeyPattern.test(secretKey)) {
            return true;
        }
        
        // Modern Binance API keys (variable length alphanumeric)
        const modernApiKeyPattern = /^[A-Za-z0-9]{40,100}$/;
        const modernSecretPattern = /^[A-Za-z0-9]{40,100}$/;
        
        return modernApiKeyPattern.test(apiKey) && modernSecretPattern.test(secretKey);
    }

    // Start/Stop bot methods (keep existing backend integration)
    async startBot() {
        try {
            const user = this.getCurrentUser();
            const apiKeys = JSON.parse(localStorage.getItem('demo_api_keys') || '{}');
            
            if (!user || !apiKeys.api_key) {
                return { success: false, message: 'API keys not configured' };
            }

            // Connect to REAL bot backend
            const response = await fetch(`${this.botApiUrl}/api/bot/start`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || 'Failed to start trading bot' };
            }
            
            const result = await response.json();
            if (result.status !== 'ok') {
                return { success: false, message: result.message || 'Bot start failed' };
            }
            
            localStorage.setItem('bot_status', 'running');
            return { success: true, message: result.message || 'Trading bot started successfully!' };
            
        } catch (error) {
            console.error('Start bot error:', error);
            return { success: false, message: 'Network error: Could not connect to trading bot' };
        }
    }

    async stopBot() {
        try {
            const user = this.getCurrentUser();
            
            if (!user) {
                return { success: false, message: 'User not logged in' };
            }

            // Connect to REAL bot backend
            const response = await fetch(`${this.botApiUrl}/api/bot/stop`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    user_id: user.id
                })
            });
            
            if (!response.ok) {
                const errorData = await response.json();
                return { success: false, message: errorData.message || 'Failed to stop trading bot' };
            }
            
            const result = await response.json();
            if (result.status !== 'ok') {
                return { success: false, message: result.message || 'Bot stop failed' };
            }
            
            localStorage.setItem('bot_status', 'stopped');
            return { success: true, message: result.message || 'Trading bot stopped successfully!' };
            
        } catch (error) {
            console.error('Stop bot error:', error);
            return { success: false, message: 'Network error: Could not connect to trading bot' };
        }
    }

    // Get bot status
    getBotStatus() {
        return localStorage.getItem('bot_status') || 'offline';
    }

    // Check if user is logged in
    isLoggedIn() {
        return !!this.token;
    }

    // Logout
    logout() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('demo_api_keys');
        localStorage.removeItem('bot_status');
        window.location.href = 'index.html';
    }

    // Get current user
    getCurrentUser() {
        const user = localStorage.getItem('user');
        return user ? JSON.parse(user) : null;
    }
}

// Initialize Auth API
const authAPI = new AuthAPI();

// Utility functions
function showMessage(message, type = 'info') {
    // Create message element
    const messageDiv = document.createElement('div');
    messageDiv.className = `message message-${type}`;
    messageDiv.innerHTML = `
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">&times;</button>
    `;
    
    // Add to page
    document.body.insertBefore(messageDiv, document.body.firstChild);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (messageDiv.parentElement) {
            messageDiv.remove();
        }
    }, 5000);
}

// Form handlers
document.addEventListener('DOMContentLoaded', function() {
    
    // Login form handler
    const loginForm = document.querySelector('#login-form, .auth-form[action="/login"]');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const email = this.querySelector('input[type="email"]').value;
            const password = this.querySelector('input[type="password"]').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Logging in...';
            
            try {
                const result = await authAPI.login(email, password);
                
                if (result.success) {
                    showMessage('✅ Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage('❌ ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('❌ Login failed. Please try again.', 'error');
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
    
    // Register form handler
    const registerForm = document.querySelector('#register-form, .auth-form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = this.querySelector('input[name="name"]').value;
            const email = this.querySelector('input[type="email"]').value;
            const password = this.querySelector('input[type="password"]').value;
            const submitBtn = this.querySelector('button[type="submit"]');
            const originalText = submitBtn.textContent;
            
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating account...';
            
            try {
                const result = await authAPI.register(email, password, name);
                
                if (result.success) {
                    showMessage('✅ Account created successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1000);
                } else {
                    showMessage('❌ ' + result.message, 'error');
                }
            } catch (error) {
                showMessage('❌ Registration failed. Please try again.', 'error');
            }
            
            submitBtn.disabled = false;
            submitBtn.textContent = originalText;
        });
    }
    
    // Check if user is already logged in
    if (authAPI.isLoggedIn()) {
        const currentPage = window.location.pathname;
        if (currentPage.includes('login.html') || currentPage.includes('register.html')) {
            window.location.href = 'dashboard.html';
        }
    }
});

// Add message styles to head
const messageStyles = `
<style>
.message {
    position: fixed;
    top: 20px;
    right: 20px;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 9999;
    display: flex;
    align-items: center;
    justify-content: space-between;
    min-width: 300px;
    font-weight: 500;
    box-shadow: 0 4px 12px rgba(0,0,0,0.15);
    animation: slideIn 0.3s ease-out;
}

@keyframes slideIn {
    from {
        transform: translateX(100%);
        opacity: 0;
    }
    to {
        transform: translateX(0);
        opacity: 1;
    }
}

.message-success {
    background: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
}

.message-error {
    background: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
}

.message-info {
    background: #d1ecf1;
    color: #0c5460;
    border: 1px solid #bee5eb;
}

.message button {
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
    margin-left: 10px;
    color: inherit;
    opacity: 0.7;
    transition: opacity 0.2s;
}

.message button:hover {
    opacity: 1;
}

/* Button disabled state */
.button:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    pointer-events: none;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', messageStyles); 