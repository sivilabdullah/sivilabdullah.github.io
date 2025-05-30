// Authentication demo handler (for static site demo purposes)
class AuthAPI {
    constructor() {
        // Demo mode - no backend required
        this.demoMode = true;
        this.token = localStorage.getItem('token');
    }

    // Generate demo token
    generateToken() {
        return 'demo_token_' + Math.random().toString(36).substr(2, 9);
    }

    // Register user (demo mode)
    async register(email, password, name) {
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Check if user already exists
            const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
            if (existingUsers[email]) {
                return { success: false, message: 'User already exists with this email' };
            }

            // Create new user
            const newUser = {
                id: Date.now(),
                name: name,
                email: email,
                password: password, // In real app, this would be hashed
                createdAt: new Date().toISOString()
            };

            // Save user to localStorage
            existingUsers[email] = newUser;
            localStorage.setItem('demo_users', JSON.stringify(existingUsers));

            // Generate token and save
            this.token = this.generateToken();
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify({
                id: newUser.id,
                name: newUser.name,
                email: newUser.email
            }));

            return { 
                success: true, 
                data: { 
                    user: { id: newUser.id, name: newUser.name, email: newUser.email },
                    token: this.token 
                } 
            };
        } catch (error) {
            console.error('Register error:', error);
            return { success: false, message: 'Registration failed. Please try again.' };
        }
    }

    // Login user (demo mode)
    async login(email, password) {
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 800));

            // Check if user exists
            const existingUsers = JSON.parse(localStorage.getItem('demo_users') || '{}');
            const user = existingUsers[email];

            if (!user) {
                return { success: false, message: 'User not found. Please register first.' };
            }

            if (user.password !== password) {
                return { success: false, message: 'Invalid password. Please try again.' };
            }

            // Generate token and save
            this.token = this.generateToken();
            localStorage.setItem('token', this.token);
            localStorage.setItem('user', JSON.stringify({
                id: user.id,
                name: user.name,
                email: user.email
            }));

            return { 
                success: true, 
                data: { 
                    user: { id: user.id, name: user.name, email: user.email },
                    token: this.token 
                } 
            };
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Login failed. Please try again.' };
        }
    }

    // Get user profile (demo mode)
    async getProfile() {
        try {
            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, message: 'User not found' };
            }

            return { success: true, data: user };
        } catch (error) {
            console.error('Profile error:', error);
            return { success: false, message: 'Failed to get profile' };
        }
    }

    // Save API keys (demo mode)
    async saveAPIKeys(apiKey, secretKey) {
        try {
            // Simulate network delay
            await new Promise(resolve => setTimeout(resolve, 500));

            const user = this.getCurrentUser();
            if (!user) {
                return { success: false, message: 'User not logged in' };
            }

            // Save API keys to localStorage (in real app, would be encrypted)
            localStorage.setItem('demo_api_keys', JSON.stringify({
                api_key: apiKey,
                secret_key: secretKey,
                userId: user.id
            }));

            return { success: true, message: 'API keys saved successfully' };
        } catch (error) {
            console.error('API Keys error:', error);
            return { success: false, message: 'Failed to save API keys' };
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
            
            if (!email || !password) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            // Disable button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Signing In...';
            
            try {
                const result = await authAPI.login(email, password);
                
                if (result.success) {
                    showMessage('Login successful! Redirecting to dashboard...', 'success');
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
            const termsChecked = this.querySelector('input[name="terms"]')?.checked;
            const submitBtn = this.querySelector('button[type="submit"]');
            
            // Validation
            if (!name || !email || !password) {
                showMessage('Please fill in all fields', 'error');
                return;
            }
            
            if (password.length < 6) {
                showMessage('Password must be at least 6 characters long', 'error');
                return;
            }
            
            // Password confirmation check
            if (confirmPassword && password !== confirmPassword) {
                showMessage('Passwords do not match', 'error');
                return;
            }
            
            // Terms check
            if (termsChecked !== undefined && !termsChecked) {
                showMessage('Please accept the Terms of Service', 'error');
                return;
            }
            
            // Disable button
            submitBtn.disabled = true;
            submitBtn.textContent = 'Creating Account...';
            
            try {
                const result = await authAPI.register(email, password, name);
                
                if (result.success) {
                    showMessage('Account created successfully! Redirecting to dashboard...', 'success');
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