// Simple Matrix Rain Effect
let canvas, ctx, drops, isRunning = false;

function initMatrix() {
    console.log('Matrix initializing...');
    
    // Create canvas
    canvas = document.createElement('canvas');
    canvas.style.position = 'fixed';
    canvas.style.top = '0';
    canvas.style.left = '0';
    canvas.style.width = '100vw';
    canvas.style.height = '100vh';
    canvas.style.pointerEvents = 'none';
    canvas.style.zIndex = '0';
    canvas.style.opacity = '0';
    canvas.style.transition = 'opacity 0.3s ease';
    
    document.body.appendChild(canvas);
    
    ctx = canvas.getContext('2d');
    setupCanvas();
    
    console.log('Canvas created:', canvas.width, 'x', canvas.height);
    
    // Setup event listeners
    setupEvents();
}

function setupCanvas() {
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    
    const columns = Math.floor(canvas.width / 15);
    drops = [];
    
    for (let i = 0; i < columns; i++) {
        drops[i] = Math.floor(Math.random() * canvas.height);
    }
    
    console.log('Canvas setup complete. Columns:', columns);
}

function setupEvents() {
    // Window resize
    window.addEventListener('resize', setupCanvas);
    
    // Auth card hover
    const authCard = document.querySelector('.auth-card');
    console.log('Auth card found:', authCard);
    
    if (authCard) {
        authCard.addEventListener('mouseenter', startMatrix);
        authCard.addEventListener('mouseleave', stopMatrix);
        console.log('Event listeners attached');
    } else {
        console.log('Auth card not found');
    }
}

function startMatrix() {
    console.log('Starting matrix effect');
    isRunning = true;
    canvas.style.opacity = '0.8';
    animate();
}

function stopMatrix() {
    console.log('Stopping matrix effect');
    isRunning = false;
    canvas.style.opacity = '0';
}

function animate() {
    if (!isRunning) return;
    
    // Very light semi-transparent background for trailing effect
    ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // More visible green text
    ctx.fillStyle = 'rgba(34, 197, 94, 0.8)';
    ctx.font = '16px monospace';
    
    const chars = '01';
    
    for (let i = 0; i < drops.length; i++) {
        const text = chars[Math.floor(Math.random() * chars.length)];
        const x = i * 15;
        const y = drops[i];
        
        ctx.fillText(text, x, y);
        
        // Reset drop
        if (y > canvas.height && Math.random() > 0.98) {
            drops[i] = 0;
        }
        
        drops[i] += 12;
    }
    
    requestAnimationFrame(animate);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', function() {
    console.log('DOM loaded, initializing matrix');
    setTimeout(initMatrix, 100);
});

// Also try to initialize immediately if DOM is already loaded
if (document.readyState === 'loading') {
    console.log('DOM still loading');
} else {
    console.log('DOM already loaded, initializing matrix immediately');
    setTimeout(initMatrix, 100);
} 