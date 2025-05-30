// Authentication API handler
class AuthAPI {
    constructor() {
        this.baseURL = 'http://localhost:5000/api';
        this.token = localStorage.getItem('token');
    }

    // Set authorization header
    getHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        
        if (this.token) {
            headers['Authorization'] = `Bearer ${this.token}`;
        }
        
        return headers;
    }

    // Register user
    async register(email, password, name) {
        try {
            const response = await fetch(`${this.baseURL}/auth/register`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    email: email,
                    password: password,
                    name: name
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Save token
                this.token = data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                return { success: true, data: data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Network error occurred' };
        }
    }

    // Login user
    async login(email, password) {
        try {
            const response = await fetch(`${this.baseURL}/auth/login`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    email: email,
                    password: password
                })
            });

            const data = await response.json();

            if (response.ok) {
                // Save token
                this.token = data.token;
                localStorage.setItem('token', this.token);
                localStorage.setItem('user', JSON.stringify(data.user));
                
                return { success: true, data: data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error occurred' };
        }
    }

    // Get user profile
    async getProfile() {
        try {
            const response = await fetch(`${this.baseURL}/user/profile`, {
                method: 'GET',
                headers: this.getHeaders()
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, data: data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Profile error:', error);
            return { success: false, message: 'Network error occurred' };
        }
    }

    // Save API keys
    async saveAPIKeys(apiKey, secretKey) {
        try {
            const response = await fetch(`${this.baseURL}/user/api-keys`, {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify({
                    api_key: apiKey,
                    secret_key: secretKey
                })
            });

            const data = await response.json();

            if (response.ok) {
                return { success: true, message: data.message };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('API Keys error:', error);
            return { success: false, message: 'Network error occurred' };
        }
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
            
            // Disable button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';
            
            try {
                const result = await authAPI.login(email, password);
                
                if (result.success) {
                    showMessage('Login successful! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('An error occurred. Please try again.', 'error');
            }
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Sign In';
        });
    }
    
    // Register form handler
    const registerForm = document.querySelector('#register-form, .auth-form[action="/register"]');
    if (registerForm) {
        registerForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            const name = this.querySelector('input[name="name"]')?.value || '';
            const email = this.querySelector('input[type="email"]').value;
            const password = this.querySelector('input[name="password"]').value;
            const confirmPassword = this.querySelector('input[name="confirm-password"]')?.value;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Password confirmation check
            if (confirmPassword && password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            // Disable button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';
            
            try {
                const result = await authAPI.register(email, password, name);
                
                if (result.success) {
                    showMessage('Account created successfully! Redirecting...', 'success');
                    setTimeout(() => {
                        window.location.href = 'dashboard.html';
                    }, 1500);
                } else {
                    showMessage(result.message, 'error');
                }
            } catch (error) {
                showMessage('An error occurred. Please try again.', 'error');
            }
            
            // Re-enable button
            submitBtn.disabled = false;
            submitBtn.textContent = 'Create Account';
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
}

.message button:hover {
    opacity: 1;
}
</style>
`;

document.head.insertAdjacentHTML('beforeend', messageStyles); 