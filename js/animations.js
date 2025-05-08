/**
 * TradeMaster AI - Animations JavaScript
 * Manages animations, transitions, and visual effects
 */

document.addEventListener('DOMContentLoaded', function() {
    // Initialize intersection observer for reveal animations
    initRevealAnimations();
    
    // Add floating elements animation
    initFloatingElements();
    
    // Add parallax scrolling effect
    initParallaxEffect();
    
    // Initialize chart animation
    initChartAnimation();
});

/**
 * Initialize reveal animations using Intersection Observer
 */
function initRevealAnimations() {
    // Elements with reveal animations
    const revealElements = document.querySelectorAll('.reveal-text, .reveal-element, .reveal-image');
    
    if (revealElements.length === 0) return;
    
    const revealOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -100px 0px'
    };
    
    const revealObserver = new IntersectionObserver(function(entries, observer) {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('revealed');
                // Stop observing after animation
                observer.unobserve(entry.target);
            }
        });
    }, revealOptions);
    
    revealElements.forEach(element => {
        // Add initial state class
        element.classList.add('reveal-hidden');
        // Start observing
        revealObserver.observe(element);
    });
}

/**
 * Initialize floating elements animation
 */
function initFloatingElements() {
    const floatingElements = document.querySelectorAll('.floating-chart, .floating-notification');
    
    if (floatingElements.length === 0) return;
    
    floatingElements.forEach((element, index) => {
        // Different floating pattern for each element
        const animation = `float-${index % 3 + 1} 6s ease-in-out infinite`;
        element.style.animation = animation;
    });
    
    // Add mouse movement parallax effect to floating elements
    document.addEventListener('mousemove', function(e) {
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        floatingElements.forEach(element => {
            const offsetX = (mouseX - 0.5) * 20;
            const offsetY = (mouseY - 0.5) * 20;
            
            element.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    });
}

/**
 * Initialize parallax scrolling effect
 */
function initParallaxEffect() {
    const parallaxElements = document.querySelectorAll('.hero, .crypto-bg-image');
    
    if (parallaxElements.length === 0) return;
    
    window.addEventListener('scroll', function() {
        const scrollPosition = window.pageYOffset;
        
        parallaxElements.forEach(element => {
            const speed = element.classList.contains('hero') ? 0.5 : 0.3;
            element.style.transform = `translateY(${scrollPosition * speed}px)`;
        });
    });
}

/**
 * Initialize animated chart for visual appeal
 */
function initChartAnimation() {
    // Check if canvas already exists
    if (document.querySelector('#live-chart')) return;
    
    // Create canvas for chart animation
    const heroImage = document.querySelector('.hero-image');
    if (!heroImage) return;
    
    const canvas = document.createElement('canvas');
    canvas.id = 'live-chart';
    canvas.width = 300;
    canvas.height = 150;
    
    // Add canvas to hero image or another suitable container
    const chartContainer = document.createElement('div');
    chartContainer.classList.add('chart-container');
    chartContainer.appendChild(canvas);
    heroImage.appendChild(chartContainer);
    
    // Chart animation
    const ctx = canvas.getContext('2d');
    const chartPoints = [];
    const chartPointsMax = 30;
    
    // Generate initial chart data
    for (let i = 0; i < chartPointsMax; i++) {
        chartPoints.push(Math.random() * 50 + 50);
    }
    
    // Function to draw the chart
    function drawChart() {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Move chart points
        chartPoints.shift();
        chartPoints.push(
            chartPoints[chartPoints.length - 1] + (Math.random() * 10 - 5)
        );
        
        // Ensure values stay in range
        chartPoints[chartPoints.length - 1] = Math.max(
            25, Math.min(125, chartPoints[chartPoints.length - 1])
        );
        
        // Draw chart line
        ctx.beginPath();
        ctx.moveTo(0, canvas.height - chartPoints[0]);
        
        for (let i = 1; i < chartPoints.length; i++) {
            const x = (i / (chartPointsMax - 1)) * canvas.width;
            const y = canvas.height - chartPoints[i];
            ctx.lineTo(x, y);
        }
        
        // Create gradient
        const gradient = ctx.createLinearGradient(0, 0, 0, canvas.height);
        gradient.addColorStop(0, 'rgba(75, 192, 192, 1)');
        gradient.addColorStop(1, 'rgba(75, 192, 192, 0.1)');
        
        // Draw line
        ctx.strokeStyle = 'rgba(75, 192, 192, 1)';
        ctx.lineWidth = 2;
        ctx.stroke();
        
        // Fill area under line
        ctx.lineTo(canvas.width, canvas.height);
        ctx.lineTo(0, canvas.height);
        ctx.fillStyle = gradient;
        ctx.fill();
        
        // Add candlestick chart elements
        drawCandlesticks();
        
        // Continue animation
        requestAnimationFrame(drawChart);
    }
    
    // Draw candlestick markers
    function drawCandlesticks() {
        const candleWidth = canvas.width / 15;
        
        for (let i = 1; i < chartPoints.length; i += 3) {
            if (i + 1 >= chartPoints.length) continue;
            
            const x = (i / (chartPointsMax - 1)) * canvas.width;
            const open = canvas.height - chartPoints[i - 1];
            const close = canvas.height - chartPoints[i];
            const high = Math.min(open, close) - (Math.random() * 5 + 2);
            const low = Math.max(open, close) + (Math.random() * 5 + 2);
            
            // Draw candlestick body
            ctx.fillStyle = close < open ? 'rgba(235, 87, 87, 0.7)' : 'rgba(52, 199, 89, 0.7)';
            ctx.fillRect(
                x - candleWidth / 2,
                Math.min(open, close),
                candleWidth,
                Math.abs(close - open)
            );
            
            // Draw high and low lines
            ctx.beginPath();
            ctx.moveTo(x, high);
            ctx.lineTo(x, Math.min(open, close));
            ctx.moveTo(x, Math.max(open, close));
            ctx.lineTo(x, low);
            ctx.strokeStyle = close < open ? 'rgba(235, 87, 87, 0.9)' : 'rgba(52, 199, 89, 0.9)';
            ctx.lineWidth = 1;
            ctx.stroke();
        }
    }
    
    // Start chart animation
    drawChart();
} 