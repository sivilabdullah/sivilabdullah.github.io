/**
 * TradeMaster AI - Main JavaScript
 * Handles UI interactions, animations, and functionality
 */

document.addEventListener('DOMContentLoaded', function() {
    // Show initial loading state
    initMobileMenu();
    initScrollEffects();
    initWaitlistForm();
    initCounters();
    initDarkMode();
    initTradingChart();
    initDashboardInteraction();
    initParticleAnimation();
    initDemoSection(); // Add demo section initialization
    
    // Remove the pause button immediately using multiple selectors to ensure it's found
    const removePauseButton = () => {
        // Try different possible selectors
        const selectors = [
            '.pause',
            '.Pause',
            'button.pause',
            '[data-action="pause"]',
            '.action-button:contains("Pause")',
            '.action-button.pause'
        ];
        
        selectors.forEach(selector => {
            try {
                const elements = document.querySelectorAll(selector);
                elements.forEach(el => {
                    if (el && el.textContent && el.textContent.includes('Pause')) {
                        el.remove();
                    }
                });
            } catch (e) {
                console.log('Selector error:', e);
            }
        });
        
        // Direct text content search as a fallback
        document.querySelectorAll('button, .button, a.button').forEach(el => {
            if (el && el.textContent && el.textContent.trim() === 'Pause') {
                el.remove();
            }
        });
    };
    
    // Run immediately and also after a short delay to ensure DOM is fully loaded
    removePauseButton();
    setTimeout(removePauseButton, 1000);
    
    // Add scroll to top button functionality
    const scrollTopButton = document.createElement('button');
    scrollTopButton.classList.add('scroll-top');
    scrollTopButton.innerHTML = '↑';
    scrollTopButton.setAttribute('aria-label', 'Scroll to top');
    document.body.appendChild(scrollTopButton);
    
    scrollTopButton.addEventListener('click', function() {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    });
    
    // Show/hide scroll to top button based on scroll position
    window.addEventListener('scroll', function() {
        if (window.pageYOffset > 300) {
            scrollTopButton.classList.add('visible');
        } else {
            scrollTopButton.classList.remove('visible');
        }
    });

    // Link 'Auto', 'Analytics', and 'Settings' buttons to the price section
    const autoButton = document.querySelector('.action-button.auto');
    const analyticsButton = document.querySelector('.tab-item.analytics');
    const settingsButton = document.querySelector('.tab-item.settings');

    const linkToPriceSection = (button) => {
        if (button) {
            button.addEventListener('click', () => {
                const priceSection = document.getElementById('waitlist');
                if (priceSection) {
                    priceSection.scrollIntoView({ behavior: 'smooth' });
                }
            });
        }
    };

    linkToPriceSection(autoButton);
    linkToPriceSection(analyticsButton);
    linkToPriceSection(settingsButton);
});

/**
 * Initialize trading chart in hero section
 */
function initTradingChart() {
    const chartContainer = document.querySelector('.chart-container');
    if (!chartContainer) return;
    
    // Remove existing canvas if present
    const existingCanvas = document.getElementById('trading-chart');
    if (existingCanvas) {
        existingCanvas.remove();
    }
    
    // Create modern chart container
    const modernChartContainer = document.createElement('div');
    modernChartContainer.id = 'modern-chart';
    modernChartContainer.className = 'modern-chart';
    chartContainer.appendChild(modernChartContainer);
    
    // Add chart overlay for signals
    const overlay = document.querySelector('.chart-overlay');
    if (!overlay) {
        const chartOverlay = document.createElement('div');
        chartOverlay.className = 'chart-overlay';
        chartOverlay.innerHTML = `
            <div class="trade-signal buy-signal">
                <div class="signal-icon"></div>
                <div class="signal-text">BUY</div>
            </div>
        `;
        chartContainer.appendChild(chartOverlay);
    }
    
    // Add styles for modern chart and trade signals
    if (!document.querySelector('style#modern-chart-styles')) {
        const style = document.createElement('style');
        style.id = 'modern-chart-styles';
        style.textContent = `
            .modern-chart {
                width: 100%;
                height: 100%;
                position: relative;
                overflow: hidden;
                background-color: #f8fafc;
                border-radius: 4px;
            }
            .dark-theme .modern-chart {
                background-color: #1a202c;
            }
            .chart-grid {
                position: absolute;
                width: 100%;
                height: 100%;
                top: 0;
                left: 0;
            }
            .chart-grid-line {
                position: absolute;
                background-color: rgba(226, 232, 240, 0.5);
            }
            .dark-theme .chart-grid-line {
                background-color: rgba(45, 55, 72, 0.5);
            }
            .chart-grid-line.horizontal {
                width: 100%;
                height: 1px;
            }
            .chart-grid-line.vertical {
                width: 1px;
                height: 100%;
            }
            .candle {
                position: absolute;
                cursor: pointer;
            }
            .candle-body {
                position: absolute;
                width: 8px;
                left: 50%;
                transform: translateX(-50%);
                border-radius: 1px;
            }
            .candle-wick {
                position: absolute;
                width: 1px;
                background-color: #000;
                left: 50%;
                transform: translateX(-50%);
            }
            .candle.bullish .candle-body {
                background-color: rgba(46, 204, 113, 0.85);
                border: 1px solid #27AE60;
            }
            .candle.bearish .candle-body {
                background-color: rgba(231, 76, 60, 0.85);
                border: 1px solid #C0392B;
            }
            .candle.bullish .candle-wick {
                background-color: #27AE60;
            }
            .candle.bearish .candle-wick {
                background-color: #C0392B;
            }
            .price-label {
                position: absolute;
                right: 0;
                padding: 2px 6px;
                font-size: 11px;
                font-family: 'Inter', sans-serif;
                color: #64748b;
                background-color: rgba(255, 255, 255, 0.8);
                border-radius: 2px;
                transform: translateY(-50%);
            }
            .dark-theme .price-label {
                background-color: rgba(26, 32, 44, 0.8);
                color: #a0aec0;
            }
            .current-price-line {
                position: absolute;
                width: 100%;
                height: 1px;
                background-color: rgba(247, 147, 26, 0.8);
                z-index: 5;
            }
            .current-price-label {
                position: absolute;
                left: 4px;
                transform: translateY(-50%);
                background-color: rgba(247, 147, 26, 0.15);
                border: 1px solid rgba(247, 147, 26, 0.6);
                padding: 2px 8px;
                font-size: 11px;
                font-weight: bold;
                font-family: 'Inter', sans-serif;
                color: #1a202c;
                border-radius: 2px;
                z-index: 6;
            }
            .dark-theme .current-price-label {
                color: #f7f7f7;
            }
            .time-labels {
                position: absolute;
                bottom: 0;
                width: 100%;
                height: 20px;
            }
            .time-label {
                position: absolute;
                bottom: 0;
                transform: translateX(-50%);
                font-size: 10px;
                font-family: 'Inter', sans-serif;
                color: #64748b;
            }
            .dark-theme .time-label {
                color: #a0aec0;
            }
            .chart-loading {
                position: absolute;
                top: 0;
                left: 0;
                width: 100%;
                height: 100%;
                background-color: rgba(255, 255, 255, 0.95);
                display: flex;
                flex-direction: column;
                align-items: center;
                justify-content: center;
                z-index: 50;
                transition: opacity 0.3s ease;
            }
            .dark-theme .chart-loading {
                background-color: rgba(26, 32, 44, 0.95);
            }
            .chart-loading-text {
                margin-top: 12px;
                font-family: 'Inter', sans-serif;
                color: #1a202c;
                font-size: 14px;
            }
            .dark-theme .chart-loading-text {
                color: #f7f7f7;
            }
            .chart-tooltip {
                position: absolute;
                background-color: rgba(255, 255, 255, 0.95);
                border: 1px solid #e2e8f0;
                border-radius: 4px;
                padding: 8px;
                font-size: 12px;
                font-family: 'Inter', sans-serif;
                color: #1a202c;
                z-index: 20;
                box-shadow: 0 2px 5px rgba(0, 0, 0, 0.1);
                pointer-events: none;
                transform: translate(10px, -50%);
                display: none;
            }
            .dark-theme .chart-tooltip {
                background-color: rgba(26, 32, 44, 0.95);
                border-color: #4a5568;
                color: #f7f7f7;
            }
            .trade-signal {
                display: flex;
                align-items: center;
                padding: 8px 12px;
                border-radius: 4px;
                margin: 10px;
                font-weight: 600;
                font-family: 'Inter', sans-serif;
            }
            .buy-signal {
                background-color: rgba(46, 204, 113, 0.15);
                border: 1px solid rgba(46, 204, 113, 0.6);
                color: #27AE60;
            }
            .sell-signal {
                background-color: rgba(231, 76, 60, 0.15);
                border: 1px solid rgba(231, 76, 60, 0.6);
                color: #C0392B;
            }
            .signal-icon {
                width: 8px;
                height: 8px;
                border-radius: 50%;
                margin-right: 8px;
            }
            .buy-signal .signal-icon {
                background-color: #27AE60;
            }
            .sell-signal .signal-icon {
                background-color: #C0392B;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Selected timeframe - default to 1H
    let currentTimeframe = '1h';
    let chartData = [];
    let dataFetchInProgress = false;
    let dataFetchSuccess = false;
    
    // Create chart structure
    createChartStructure();
    
    // Fetch real BTC/USDT data from CoinGecko API
    fetchChartData(currentTimeframe);
    
    // Setup auto-refresh for price data (every 15 seconds)
    const refreshInterval = setInterval(() => {
        if (!dataFetchInProgress) {
            fetchCurrentPrice(true, false);
        }
    }, 15000);
    
    // Setup complete chart refresh every 5 minutes to ensure full synchronization
    const fullRefreshInterval = setInterval(() => {
        if (!dataFetchInProgress) {
            fetchChartData(currentTimeframe);
        }
    }, 300000); // 5 minutes
    
    // Clear intervals when page unloads
    window.addEventListener('beforeunload', () => {
        clearInterval(refreshInterval);
        clearInterval(fullRefreshInterval);
    });
    
    // Add timeframe switch event listeners
    const timeframes = document.querySelectorAll('.timeframe');
    if (timeframes.length) {
        timeframes.forEach(timeframe => {
            timeframe.addEventListener('click', function() {
                // Show loading state immediately
                showChartLoading();
                
                // Remove active class from all timeframes
                timeframes.forEach(t => t.classList.remove('active'));
                
                // Add active class to clicked timeframe
                this.classList.add('active');
                
                // Get timeframe value
                const timeframeText = this.textContent.trim();
                let newTimeframe;
                
                switch(timeframeText) {
                    case '1H':
                        newTimeframe = '1h';
                        break;
                    case '4H':
                        newTimeframe = '4h';
                        break;
                    case '1D':
                        newTimeframe = '1d';
                        break;
                    default:
                        newTimeframe = '1h';
                }
                
                // Only fetch if the timeframe actually changed
                if (newTimeframe !== currentTimeframe) {
                    // Update current timeframe
                    currentTimeframe = newTimeframe;
                    
                    // Clear existing chart data to prevent showing old data
                    chartData = [];
                    
                    // Clear the chart
                    clearChart();
                    
                    // Fetch data for the selected timeframe with slight delay to ensure UI updates first
                    setTimeout(() => {
                        fetchChartData(currentTimeframe);
                    }, 100);
                } else {
                    // If same timeframe was clicked, just hide loading
                    hideChartLoading();
                }
            });
        });
    }
    
    /**
     * Create the basic chart structure
     */
    function createChartStructure() {
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        // Clear existing content
        chartElement.innerHTML = '';
        
        // Add chart grid
        const chartGrid = document.createElement('div');
        chartGrid.className = 'chart-grid';
        chartElement.appendChild(chartGrid);
        
        // Add horizontal grid lines
        for (let i = 0; i < 6; i++) {
            const line = document.createElement('div');
            line.className = 'chart-grid-line horizontal';
            line.style.top = `${(i * 20)}%`;
            chartGrid.appendChild(line);
        }
        
        // Add vertical grid lines
        for (let i = 0; i < 7; i++) {
            const line = document.createElement('div');
            line.className = 'chart-grid-line vertical';
            line.style.left = `${(i * 16.666)}%`;
            chartGrid.appendChild(line);
        }
        
        // Add price labels container
        const priceLabelsContainer = document.createElement('div');
        priceLabelsContainer.className = 'price-labels';
        chartElement.appendChild(priceLabelsContainer);
        
        // Add time labels container
        const timeLabelsContainer = document.createElement('div');
        timeLabelsContainer.className = 'time-labels';
        chartElement.appendChild(timeLabelsContainer);
        
        // Add candles container
        const candlesContainer = document.createElement('div');
        candlesContainer.className = 'candles-container';
        chartElement.appendChild(candlesContainer);
        
        // Add current price line
        const currentPriceLine = document.createElement('div');
        currentPriceLine.className = 'current-price-line';
        chartElement.appendChild(currentPriceLine);
        
        // Add current price label
        const currentPriceLabel = document.createElement('div');
        currentPriceLabel.className = 'current-price-label';
        chartElement.appendChild(currentPriceLabel);
        
        // Add chart tooltip
        const chartTooltip = document.createElement('div');
        chartTooltip.className = 'chart-tooltip';
        chartElement.appendChild(chartTooltip);
        
        // Add chart loading
        const chartLoading = document.createElement('div');
        chartLoading.className = 'chart-loading';
        chartLoading.innerHTML = `
            <div class="loading-spinner"></div>
            <div class="chart-loading-text">Loading chart data...</div>
        `;
        chartElement.appendChild(chartLoading);
        
        // Add mouse move event listener for tooltip
        chartElement.addEventListener('mousemove', handleChartMouseMove);
        
        // Add mouse leave event listener to hide tooltip
        chartElement.addEventListener('mouseleave', () => {
            const tooltip = chartElement.querySelector('.chart-tooltip');
            if (tooltip) {
                tooltip.style.display = 'none';
            }
        });
    }
    
    /**
     * Handle mouse move event on chart
     */
    function handleChartMouseMove(e) {
        if (!chartData || chartData.length === 0) return;
        
        const chartElement = document.getElementById('modern-chart');
        const tooltip = chartElement.querySelector('.chart-tooltip');
        const rect = chartElement.getBoundingClientRect();
        
        // Calculate relative position in the chart
        const relX = e.clientX - rect.left;
        const relY = e.clientY - rect.top;
        
        // Find the nearest candle
        const candleWidth = rect.width / chartData.length;
        const candleIndex = Math.floor(relX / candleWidth);
        
        if (candleIndex >= 0 && candleIndex < chartData.length) {
            const candle = chartData[candleIndex];
            
            // Format the tooltip content
            tooltip.innerHTML = `
                <div><strong>Open:</strong> $${numberWithCommas(candle.open.toFixed(2))}</div>
                <div><strong>High:</strong> $${numberWithCommas(candle.high.toFixed(2))}</div>
                <div><strong>Low:</strong> $${numberWithCommas(candle.low.toFixed(2))}</div>
                <div><strong>Close:</strong> $${numberWithCommas(candle.close.toFixed(2))}</div>
                <div><strong>Time:</strong> ${formatTimeLabel(candle.timestamp)}</div>
            `;
            
            // Position the tooltip
            tooltip.style.left = `${relX}px`;
            tooltip.style.top = `${relY}px`;
            tooltip.style.display = 'block';
        }
    }
    
    /**
     * Show chart loading overlay
     */
    function showChartLoading() {
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        const loading = chartElement.querySelector('.chart-loading');
        if (loading) {
            loading.style.opacity = '1';
            loading.style.display = 'flex';
        }
    }
    
    /**
     * Hide chart loading overlay
     */
    function hideChartLoading() {
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        const loading = chartElement.querySelector('.chart-loading');
        if (loading) {
            loading.style.opacity = '0';
            setTimeout(() => {
                loading.style.display = 'none';
            }, 300);
        }
    }
    
    /**
     * Clear the chart
     */
    function clearChart() {
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        const candlesContainer = chartElement.querySelector('.candles-container');
        if (candlesContainer) {
            candlesContainer.innerHTML = '';
        }
        
        const priceLabelsContainer = chartElement.querySelector('.price-labels');
        if (priceLabelsContainer) {
            priceLabelsContainer.innerHTML = '';
        }
        
        const timeLabelsContainer = chartElement.querySelector('.time-labels');
        if (timeLabelsContainer) {
            timeLabelsContainer.innerHTML = '';
        }
        
        const currentPriceLine = chartElement.querySelector('.current-price-line');
        if (currentPriceLine) {
            currentPriceLine.style.top = '50%';
        }
        
        const currentPriceLabel = chartElement.querySelector('.current-price-label');
        if (currentPriceLabel) {
            currentPriceLabel.style.top = '50%';
            currentPriceLabel.textContent = 'Loading...';
        }
    }
    
    /**
     * Format time label based on timeframe
     */
    function formatTimeLabel(timestamp) {
        const date = new Date(timestamp);
        const options = {
            hour: '2-digit',
            minute: '2-digit'
        };
        
        if (currentTimeframe === '1d') {
            options.month = 'short';
            options.day = 'numeric';
        }
        
        return new Intl.DateTimeFormat(navigator.language, options).format(date);
    }
    
    /**
     * Fetch chart data from CoinGecko API
     */
    function fetchChartData(interval) {
        // Mark fetching in progress
        dataFetchInProgress = true;
        
        // Show loading state for chart only
        showChartLoading();
        
        // Use fallback data first to show something quickly
        if (chartData.length === 0) {
            chartData = generateChartData();
            renderChart();
        }
        
        // First, fetch current price to display immediately
        fetchCurrentPrice(false, true);
        
        // Use Binance API for historical data
        const binanceUrl = `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${getBinanceInterval(interval)}&limit=100`;
        
        // Set timeout for fetch (15 seconds)
        const fetchTimeout = setTimeout(() => {
            if (dataFetchInProgress) {
                dataFetchInProgress = false;
                console.error('Fetch chart data timeout');
                useFallbackData();
            }
        }, 15000);
        
        // Fetch data from Binance API
        fetch(binanceUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                clearTimeout(fetchTimeout);
                if (data && data.length > 0) {
                    // Clear chart data before processing new data
                    chartData = [];
                    processBinanceData(data);
                    dataFetchSuccess = true;
                } else {
                    throw new Error('Invalid data format');
                }
                dataFetchInProgress = false;
                hideChartLoading();
            })
            .catch(error => {
                clearTimeout(fetchTimeout);
                console.error('Error fetching chart data:', error);
                useFallbackData();
                dataFetchInProgress = false;
            });
    }
    
    /**
     * Fetch current Bitcoin price
     */
    function fetchCurrentPrice(isRefresh = false, isInitialFetch = false) {
        const priceUrl = 'https://api.binance.com/api/v3/ticker/24hr?symbol=BTCUSDT';
        
        if (isRefresh && !isInitialFetch) {
            // Only show chart loading when refreshing and not initial fetch
            showChartLoading();
        }
        
        fetch(priceUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! Status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                if (data && data.lastPrice && data.priceChangePercent) {
                    const currentPrice = parseFloat(data.lastPrice);
                    const changePercent = parseFloat(data.priceChangePercent);
                    
                    // Update dashboard with current price and change
                    updateDashboardPrice(currentPrice, currentPrice, changePercent, new Date());
                    
                    // Update the latest price in chart data if available
                    updateLatestChartPrice(currentPrice);
                    
                    if (isRefresh && !isInitialFetch) {
                        hideChartLoading();
                    }
                } else {
                    throw new Error('Invalid price data format');
                }
            })
            .catch(error => {
                console.error('Error fetching current price:', error);
                if (isRefresh && !isInitialFetch) {
                    hideChartLoading();
                }
            });
    }
    
    /**
     * Process CoinGecko data for the chart
     */
    function processBinanceData(data) {
        if (!data || data.length === 0) {
            useFallbackData();
            return;
        }
        
        // Clear existing chart data before processing new data
        chartData = [];
        
        // Convert Binance data to OHLC format
        data.forEach(point => {
            const [timestamp, open, high, low, close] = point;
            chartData.push({
                timestamp,
                open: parseFloat(open),
                high: parseFloat(high),
                low: parseFloat(low),
                close: parseFloat(close),
                volume: 0
            });
        });
        
        // Fetch current price immediately to ensure chart data is up-to-date
        fetchCurrentPriceForSync();
        
        // Render the chart with the new data
        renderChart();
    }
    
    /**
     * Update latest chart price with real-time data
     */
    function updateLatestChartPrice(currentPrice) {
        if (chartData.length > 0) {
            // Update the latest candle's close price
            const latestCandle = chartData[chartData.length - 1];
            
            // Calculate timestamp for now
            const now = Date.now();
            
            // Check if we need to add a new candle (more than 1 hour since last candle for 1h timeframe)
            if (currentTimeframe === '1h' && now - latestCandle.timestamp > 3600000) {
                // Create a new candle with current price
                const newCandle = {
                    timestamp: now,
                    open: latestCandle.close,
                    high: Math.max(latestCandle.close, currentPrice),
                    low: Math.min(latestCandle.close, currentPrice),
                    close: currentPrice,
                    volume: 0
                };
                
                // Remove oldest candle if we have too many
                if (chartData.length > 30) {
                    chartData.shift();
                }
                
                // Add new candle
                chartData.push(newCandle);
            } else {
                // If price increased, adjust high if needed
                if (currentPrice > latestCandle.high) {
                    latestCandle.high = currentPrice;
                } 
                // If price decreased, adjust low if needed
                else if (currentPrice < latestCandle.low) {
                    latestCandle.low = currentPrice;
                }
                
                // Update close price
                latestCandle.close = currentPrice;
            }
            
            // Update the chart
            updateChart(currentPrice);
        }
    }
    
    /**
     * Fetch current price and sync it with chart data
     */
    function fetchCurrentPriceForSync() {
        const priceUrl = 'https://api.binance.com/api/v3/ticker/price?symbol=BTCUSDT';
        
        fetch(priceUrl)
            .then(response => response.json())
            .then(data => {
                if (data && data.price && chartData.length > 0) {
                    const currentPrice = parseFloat(data.price);
                    
                    // Get latest candle
                    const latestCandle = chartData[chartData.length - 1];
                    
                    // Update latest candle to match the current price
                    // Preserve the open price
                    const open = latestCandle.open;
                    
                    // Set close to current price
                    latestCandle.close = currentPrice;
                    
                    // Adjust high and low if needed
                    latestCandle.high = Math.max(latestCandle.high, currentPrice);
                    latestCandle.low = Math.min(latestCandle.low, currentPrice);
                    
                    // Render the chart with synchronized data
                    renderChart();
                }
            })
            .catch(error => {
                console.error('Error syncing current price with chart:', error);
            });
    }
    
    /**
     * Render the chart with current data
     */
    function renderChart() {
        if (!chartData || chartData.length === 0) return;
        
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        // Clear existing chart
        clearChart();
        
        // Get chart dimensions
        const chartWidth = chartElement.clientWidth;
        const chartHeight = chartElement.clientHeight - 20; // Subtract 20px for time labels
        
        // Find min and max prices for scaling
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        
        chartData.forEach(point => {
            minPrice = Math.min(minPrice, point.low);
            maxPrice = Math.max(maxPrice, point.high);
        });
        
        // Add padding to price range (10%)
        const padding = (maxPrice - minPrice) * 0.1;
        minPrice -= padding;
        maxPrice += padding;
        
        const priceRange = maxPrice - minPrice;
        
        // Get containers
        const candlesContainer = chartElement.querySelector('.candles-container');
        const priceLabelsContainer = chartElement.querySelector('.price-labels');
        const timeLabelsContainer = chartElement.querySelector('.time-labels');
        
        // Clear containers
        candlesContainer.innerHTML = '';
        priceLabelsContainer.innerHTML = '';
        timeLabelsContainer.innerHTML = '';
        
        // Calculate candle width
        const candleWidth = Math.max(chartWidth / chartData.length * 0.8, 4);
        const candleSpacing = chartWidth / chartData.length;
        
        // Add price labels
        for (let i = 0; i <= 5; i++) {
            const price = minPrice + (priceRange * (i / 5));
            const yPos = chartHeight - (((price - minPrice) / priceRange) * chartHeight);
            
            // Add price label
            const priceLabel = document.createElement('div');
            priceLabel.className = 'price-label';
            priceLabel.textContent = '$' + numberWithCommas(price.toFixed(0));
            priceLabel.style.top = `${yPos}px`;
            priceLabelsContainer.appendChild(priceLabel);
        }
        
        // Add time labels
        const timeStep = Math.max(1, Math.floor(chartData.length / 6));
        for (let i = 0; i < chartData.length; i += timeStep) {
            const xPos = i * candleSpacing;
            
            // Add time label
            const timeLabel = document.createElement('div');
            timeLabel.className = 'time-label';
            timeLabel.textContent = formatTimeLabel(chartData[i].timestamp);
            timeLabel.style.left = `${xPos}px`;
            timeLabelsContainer.appendChild(timeLabel);
        }
        
        // Add candles
        chartData.forEach((candle, i) => {
            const isBullish = candle.close > candle.open;
            const xPos = i * candleSpacing;
            
            // Calculate y positions
            const openY = chartHeight - (((candle.open - minPrice) / priceRange) * chartHeight);
            const closeY = chartHeight - (((candle.close - minPrice) / priceRange) * chartHeight);
            const highY = chartHeight - (((candle.high - minPrice) / priceRange) * chartHeight);
            const lowY = chartHeight - (((candle.low - minPrice) / priceRange) * chartHeight);
            
            // Create candle element
            const candleElement = document.createElement('div');
            candleElement.className = `candle ${isBullish ? 'bullish' : 'bearish'}`;
            candleElement.style.left = `${xPos}px`;
            candleElement.style.width = `${candleWidth}px`;
            
            // Create candle body
            const candleBody = document.createElement('div');
            candleBody.className = 'candle-body';
            
            // Position body
            const bodyTop = isBullish ? closeY : openY;
            const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
            
            candleBody.style.top = `${bodyTop}px`;
            candleBody.style.height = `${bodyHeight}px`;
            
            // Create candle wick
            const candleWick = document.createElement('div');
            candleWick.className = 'candle-wick';
            candleWick.style.top = `${highY}px`;
            candleWick.style.height = `${lowY - highY}px`;
            
            // Append to candle
            candleElement.appendChild(candleWick);
            candleElement.appendChild(candleBody);
            
            // Highlight the latest candle
            if (i === chartData.length - 1) {
                candleElement.style.zIndex = '5';
                if (isBullish) {
                    candleBody.style.borderColor = '#1EA051';
                    candleBody.style.backgroundColor = 'rgba(46, 204, 113, 1)';
                } else {
                    candleBody.style.borderColor = '#B7342C';
                    candleBody.style.backgroundColor = 'rgba(231, 76, 60, 1)';
                }
            }
            
            // Append to container
            candlesContainer.appendChild(candleElement);
        });
        
        // Add current price line and label
        updateCurrentPriceLine();
    }
    
    /**
     * Update the chart with new price data
     */
    function updateChart(currentPrice) {
        if (!chartData || chartData.length === 0) return;
        
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        // Get chart dimensions
        const chartWidth = chartElement.clientWidth;
        const chartHeight = chartElement.clientHeight - 20; // Subtract 20px for time labels
        
        // Find min and max prices for scaling
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        
        chartData.forEach(point => {
            minPrice = Math.min(minPrice, point.low);
            maxPrice = Math.max(maxPrice, point.high);
        });
        
        // Add padding to price range (10%)
        const padding = (maxPrice - minPrice) * 0.1;
        minPrice -= padding;
        maxPrice += padding;
        
        const priceRange = maxPrice - minPrice;
        
        // Get containers
        const candlesContainer = chartElement.querySelector('.candles-container');
        
        // Get the latest candle element
        const candleElements = candlesContainer.querySelectorAll('.candle');
        const latestCandleElement = candleElements[candleElements.length - 1];
        
        if (latestCandleElement) {
            const latestCandle = chartData[chartData.length - 1];
            const isBullish = latestCandle.close > latestCandle.open;
            
            // Update class based on bullish/bearish
            latestCandleElement.className = `candle ${isBullish ? 'bullish' : 'bearish'}`;
            
            // Calculate y positions
            const openY = chartHeight - (((latestCandle.open - minPrice) / priceRange) * chartHeight);
            const closeY = chartHeight - (((latestCandle.close - minPrice) / priceRange) * chartHeight);
            const highY = chartHeight - (((latestCandle.high - minPrice) / priceRange) * chartHeight);
            const lowY = chartHeight - (((latestCandle.low - minPrice) / priceRange) * chartHeight);
            
            // Update body
            const candleBody = latestCandleElement.querySelector('.candle-body');
            if (candleBody) {
                // Position body
                const bodyTop = isBullish ? closeY : openY;
                const bodyHeight = Math.max(Math.abs(openY - closeY), 1);
                
                candleBody.style.top = `${bodyTop}px`;
                candleBody.style.height = `${bodyHeight}px`;
                
                // Highlight the latest candle
                if (isBullish) {
                    candleBody.style.borderColor = '#1EA051';
                    candleBody.style.backgroundColor = 'rgba(46, 204, 113, 1)';
                } else {
                    candleBody.style.borderColor = '#B7342C';
                    candleBody.style.backgroundColor = 'rgba(231, 76, 60, 1)';
                }
            }
            
            // Update wick
            const candleWick = latestCandleElement.querySelector('.candle-wick');
            if (candleWick) {
                candleWick.style.top = `${highY}px`;
                candleWick.style.height = `${lowY - highY}px`;
            }
        }
        
        // Update current price line
        updateCurrentPriceLine();
    }
    
    /**
     * Update the current price line and label
     */
    function updateCurrentPriceLine() {
        if (!chartData || chartData.length === 0) return;
        
        const chartElement = document.getElementById('modern-chart');
        if (!chartElement) return;
        
        const currentPriceLine = chartElement.querySelector('.current-price-line');
        const currentPriceLabel = chartElement.querySelector('.current-price-label');
        
        if (!currentPriceLine || !currentPriceLabel) return;
        
        // Get chart dimensions
        const chartHeight = chartElement.clientHeight - 20; // Subtract 20px for time labels
        
        // Get latest price
        const latestCandle = chartData[chartData.length - 1];
        const currentPrice = latestCandle.close;
        
        // Find min and max prices for scaling
        let minPrice = Infinity;
        let maxPrice = -Infinity;
        
        chartData.forEach(point => {
            minPrice = Math.min(minPrice, point.low);
            maxPrice = Math.max(maxPrice, point.high);
        });
        
        // Add padding to price range (10%)
        const padding = (maxPrice - minPrice) * 0.1;
        minPrice -= padding;
        maxPrice += padding;
        
        const priceRange = maxPrice - minPrice;
        
        // Calculate y position
        const priceY = chartHeight - (((currentPrice - minPrice) / priceRange) * chartHeight);
        
        // Update line position
        currentPriceLine.style.top = `${priceY}px`;
        
        // Update label
        currentPriceLabel.style.top = `${priceY}px`;
        currentPriceLabel.textContent = '$' + numberWithCommas(currentPrice.toFixed(2));
        
        // Update trade signal
        updateTradeSignal(latestCandle.close > latestCandle.open ? 'buy' : 'sell');
    }
    
    /**
     * Update trade signal display
     */
    function updateTradeSignal(signalType) {
        const signalElement = document.querySelector('.trade-signal');
        
        if (signalElement) {
            if (signalType === 'buy') {
                signalElement.classList.add('buy-signal');
                signalElement.classList.remove('sell-signal');
                signalElement.innerHTML = '<div class="signal-icon"></div><div class="signal-text">BUY</div>';
            } else {
                signalElement.classList.add('sell-signal');
                signalElement.classList.remove('buy-signal');
                signalElement.innerHTML = '<div class="signal-icon"></div><div class="signal-text">SELL</div>';
            }
            
            signalElement.style.display = 'flex';
        }
    }
}

/**
 * Convert interval to days for CoinGecko API
 */
function getDaysForInterval(interval) {
    switch(interval) {
        case '1h':
            return 1; // 1 day of hourly data
        case '4h':
            return 7; // 7 days of 4-hour data
        case '1d':
            return 30; // 30 days of daily data
        default:
            return 1;
    }
}

/**
 * Convert our interval to CoinGecko interval
 */
function getGeckoInterval(interval) {
    switch(interval) {
        case '1h':
            return 'hourly';
        case '4h':
        case '1d':
            return 'daily';
        default:
            return 'hourly';
    }
}

/**
 * Use fallback data if API request fails
 */
function useFallbackData() {
    console.log('Using fallback data');
    chartData = generateChartData();
    renderChart();
    
    // Update dashboard with fallback data
    const currentPrice = chartData[chartData.length - 1].close;
    const previousPrice = chartData[chartData.length - 2].close;
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    
    updateDashboardPrice(currentPrice, previousPrice, changePercent, new Date());
    
    // Hide loading screens
    hideChartLoading();
}

/**
 * Update dashboard with current price
 */
function updateDashboardPrice(currentPrice, previousPrice, changePercent, lastUpdated) {
    const priceInfoElement = document.querySelector('.price-info');
    const selectedPairElement = document.querySelector('.selected-pair');
    const lastUpdatedElement = document.querySelector('.last-updated');
    
    if (priceInfoElement) {
        // Format price with thousands separator
        const formattedPrice = '$' + numberWithCommas(currentPrice.toFixed(2));
        
        // Format change percentage
        const formattedChange = changePercent.toFixed(1) + '%';
        
        // Get previous price display if it exists
        const oldPriceText = priceInfoElement.textContent.split(' ')[0];
        const oldPrice = parseFloat(oldPriceText.replace(/[$,]/g, ''));
        
        // Update price info
        priceInfoElement.innerHTML = formattedPrice + ' <span class="price-change ' + (changePercent >= 0 ? 'positive' : 'negative') + '">' + (changePercent >= 0 ? '+' : '') + formattedChange + '</span>';
        
        // Add price flash effect when price changes
        if (!isNaN(oldPrice) && oldPrice !== currentPrice) {
            const priceFlash = document.createElement('div');
            priceFlash.className = 'price-flash ' + (currentPrice > oldPrice ? 'positive-flash' : 'negative-flash');
            priceInfoElement.parentElement.appendChild(priceFlash);
            
            // Add styles for price flash if not already added
            if (!document.querySelector('style#price-flash-styles')) {
                const style = document.createElement('style');
                style.id = 'price-flash-styles';
                style.textContent = `
                    .price-flash {
                        position: absolute;
                        top: 0;
                        left: 0;
                        width: 100%;
                        height: 100%;
                        border-radius: 4px;
                        opacity: 0.5;
                        pointer-events: none;
                        animation: flash-animation 0.8s ease-out forwards;
                    }
                    .positive-flash {
                        background-color: rgba(46, 204, 113, 0.3);
                    }
                    .negative-flash {
                        background-color: rgba(231, 76, 60, 0.3);
                    }
                    @keyframes flash-animation {
                        0% { opacity: 0.5; }
                        100% { opacity: 0; }
                    }
                `;
                document.head.appendChild(style);
            }
            
            // Position the flash correctly
            if (priceInfoElement.parentElement.style.position !== 'relative') {
                priceInfoElement.parentElement.style.position = 'relative';
            }
            
            // Remove flash after animation completes
            setTimeout(() => {
                priceFlash.remove();
            }, 800);
        }
    }
    
    // Update pair name if available
    if (selectedPairElement) {
        selectedPairElement.textContent = 'BTC/USDT';
    }
    
    // Add styles for last-updated element if not already added
    if (!document.querySelector('style#last-updated-styles')) {
        const style = document.createElement('style');
        style.id = 'last-updated-styles';
        style.textContent = `
            .last-updated {
                font-size: 12px;
                color: #64748b;
                margin-top: 4px;
                font-family: 'Inter', sans-serif;
                opacity: 0.8;
            }
            .dark-theme .last-updated {
                color: #a0aec0;
            }
        `;
        document.head.appendChild(style);
    }
    
    // Update last updated time if element exists
    if (!lastUpdatedElement && priceInfoElement) {
        const container = priceInfoElement.parentElement;
        if (container) {
            const updatedEl = document.createElement('div');
            updatedEl.className = 'last-updated';
            container.appendChild(updatedEl);
        }
    }
    
    // Format the last updated time
    const lastUpdatedElement2 = document.querySelector('.last-updated');
    if (lastUpdatedElement2) {
        const timeFormat = new Intl.DateTimeFormat(navigator.language, {
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit'
        });
        lastUpdatedElement2.textContent = 'Updated: ' + timeFormat.format(lastUpdated);
        
        // Add pulse animation to last updated text
        lastUpdatedElement2.classList.add('pulse');
        setTimeout(() => {
            lastUpdatedElement2.classList.remove('pulse');
        }, 1000);
        
        // Add pulse animation style if not already added
        if (!document.querySelector('style#pulse-animation')) {
            const style = document.createElement('style');
            style.id = 'pulse-animation';
            style.textContent = `
                @keyframes pulse {
                    0% { opacity: 0.8; }
                    50% { opacity: 1; }
                    100% { opacity: 0.8; }
                }
                .pulse {
                    animation: pulse 1s ease-in-out;
                }
            `;
            document.head.appendChild(style);
        }
    }
    
    // Update trading stats
    updateTradingStats(currentPrice);
    
    // Update profit card
    updateProfitCard(currentPrice, Math.abs(changePercent));
}

/**
 * Generate initial chart data
 */
function generateChartData() {
    const data = [];
    const periods = 30;
    
    let basePrice = 60000;
    let prevClose = basePrice;
    
    for (let i = 0; i < periods; i++) {
        const volatility = Math.random() * 200 - 100;
        const close = prevClose + volatility;
        
        // Generate OHLC data
        const open = prevClose;
        const high = Math.max(open, close) + Math.random() * 100;
        const low = Math.min(open, close) - Math.random() * 100;
        
        data.push({
            open,
            high,
            low,
            close,
            timestamp: Date.now() - (periods - i) * 3600000 // Hourly data
        });
        
        prevClose = close;
    }
    
    return data;
}

/**
 * Update chart data with new values
 */
function updateChartData(data) {
    if (!data || data.length === 0) return;
    
    // Remove oldest data point
    data.shift();
    
    // Get last close price
    const lastClose = data[data.length - 1].close;
    
    // Generate new data point
    const volatility = Math.random() * 200 - 100;
    const close = lastClose + volatility;
    
    // Generate OHLC data
    const open = lastClose;
    const high = Math.max(open, close) + Math.random() * 100;
    const low = Math.min(open, close) - Math.random() * 100;
    
    // Add new data point
    data.push({
        open,
        high,
        low,
        close,
        timestamp: Date.now()
    });
    
    // Update price info in dashboard
    updatePriceInfo(close, lastClose);
}

/**
 * Update price information in the dashboard
 */
function updatePriceInfo(currentPrice, previousPrice) {
    const priceInfoElement = document.querySelector('.price-info');
    const priceChangeElement = document.querySelector('.price-change');
    const selectedPairElement = document.querySelector('.selected-pair');
    
    if (!priceInfoElement) return;
    
    // Format price with thousands separator
    const formattedPrice = '$' + numberWithCommas(currentPrice.toFixed(2));
    
    // Calculate price change percentage
    const changePercent = ((currentPrice - previousPrice) / previousPrice) * 100;
    const formattedChange = changePercent.toFixed(1) + '%';
    
    // Update price info
    priceInfoElement.innerHTML = formattedPrice + ' <span class="price-change ' + (changePercent >= 0 ? 'positive' : 'negative') + '">' + (changePercent >= 0 ? '+' : '') + formattedChange + '</span>';
    
    // Update pair name if available
    if (selectedPairElement) {
        selectedPairElement.textContent = 'BTC/USDT';
    }
    
    // Update trading stats
    updateTradingStats(currentPrice);
    
    // Update profit card
    updateProfitCard(currentPrice, changePercent);
}

/**
 * Format number with commas as thousands separators
 */
function numberWithCommas(x) {
    return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Update trading stats with realistic values
 */
function updateTradingStats(currentPrice) {
    const tradingStats = document.querySelectorAll('.trading-stats .stat');
    
    if (!tradingStats.length) return;
    
    // Calculate realistic values based on current price
    const entryPrice = Math.floor(currentPrice * 0.97);
    const targetPrice = Math.floor(currentPrice * 1.05);
    const stopPrice = Math.floor(currentPrice * 0.95);
    
    // Update stats
    tradingStats.forEach(stat => {
        const label = stat.querySelector('.label');
        const value = stat.querySelector('.value');
        
        if (!label || !value) return;
        
        switch(label.textContent) {
            case 'Entry':
                value.textContent = '$' + numberWithCommas(entryPrice);
                break;
            case 'Target':
                value.textContent = '$' + numberWithCommas(targetPrice);
                break;
            case 'Stop':
                value.textContent = '$' + numberWithCommas(stopPrice);
                break;
        }
    });
}

/**
 * Update profit card with realistic values
 */
function updateProfitCard(currentPrice, changePercent) {
    const profitCardValue = document.querySelector('.profit-card .card-value');
    
    if (!profitCardValue) return;
    
    // Calculate daily profit based on current price and change percentage
    const profitAmount = (currentPrice * Math.abs(changePercent) * 0.5).toFixed(2);
    
    // Format profit amount
    const formattedProfit = '+$' + numberWithCommas(profitAmount);
    
    // Update profit card
    profitCardValue.textContent = formattedProfit;
}

/**
 * Draw grid lines on chart
 */
function drawGridLines(ctx, canvas) {
    const width = canvas.width;
    const height = canvas.height;
    
    ctx.beginPath();
    ctx.strokeStyle = 'rgba(230, 230, 230, 0.5)';
    ctx.lineWidth = 0.5;
    
    // Horizontal grid lines
    for (let i = 0; i < 5; i++) {
        const y = height * (i / 4);
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
    }
    
    // Vertical grid lines
    for (let i = 0; i < 6; i++) {
        const x = width * (i / 5);
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
    }
    
    ctx.stroke();
}

/**
 * Initialize dashboard interaction
 */
function initDashboardInteraction() {
    // Tab switching
    const tabs = document.querySelectorAll('.tab-item');
    if (!tabs.length) return;
    
    tabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            tabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Additional logic for showing different content based on tab
            // (For demo purposes, we'll just keep the Trading tab content)
        });
    });
    
    // Timeframe switching
    const timeframes = document.querySelectorAll('.timeframe');
    if (!timeframes.length) return;
    
    timeframes.forEach(timeframe => {
        timeframe.addEventListener('click', function() {
            // Remove active class from all timeframes
            timeframes.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked timeframe
            this.classList.add('active');
            
            // Additional logic for changing chart timeframe
            // (For demo purposes, we'll just update the UI)
        });
    });
    
    // Action buttons
    const actionButtons = document.querySelectorAll('.action-button');
    if (!actionButtons.length) return;
    
    actionButtons.forEach(button => {
        button.addEventListener('click', function() {
            // Remove active class from all action buttons
            actionButtons.forEach(b => b.classList.remove('active'));
            
            // Add active class to clicked button
            this.classList.add('active');
            
            // Additional logic for action button functionality
            // (For demo purposes, we'll just update the UI)
        });
    });
}

/**
 * Initialize particle animation for crypto particles
 */
function initParticleAnimation() {
    const particlesContainer = document.querySelector('.crypto-particles');
    if (!particlesContainer) return;
    
    // Clear existing particles first to prevent duplications
    while (particlesContainer.querySelector('.crypto-particle')) {
        particlesContainer.removeChild(particlesContainer.querySelector('.crypto-particle'));
    }
    
    // Create additional particles
    for (let i = 0; i < 8; i++) {
        const particle = document.createElement('div');
        particle.classList.add('crypto-particle');
        
        // Randomize particle properties
        const size = Math.floor(Math.random() * 4) + 3; // 3-6px
        const posX = Math.floor(Math.random() * 90) + 5; // 5-95%
        const posY = Math.floor(Math.random() * 90) + 5; // 5-95%
        const delay = Math.random() * 4; // 0-4s delay
        const duration = Math.random() * 8 + 8; // 8-16s duration
        
        // Set particle styles
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        particle.style.animationDelay = `${delay}s`;
        particle.style.animationDuration = `${duration}s`;
        
        // Add particle to container
        particlesContainer.appendChild(particle);
    }
    
    // Add specific interactions for floating cards
    initFloatingCardInteractions();
}

/**
 * Initialize floating card interactions
 */
function initFloatingCardInteractions() {
    const floatingCards = document.querySelectorAll('.floating-card');
    const heroVisual = document.querySelector('.hero-visual');
    
    if (!floatingCards.length || !heroVisual) return;
    
    // Ensure cards have appropriate z-index
    floatingCards.forEach((card, index) => {
        card.style.zIndex = 10 - index;
        
        // Prevent overlapping by adjusting positions for small screens
        if (window.innerWidth < 992) {
            if (card.classList.contains('profit-card')) {
                card.style.top = '-40px';
                card.style.right = '10px';
            } else if (card.classList.contains('alert-card')) {
                card.style.bottom = '-20px';
                card.style.left = '10px';
            }
        }
    });
    
    // Light mouse movement effect
    document.addEventListener('mousemove', function(e) {
        // Only apply on desktop
        if (window.innerWidth < 992) return;
        
        const mouseX = e.clientX / window.innerWidth;
        const mouseY = e.clientY / window.innerHeight;
        
        floatingCards.forEach(card => {
            const rect = heroVisual.getBoundingClientRect();
            const centerX = rect.left + rect.width / 2;
            const centerY = rect.top + rect.height / 2;
            
            const offsetX = (e.clientX - centerX) / 50;
            const offsetY = (e.clientY - centerY) / 50;
            
            // Apply subtle movement
            card.style.transform = `translate(${offsetX}px, ${offsetY}px)`;
        });
    });
    
    // Reset positions on window resize
    window.addEventListener('resize', function() {
        floatingCards.forEach(card => {
            card.style.transform = 'translate(0, 0)';
            
            // Apply specific positions based on screen size
            if (window.innerWidth < 992) {
                if (card.classList.contains('profit-card')) {
                    card.style.top = '-40px';
                    card.style.right = '10px';
                } else if (card.classList.contains('alert-card')) {
                    card.style.bottom = '-20px';
                    card.style.left = '10px';
                } else if (card.classList.contains('analysis-card')) {
                    card.style.display = 'none';
                }
            } else {
                if (card.classList.contains('profit-card')) {
                    card.style.top = '';
                    card.style.right = '';
                } else if (card.classList.contains('alert-card')) {
                    card.style.bottom = '';
                    card.style.left = '';
                } else if (card.classList.contains('analysis-card')) {
                    card.style.display = '';
                }
            }
        });
    });
}

/**
 * Initialize mobile menu functionality
 */
function initMobileMenu() {
    const mobileToggle = document.querySelector('.mobile-toggle');
    const premiumMobileMenu = document.querySelector('.premium-mobile-menu');
    
    if (mobileToggle && premiumMobileMenu) {
        mobileToggle.addEventListener('click', function() {
            mobileToggle.classList.toggle('active');
            premiumMobileMenu.classList.toggle('active');
            document.body.classList.toggle('menu-open');
        });
        
        // Close mobile menu when clicking a link
        const mobileLinks = premiumMobileMenu.querySelectorAll('a');
        mobileLinks.forEach(link => {
            link.addEventListener('click', function() {
                mobileToggle.classList.remove('active');
                premiumMobileMenu.classList.remove('active');
                document.body.classList.remove('menu-open');
            });
        });
    }
    
    // Add scroll event to change header background
    const premiumHeader = document.querySelector('.premium-header');
    if (premiumHeader) {
        window.addEventListener('scroll', function() {
            if (window.scrollY > 50) {
                premiumHeader.classList.add('scrolled');
            } else {
                premiumHeader.classList.remove('scrolled');
            }
        });
    }
}

/**
 * Initialize scroll effects and animations
 */
function initScrollEffects() {
    // Add progress indicator
    const progressIndicator = document.createElement('div');
    progressIndicator.classList.add('scroll-progress');
    document.body.appendChild(progressIndicator);
    
    // Update progress bar on scroll
    window.addEventListener('scroll', function() {
        const windowHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
        const scrollPosition = window.scrollY;
        const scrollPercentage = (scrollPosition / windowHeight) * 100;
        progressIndicator.style.width = scrollPercentage + '%';
    });
    
    // Add active class to navigation items based on scroll position
    const sections = document.querySelectorAll('section[id]');
    const navLinks = document.querySelectorAll('.nav-links a, .mobile-menu-links a');
    
    window.addEventListener('scroll', function() {
        let current = '';
        sections.forEach(section => {
            const sectionTop = section.offsetTop;
            const sectionHeight = section.clientHeight;
            if (window.scrollY >= (sectionTop - 200)) {
                current = section.getAttribute('id');
            }
        });

        navLinks.forEach(link => {
            link.classList.remove('active');
            if (link.getAttribute('href') === '#' + current) {
                link.classList.add('active');
            }
        });
    });
}

/**
 * Initialize waitlist form functionality
 */
function initWaitlistForm() {
    const waitlistForm = document.querySelector('.waitlist-form');
    
    if (!waitlistForm) return;
    
    waitlistForm.addEventListener('submit', function(e) {
        e.preventDefault();
        
        const emailInput = waitlistForm.querySelector('input[type="email"]');
        const formGroup = waitlistForm.querySelector('.form-group');
        
        if (!emailInput.value.trim()) {
            showFormError(emailInput, 'Please enter your email address');
            return;
        }
        
        // Show loading state
        const submitButton = waitlistForm.querySelector('button[type="submit"]');
        const originalButtonText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = 'Processing...';
        
        // Simulate form submission (replace with actual API call)
        setTimeout(function() {
            // Success state
            formGroup.innerHTML = '<div class="success-message"><svg viewBox="0 0 24 24" width="24" height="24"><circle cx="12" cy="12" r="11" fill="none" stroke="currentColor" stroke-width="2"></circle><path d="M7 13l3 3 7-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"></path></svg><p>Thank you for joining our waitlist! <br>We\'ll be in touch soon.</p></div>';
            
            // Show referral option
            const referralOption = document.createElement('div');
            referralOption.classList.add('referral-option');
            referralOption.innerHTML = `
                <p>Share with friends to get priority access:</p>
                <div class="share-buttons">
                    <a href="https://twitter.com/intent/tweet?text=I%20just%20joined%20the%20waitlist%20for%20TradeMaster%20AI%20-%20the%20advanced%20crypto%20trading%20bot.%20Join%20me!&url=https://trademasterai.com" target="_blank" class="twitter-share">Twitter</a>
                    <a href="https://www.linkedin.com/sharing/share-offsite/?url=https://trademasterai.com" target="_blank" class="linkedin-share">LinkedIn</a>
                </div>
            `;
            waitlistForm.appendChild(referralOption);
        }, 1500);
    });
    
    function showFormError(input, message) {
        const errorMessage = document.createElement('div');
        errorMessage.classList.add('error-message');
        errorMessage.textContent = message;
        
        // Remove any existing error messages
        const existingError = input.parentNode.querySelector('.error-message');
        if (existingError) {
            existingError.remove();
        }
        
        input.parentNode.appendChild(errorMessage);
        input.classList.add('error');
        
        input.addEventListener('input', function() {
            errorMessage.remove();
            input.classList.remove('error');
        }, { once: true });
    }
}

/**
 * Initialize animated counters for statistics
 */
function initCounters() {
    // Add stats section if it doesn't exist
    if (!document.querySelector('.stats-section')) {
        const statsSection = document.createElement('section');
        statsSection.classList.add('stats-section');
        statsSection.innerHTML = `
            <div class="container">
                <div class="stats-grid">
                    <div class="stat-item">
                        <div class="stat-number" data-count="1500">0</div>
                        <div class="stat-label">Active Users</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" data-count="97">0</div>
                        <div class="stat-label">Success Rate (%)</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" data-count="45000">0</div>
                        <div class="stat-label">Trades Executed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number" data-count="24">0</div>
                        <div class="stat-label">Supported Pairs</div>
                    </div>
                </div>
            </div>
        `;
        
        // Insert after about section
        const aboutSection = document.getElementById('about');
        if (aboutSection) {
            aboutSection.parentNode.insertBefore(statsSection, aboutSection.nextSibling);
        } else {
            document.body.appendChild(statsSection);
        }
    }
    
    // Initialize counter animation on scroll
    const statNumbers = document.querySelectorAll('.stat-number');
    
    const animateCounters = function() {
        statNumbers.forEach(counter => {
            const rect = counter.getBoundingClientRect();
            const isVisible = (
                rect.top >= 0 &&
                rect.left >= 0 &&
                rect.bottom <= (window.innerHeight || document.documentElement.clientHeight) &&
                rect.right <= (window.innerWidth || document.documentElement.clientWidth)
            );
            
            if (isVisible && !counter.classList.contains('counted')) {
                counter.classList.add('counted');
                
                const target = parseInt(counter.getAttribute('data-count'));
                const duration = 2000; // ms
                const startTime = performance.now();
                
                const updateCounter = function(currentTime) {
                    const elapsedTime = currentTime - startTime;
                    
                    if (elapsedTime < duration) {
                        const progress = elapsedTime / duration;
                        const currentValue = Math.round(progress * target);
                        counter.textContent = currentValue.toLocaleString();
                        requestAnimationFrame(updateCounter);
                    } else {
                        counter.textContent = target.toLocaleString();
                    }
                };
                
                requestAnimationFrame(updateCounter);
            }
        });
    };
    
    // Check counter visibility on scroll
    window.addEventListener('scroll', animateCounters);
    // Initial check
    animateCounters();
}

/**
 * Initialize dark mode functionality
 */
function initDarkMode() {
    // Find dark mode toggle in the premium header
    const darkModeToggle = document.querySelector('.premium-dark-mode');
    
    // If not found in header, create one as fallback
    if (!darkModeToggle) {
        const newDarkModeToggle = document.createElement('button');
        newDarkModeToggle.classList.add('dark-mode-toggle');
        newDarkModeToggle.setAttribute('aria-label', 'Toggle dark mode');
        newDarkModeToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg>';
        
        // Add toggle to navigation
        const nav = document.querySelector('nav');
        if (nav) {
            nav.appendChild(newDarkModeToggle);
        } else {
            document.body.appendChild(newDarkModeToggle);
        }
    }
    
    // Use existing toggle or the one we just created
    const toggleButton = darkModeToggle || document.querySelector('.dark-mode-toggle');
    
    if (!toggleButton) return;
    
    // Check for system preference
    const prefersDarkScheme = window.matchMedia('(prefers-color-scheme: dark)');
    
    // Check for saved preference
    const savedTheme = localStorage.getItem('theme');
    
    // Apply theme based on saved preference or system preference
    if (savedTheme === 'dark' || (!savedTheme && prefersDarkScheme.matches)) {
        document.body.classList.add('dark-theme');
        toggleButton.classList.add('active');
    }
    
    // Toggle dark mode
    toggleButton.addEventListener('click', function() {
        document.body.classList.toggle('dark-theme');
        toggleButton.classList.toggle('active');
        
        // Save preference
        if (document.body.classList.contains('dark-theme')) {
            localStorage.setItem('theme', 'dark');
        } else {
            localStorage.setItem('theme', 'light');
        }
    });
    
    // Listen for system preference changes
    prefersDarkScheme.addEventListener('change', function(e) {
        if (!localStorage.getItem('theme')) {
            if (e.matches) {
                document.body.classList.add('dark-theme');
                toggleButton.classList.add('active');
            } else {
                document.body.classList.remove('dark-theme');
                toggleButton.classList.remove('active');
            }
        }
    });
    
    // Add dark mode toggle to mobile menu as well
    const premiumMobileMenu = document.querySelector('.premium-mobile-menu');
    if (premiumMobileMenu && !premiumMobileMenu.querySelector('.premium-dark-mode-mobile')) {
        const mobileToggle = document.createElement('button');
        mobileToggle.classList.add('premium-dark-mode-mobile');
        mobileToggle.setAttribute('aria-label', 'Toggle dark mode');
        mobileToggle.innerHTML = '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path></svg> <span>Toggle Dark Mode</span>';
        
        // Style the mobile toggle
        mobileToggle.style.background = 'rgba(255, 255, 255, 0.1)';
        mobileToggle.style.border = 'none';
        mobileToggle.style.color = '#fff';
        mobileToggle.style.padding = '12px 20px';
        mobileToggle.style.borderRadius = '8px';
        mobileToggle.style.display = 'flex';
        mobileToggle.style.alignItems = 'center';
        mobileToggle.style.justifyContent = 'center';
        mobileToggle.style.gap = '8px';
        mobileToggle.style.cursor = 'pointer';
        mobileToggle.style.marginTop = '30px';
        mobileToggle.style.fontSize = '1.6rem';
        mobileToggle.style.fontWeight = '500';
        
        if (document.body.classList.contains('dark-theme')) {
            mobileToggle.classList.add('active');
        }
        
        // Add the same click event
        mobileToggle.addEventListener('click', function() {
            document.body.classList.toggle('dark-theme');
            toggleButton.classList.toggle('active');
            mobileToggle.classList.toggle('active');
            
            // Save preference
            if (document.body.classList.contains('dark-theme')) {
                localStorage.setItem('theme', 'dark');
            } else {
                localStorage.setItem('theme', 'light');
            }
        });
        
        premiumMobileMenu.appendChild(mobileToggle);
    }
}

function getBinanceInterval(interval) {
    switch(interval) {
        case '1h':
            return '1h';
        case '4h':
            return '4h';
        case '1d':
            return '1d';
        default:
            return '1h';
    }
}

/**
 * Initialize the interactive demo section
 */
function initDemoSection() {
    // Get elements
    const scenarioControls = document.querySelectorAll('.scenario-control');
    const infoTabs = document.querySelectorAll('.info-tab');
    const infoPanels = document.querySelectorAll('.info-panel');
    
    // Set up scenario control clicks
    scenarioControls.forEach(control => {
        control.addEventListener('click', function() {
            // Remove active class from all controls
            scenarioControls.forEach(c => c.classList.remove('active'));
            
            // Add active class to clicked control
            this.classList.add('active');
            
            // Get scenario type
            const scenarioType = this.getAttribute('data-scenario');
            
            // Update chart based on scenario
            updateDemoChart(scenarioType);
        });
    });
    
    // Set up info tab clicks
    infoTabs.forEach(tab => {
        tab.addEventListener('click', function() {
            // Remove active class from all tabs
            infoTabs.forEach(t => t.classList.remove('active'));
            
            // Add active class to clicked tab
            this.classList.add('active');
            
            // Get tab target
            const tabTarget = this.getAttribute('data-tab');
            
            // Hide all panels
            infoPanels.forEach(panel => {
                panel.classList.remove('active');
            });
            
            // Show target panel
            const targetPanel = document.querySelector(`.${tabTarget}-panel`);
            if (targetPanel) {
                targetPanel.classList.add('active');
            }
        });
    });
    
    // Initialize the demo chart
    initDemoChart();
}

/**
 * Initialize the demo chart using Chart.js
 */
function initDemoChart() {
    const chartCanvas = document.getElementById('demo-chart');
    if (!chartCanvas) return;
    
    // Create empty chart with loading state
    createEmptyDemoChart();
    
    // Fetch real data from Binance
    fetchRealBinanceData();
}

/**
 * Create empty demo chart with loading state
 */
function createEmptyDemoChart() {
    const chartCanvas = document.getElementById('demo-chart');
    if (!chartCanvas) return;
    
    // Create gradient for chart area
    const ctx = chartCanvas.getContext('2d');
    const gradientFill = ctx.createLinearGradient(0, 0, 0, chartCanvas.height);
    gradientFill.addColorStop(0, 'rgba(247, 147, 26, 0.2)');
    gradientFill.addColorStop(1, 'rgba(247, 147, 26, 0.01)');
    
    // Create empty chart with improved visual style
    const chartInstance = new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'BTC/USDT',
                data: [],
                borderColor: '#f7931a',
                backgroundColor: gradientFill,
                borderWidth: 2.5,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: '#ffffff',
                pointHoverBorderColor: '#f7931a',
                pointHoverBorderWidth: 2,
                tension: 0.35,
                fill: true
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            animation: {
                duration: 1500,
                easing: 'easeOutQuart'
            },
            interaction: {
                mode: 'index',
                intersect: false
            },
            plugins: {
                legend: {
                    display: false
                },
                tooltip: {
                    enabled: true,
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(255, 255, 255, 0.9)',
                    titleColor: '#1a202c',
                    bodyColor: '#1a202c',
                    borderColor: 'rgba(247, 147, 26, 0.3)',
                    borderWidth: 1,
                    cornerRadius: 6,
                    padding: 10,
                    titleFont: {
                        size: 13,
                        weight: 'bold'
                    },
                    bodyFont: {
                        size: 12
                    },
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += new Intl.NumberFormat('en-US', {
                                    style: 'currency',
                                    currency: 'USD'
                                }).format(context.parsed.y);
                            }
                            return label;
                        }
                    }
                }
            },
            scales: {
                x: {
                    grid: {
                        display: false
                    },
                    ticks: {
                        maxRotation: 0,
                        font: {
                            size: 10,
                            family: "'Inter', sans-serif"
                        },
                        color: '#64748b'
                    },
                    border: {
                        color: 'rgba(100, 116, 139, 0.1)'
                    }
                },
                y: {
                    position: 'right',
                    grid: {
                        color: 'rgba(100, 116, 139, 0.1)',
                        drawBorder: false
                    },
                    ticks: {
                        callback: function(value) {
                            return '$' + value.toLocaleString();
                        },
                        font: {
                            size: 10,
                            family: "'Inter', sans-serif"
                        },
                        color: '#64748b',
                        padding: 8
                    },
                    border: {
                        display: false
                    }
                }
            }
        }
    });
    
    // Store the chart instance for later updates
    window.demoChartInstance = chartInstance;
    
    // Add loading indicator
    const chartContainer = chartCanvas.parentElement;
    if (chartContainer) {
        const loadingIndicator = document.createElement('div');
        loadingIndicator.className = 'chart-loading-indicator';
        loadingIndicator.innerHTML = `
            <div class="loading-spinner"></div>
            <div>Loading real-time data from Binance...</div>
        `;
        
        // Create and add styles for loading indicator
        if (!document.querySelector('#chart-loading-styles')) {
            const style = document.createElement('style');
            style.id = 'chart-loading-styles';
            style.textContent = `
                .chart-loading-indicator {
                    position: absolute;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    justify-content: center;
                    background: rgba(255, 255, 255, 0.9);
                    color: #1a202c;
                    font-size: 14px;
                    z-index: 10;
                    backdrop-filter: blur(3px);
                    transition: opacity 0.3s ease;
                }
                .dark-theme .chart-loading-indicator {
                    background: rgba(26, 32, 44, 0.9);
                    color: #f7f7f7;
                }
                .loading-spinner {
                    border: 3px solid rgba(247, 147, 26, 0.3);
                    border-radius: 50%;
                    border-top: 3px solid #f7931a;
                    width: 24px;
                    height: 24px;
                    animation: spin 1s linear infinite;
                    margin-bottom: 10px;
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }
            `;
            document.head.appendChild(style);
        }
        
        chartContainer.style.position = 'relative';
        chartContainer.appendChild(loadingIndicator);
    }
}

/**
 * Fetch real data from Binance API
 */
function fetchRealBinanceData() {
    // Use Binance API for klines (candlestick) data - 1h timeframe
    const binanceUrl = 'https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=1h&limit=24';
    
    fetch(binanceUrl)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                // Format data for chart
                const timeLabels = [];
                const priceData = [];
                
                data.forEach(candle => {
                    // Binance kline data structure:
                    // [0] Open time, [1] Open, [2] High, [3] Low, [4] Close, etc.
                    const timestamp = new Date(candle[0]);
                    const hour = timestamp.getHours() % 12 || 12;
                    const ampm = timestamp.getHours() >= 12 ? 'PM' : 'AM';
                    const closePrice = parseFloat(candle[4]);
                    
                    timeLabels.push(`${hour}:00 ${ampm}`);
                    priceData.push(closePrice);
                });
                
                // Update chart with real data
                updateDemoChartWithRealData(timeLabels, priceData);
                
                // Remove loading indicator
                removeChartLoadingIndicator();
                
                // Also update current price display in chart info
                updateCurrentPriceDisplay(priceData[priceData.length - 1]);
                
                // Get current price change from 24h ago
                const priceChange = ((priceData[priceData.length - 1] - priceData[0]) / priceData[0]) * 100;
                updatePriceChangeDisplay(priceChange);
                
                // Store the real data for scenario updates
                window.realBinanceData = {
                    labels: timeLabels,
                    prices: priceData
                };
                
                // Update position-reversal scenario by default (initial view)
                updateDemoChart('position-reversal');
            } else {
                throw new Error('Invalid data format');
            }
        })
        .catch(error => {
            console.error('Error fetching real Binance data:', error);
            // If error, fall back to generated data
            fallbackToDemoData();
        });
}

/**
 * Update the demo chart with real data from Binance
 */
function updateDemoChartWithRealData(timeLabels, priceData) {
    if (!window.demoChartInstance) return;
    
    window.demoChartInstance.data.labels = timeLabels;
    window.demoChartInstance.data.datasets[0].data = priceData;
    window.demoChartInstance.update();
}

/**
 * Update the current price display in the chart header
 */
function updateCurrentPriceDisplay(currentPrice) {
    const balanceElement = document.querySelector('.chart-balance');
    if (balanceElement) {
        balanceElement.textContent = `BTC Price: $${numberWithCommas(currentPrice.toFixed(2))}`;
    }
}

/**
 * Update price change display
 */
function updatePriceChangeDisplay(priceChange) {
    const timeframeElement = document.querySelector('.chart-timeframe');
    if (timeframeElement) {
        const changeClass = priceChange >= 0 ? 'positive-change' : 'negative-change';
        const changePrefix = priceChange >= 0 ? '+' : '';
        timeframeElement.innerHTML = `24h Change: <span class="${changeClass}">${changePrefix}${priceChange.toFixed(2)}%</span>`;
        
        // Add styles for price change if not already added
        if (!document.querySelector('#price-change-styles')) {
            const style = document.createElement('style');
            style.id = 'price-change-styles';
            style.textContent = `
                .positive-change {
                    color: #2ecc71;
                    font-weight: 600;
                }
                .negative-change {
                    color: #e74c3c;
                    font-weight: 600;
                }
            `;
            document.head.appendChild(style);
        }
    }
}

/**
 * Remove loading indicator when data is loaded
 */
function removeChartLoadingIndicator() {
    const loadingIndicator = document.querySelector('.chart-loading-indicator');
    if (loadingIndicator) {
        loadingIndicator.style.opacity = '0';
        setTimeout(() => {
            loadingIndicator.remove();
        }, 300);
    }
}

/**
 * Fallback to demo data if API call fails
 */
function fallbackToDemoData() {
    removeChartLoadingIndicator();
    
    // Generate demo data
    const timeLabels = [];
    const priceData = [];
    
    // Generate data for 24 hours (hourly)
    const basePrice = 60000;
    let currentPrice = basePrice;
    
    for (let i = 0; i < 24; i++) {
        // Create time label (1:00, 2:00, etc.)
        const hour = i % 12 === 0 ? 12 : i % 12;
        const ampm = i < 12 ? 'AM' : 'PM';
        timeLabels.push(`${hour}:00 ${ampm}`);
        
        // Add some randomness to price
        const change = (Math.random() - 0.4) * 500; // Slightly upward bias
        currentPrice += change;
        priceData.push(currentPrice);
    }
    
    // Update chart with generated data
    updateDemoChartWithRealData(timeLabels, priceData);
    
    // Store the demo data for scenario updates
    window.realBinanceData = {
        labels: timeLabels,
        prices: priceData
    };
    
    // Update position-reversal scenario by default
    updateDemoChart('position-reversal');
    
    // Show message about using demo data
    const chartWrapper = document.querySelector('.chart-wrapper');
    if (chartWrapper) {
        const errorMessage = document.createElement('div');
        errorMessage.className = 'data-error-message';
        errorMessage.textContent = 'Using demo data (Binance API unavailable)';
        
        // Add styles for error message
        if (!document.querySelector('#error-message-styles')) {
            const style = document.createElement('style');
            style.id = 'error-message-styles';
            style.textContent = `
                .data-error-message {
                    position: absolute;
                    top: 10px;
                    right: 10px;
                    background: rgba(231, 76, 60, 0.1);
                    color: #e74c3c;
                    padding: 5px 10px;
                    border-radius: 4px;
                    font-size: 12px;
                    z-index: 5;
                }
            `;
            document.head.appendChild(style);
        }
        
        chartWrapper.appendChild(errorMessage);
    }
}

/**
 * Update the demo chart based on selected scenario
 */
function updateDemoChart(scenarioType) {
    if (!window.demoChartInstance) return;
    
    // Clear existing chart signals
    const chartSignals = document.querySelector('.chart-signals');
    if (chartSignals) {
        chartSignals.innerHTML = '';
    }
    
    // Use real data if available, otherwise use existing chart data
    let baseLabels = [];
    let baseData = [];
    
    if (window.realBinanceData) {
        baseLabels = [...window.realBinanceData.labels];
        baseData = [...window.realBinanceData.prices];
    } else {
        baseLabels = [...window.demoChartInstance.data.labels];
        baseData = [...window.demoChartInstance.data.datasets[0].data];
    }
    
    // Create new data based on scenario
    let newData = [...baseData];
    
    // Remove any existing annotations
    if (window.demoChartInstance.options.plugins.annotation) {
        window.demoChartInstance.options.plugins.annotation.annotations = {};
    } else {
        window.demoChartInstance.options.plugins = {
            ...window.demoChartInstance.options.plugins,
            annotation: {
                annotations: {}
            }
        };
    }
    
    const annotations = {};
    
    switch(scenarioType) {
        case 'position-reversal':
            // Modify data to show a reversal pattern
            // Preserve most of the real data but modify the last third to show the pattern
            const midPoint = Math.floor(newData.length * 0.66);
            const startValue = newData[midPoint];
            
            // Create a downtrend followed by uptrend
            for (let i = midPoint; i < newData.length; i++) {
                if (i < midPoint + Math.floor((newData.length - midPoint) * 0.6)) {
                    // Downtrend: Decrease by 1-3% per candle
                    const decrease = startValue * (0.01 + Math.random() * 0.02) * ((i - midPoint) + 1);
                    newData[i] = startValue - decrease;
                } else {
                    // Strong uptrend: Increase by 2-4% per candle
                    const lowest = Math.min(...newData.slice(midPoint, i));
                    const increase = lowest * (0.02 + Math.random() * 0.02) * ((i - (midPoint + Math.floor((newData.length - midPoint) * 0.6))) + 1);
                    newData[i] = lowest + increase;
                }
            }
            
            // Add signals
            if (chartSignals) {
                // Add sell signal
                const sellSignal = document.createElement('div');
                sellSignal.className = 'trade-signal sell-signal';
                sellSignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Smart Sell</div>
                `;
                sellSignal.style.position = 'absolute';
                sellSignal.style.top = '30%';
                sellSignal.style.left = '68%';
                chartSignals.appendChild(sellSignal);
                
                // Add buy signal
                const buySignal = document.createElement('div');
                buySignal.className = 'trade-signal buy-signal';
                buySignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Smart Buy</div>
                `;
                buySignal.style.position = 'absolute';
                buySignal.style.bottom = '25%';
                buySignal.style.right = '15%';
                chartSignals.appendChild(buySignal);
            }
            
            // Add chart annotations
            const sellIndex = midPoint + Math.floor((newData.length - midPoint) * 0.3);
            const lowestIndex = newData.indexOf(Math.min(...newData.slice(midPoint)));
            const buyIndex = lowestIndex + 1;
            
            // Sell line annotation
            annotations.sellLine = {
                type: 'line',
                xMin: sellIndex,
                xMax: sellIndex,
                borderColor: 'rgba(231, 76, 60, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Smart Sell',
                    position: 'start',
                    backgroundColor: 'rgba(231, 76, 60, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Buy line annotation
            annotations.buyLine = {
                type: 'line',
                xMin: buyIndex,
                xMax: buyIndex,
                borderColor: 'rgba(46, 204, 113, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Smart Buy',
                    position: 'start',
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Add downtrend zone
            annotations.downtrendZone = {
                type: 'box',
                xMin: midPoint,
                xMax: lowestIndex,
                backgroundColor: 'rgba(231, 76, 60, 0.08)',
                borderColor: 'rgba(231, 76, 60, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'DOWNTREND',
                    position: 'center',
                    color: 'rgba(231, 76, 60, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Add uptrend zone
            annotations.uptrendZone = {
                type: 'box',
                xMin: lowestIndex,
                xMax: newData.length - 1,
                backgroundColor: 'rgba(46, 204, 113, 0.08)',
                borderColor: 'rgba(46, 204, 113, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'UPTREND',
                    position: 'center',
                    color: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Update action list
            const lastPrice = Math.round(newData[newData.length - 1]);
            const sellPrice = Math.round(newData[midPoint + Math.floor((newData.length - midPoint) * 0.3)]);
            const lowestPrice = Math.round(Math.min(...newData.slice(midPoint)));
            
            updateActionList([
                { type: 'system', time: '12:15:30', description: 'Detecting trend reversal pattern...' },
                { type: 'sell', time: '12:30:15', description: `Entry at $${numberWithCommas(sellPrice)} • 0.25 BTC` },
                { type: 'tp', time: '14:45:22', description: `Exit at $${numberWithCommas(lowestPrice)} • +${(((sellPrice - lowestPrice) / sellPrice) * 100).toFixed(2)}%` },
                { type: 'system', time: '15:20:05', description: 'Bullish pattern detected' },
                { type: 'buy', time: '15:35:10', description: `Entry at $${numberWithCommas(lowestPrice + 100)} • 0.26 BTC` }
            ]);
            break;
            
        case 'take-profit':
            // Create uptrend pattern followed by profit taking points
            const quarterPoint = Math.floor(newData.length * 0.25);
            const baseValue = newData[quarterPoint];
            
            // Create a strong uptrend for demonstration
            for (let i = quarterPoint; i < newData.length; i++) {
                // Calculated percentage: Start low and gradually increase for a smooth curve
                const percentage = Math.min(0.3, (i - quarterPoint) / (newData.length - quarterPoint) * 0.3);
                
                // Add some noise for realism
                const noise = (Math.random() - 0.3) * 0.01 * baseValue;
                
                // Apply the uptrend with randomness for a natural look
                if (i <= Math.floor(newData.length * 0.75)) {
                    newData[i] = baseValue * (1 + percentage) + noise;
                } else {
                    // Slight pullback after reaching peak 
                    newData[i] = newData[Math.floor(newData.length * 0.75)] * (1 - (i - Math.floor(newData.length * 0.75)) * 0.01) + noise;
                }
            }
            
            // Find entry and exit points for annotations
            const entryIndex = quarterPoint;
            const entryPrice = Math.round(newData[entryIndex]);
            
            // Calculate TP levels at 33%, 66% and 100% of the uptrend
            const tp1Index = Math.floor(entryIndex + (newData.length - entryIndex) * 0.33);
            const tp2Index = Math.floor(entryIndex + (newData.length - entryIndex) * 0.66);
            const tp3Index = Math.floor(entryIndex + (newData.length - entryIndex) * 0.9);
            
            const tp1Price = Math.round(newData[tp1Index]);
            const tp2Price = Math.round(newData[tp2Index]);
            const tp3Price = Math.round(newData[tp3Index]);
            
            // Add signals
            if (chartSignals) {
                // Add entry signal
                const entrySignal = document.createElement('div');
                entrySignal.className = 'trade-signal buy-signal';
                entrySignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Smart Buy</div>
                `;
                entrySignal.style.position = 'absolute';
                entrySignal.style.bottom = '45%';
                entrySignal.style.left = '25%';
                chartSignals.appendChild(entrySignal);
                
                // Add TP signals
                const tp1Signal = document.createElement('div');
                tp1Signal.className = 'trade-signal tp-signal';
                tp1Signal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">TP 1</div>
                `;
                tp1Signal.style.position = 'absolute';
                tp1Signal.style.top = '40%';
                tp1Signal.style.left = '45%';
                chartSignals.appendChild(tp1Signal);
                
                const tp2Signal = document.createElement('div');
                tp2Signal.className = 'trade-signal tp-signal';
                tp2Signal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">TP 2</div>
                `;
                tp2Signal.style.position = 'absolute';
                tp2Signal.style.top = '25%';
                tp2Signal.style.left = '65%';
                chartSignals.appendChild(tp2Signal);
                
                const tp3Signal = document.createElement('div');
                tp3Signal.className = 'trade-signal tp-signal';
                tp3Signal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">TP 3</div>
                `;
                tp3Signal.style.position = 'absolute';
                tp3Signal.style.top = '20%';
                tp3Signal.style.right = '15%';
                chartSignals.appendChild(tp3Signal);
                
                // Add styles for TP signals if not already present
                if (!document.querySelector('#tp-signal-styles')) {
                    const style = document.createElement('style');
                    style.id = 'tp-signal-styles';
                    style.textContent = `
                        .tp-signal {
                            background-color: rgba(52, 152, 219, 0.15);
                            border: 1px solid rgba(52, 152, 219, 0.6);
                            color: #3498db;
                        }
                        .tp-signal .signal-icon {
                            background-color: #3498db;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            // Add chart annotations
            // Entry point annotation
            annotations.entryLine = {
                type: 'line',
                xMin: entryIndex,
                xMax: entryIndex,
                borderColor: 'rgba(46, 204, 113, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Smart Buy',
                    position: 'start',
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Take profit lines
            annotations.tp1Line = {
                type: 'line',
                xMin: tp1Index,
                xMax: tp1Index,
                borderColor: 'rgba(52, 152, 219, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'TP 1',
                    position: 'start',
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            annotations.tp2Line = {
                type: 'line',
                xMin: tp2Index,
                xMax: tp2Index,
                borderColor: 'rgba(52, 152, 219, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'TP 2',
                    position: 'start',
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            annotations.tp3Line = {
                type: 'line',
                xMin: tp3Index,
                xMax: tp3Index,
                borderColor: 'rgba(52, 152, 219, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'TP 3',
                    position: 'start',
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Add uptrend zone
            annotations.uptrendZone = {
                type: 'box',
                xMin: entryIndex,
                xMax: tp3Index,
                backgroundColor: 'rgba(46, 204, 113, 0.08)',
                borderColor: 'rgba(46, 204, 113, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'UPTREND ZONE',
                    position: 'center',
                    color: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Calculate profit percentages
            const tp1Percent = (((tp1Price - entryPrice) / entryPrice) * 100).toFixed(2);
            const tp2Percent = (((tp2Price - entryPrice) / entryPrice) * 100).toFixed(2);
            const tp3Percent = (((tp3Price - entryPrice) / entryPrice) * 100).toFixed(2);
            
            // Update action list
            updateActionList([
                { type: 'system', time: '09:15:10', description: 'Analyzing uptrend pattern...' },
                { type: 'buy', time: '09:30:25', description: `Entry at $${numberWithCommas(entryPrice)} • 0.5 BTC` },
                { type: 'tp', time: '11:45:18', description: `TP 1: Exit 0.15 BTC at $${numberWithCommas(tp1Price)} • +${tp1Percent}%` },
                { type: 'tp', time: '13:20:05', description: `TP 2: Exit 0.25 BTC at $${numberWithCommas(tp2Price)} • +${tp2Percent}%` },
                { type: 'system', time: '15:05:12', description: 'Trailing stop activated' },
                { type: 'tp', time: '15:35:30', description: `TP 3: Exit 0.10 BTC at $${numberWithCommas(tp3Price)} • +${tp3Percent}%` }
            ]);
            break;
            
        case 're-entry':
            // Create a pattern with initial uptrend, pullback, and re-entry
            
            // Start with an uptrend for the first third
            const firstThird = Math.floor(newData.length * 0.3);
            const secondThird = Math.floor(newData.length * 0.6);
            const baseReentryValue = newData[0];
            
            // Initial uptrend
            for (let i = 0; i < firstThird; i++) {
                const upPercentage = (i / firstThird) * 0.2; // Up to 20% increase
                const noise = (Math.random() - 0.4) * 0.005 * baseReentryValue;
                newData[i] = baseReentryValue * (1 + upPercentage) + noise;
            }
            
            // Pullback (correction) in the second third
            const peakValue = newData[firstThird - 1];
            for (let i = firstThird; i < secondThird; i++) {
                // Calculate percentage through the pullback phase (0-1)
                const pullbackProgress = (i - firstThird) / (secondThird - firstThird);
                
                // Pullback depth - moves from 0% to a maximum of 15% then back to 10%
                let pullbackDepth;
                if (pullbackProgress < 0.7) {
                    // Deepen to maximum pullback
                    pullbackDepth = pullbackProgress * 0.15;
                } else {
                    // Slight recovery before re-entry
                    pullbackDepth = 0.15 - (pullbackProgress - 0.7) * 0.05 / 0.3;
                }
                
                const noise = (Math.random() - 0.5) * 0.01 * peakValue;
                newData[i] = peakValue * (1 - pullbackDepth) + noise;
            }
            
            // Re-entry and continuation pattern
            const lowestCorrection = Math.min(...newData.slice(firstThird, secondThird));
            for (let i = secondThird; i < newData.length; i++) {
                // Calculate progress through the final phase
                const progress = (i - secondThird) / (newData.length - secondThird);
                
                // Strong recovery after re-entry
                const recoveryPercentage = progress * 0.25; // Up to 25% recovery
                const noise = (Math.random() - 0.3) * 0.005 * lowestCorrection;
                newData[i] = lowestCorrection * (1 + recoveryPercentage) + noise;
            }
            
            // Find key points for annotations
            const initialEntryIndex = Math.floor(firstThird * 0.5);
            const initialEntryPrice = Math.round(newData[initialEntryIndex]);
            
            const exitIndex = firstThird + Math.floor((secondThird - firstThird) * 0.3);
            const exitPrice = Math.round(newData[exitIndex]);
            
            const reEntryIndex = secondThird;
            const reEntryPrice = Math.round(newData[reEntryIndex]);
            
            const finalPrice = Math.round(newData[newData.length - 1]);
            
            // Add signals
            if (chartSignals) {
                // Add initial entry signal
                const entrySignal = document.createElement('div');
                entrySignal.className = 'trade-signal buy-signal';
                entrySignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Smart Buy</div>
                `;
                entrySignal.style.position = 'absolute';
                entrySignal.style.top = '55%';
                entrySignal.style.left = '15%';
                chartSignals.appendChild(entrySignal);
                
                // Add exit signal
                const exitSignal = document.createElement('div');
                exitSignal.className = 'trade-signal tp-signal';
                exitSignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Smart Sell</div>
                `;
                exitSignal.style.position = 'absolute';
                exitSignal.style.top = '25%';
                exitSignal.style.left = '35%';
                chartSignals.appendChild(exitSignal);
                
                // Add re-entry signal
                const reEntrySignal = document.createElement('div');
                reEntrySignal.className = 'trade-signal re-entry-signal';
                reEntrySignal.innerHTML = `
                    <div class="signal-icon"></div>
                    <div class="signal-text">Re-entry</div>
                `;
                reEntrySignal.style.position = 'absolute';
                reEntrySignal.style.top = '45%';
                reEntrySignal.style.left = '60%';
                chartSignals.appendChild(reEntrySignal);
                
                // Add styles for re-entry signals if not already present
                if (!document.querySelector('#re-entry-signal-styles')) {
                    const style = document.createElement('style');
                    style.id = 're-entry-signal-styles';
                    style.textContent = `
                        .re-entry-signal {
                            background-color: rgba(156, 89, 209, 0.15);
                            border: 1px solid rgba(156, 89, 209, 0.6);
                            color: #9c59d1;
                        }
                        .re-entry-signal .signal-icon {
                            background-color: #9c59d1;
                        }
                    `;
                    document.head.appendChild(style);
                }
            }
            
            // Add chart annotations
            // Initial entry point annotation
            annotations.initialEntryLine = {
                type: 'line',
                xMin: initialEntryIndex,
                xMax: initialEntryIndex,
                borderColor: 'rgba(46, 204, 113, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Smart Buy',
                    position: 'start',
                    backgroundColor: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Exit point annotation
            annotations.exitLine = {
                type: 'line',
                xMin: exitIndex,
                xMax: exitIndex,
                borderColor: 'rgba(52, 152, 219, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Smart Sell',
                    position: 'start',
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Re-entry point annotation
            annotations.reEntryLine = {
                type: 'line',
                xMin: reEntryIndex,
                xMax: reEntryIndex,
                borderColor: 'rgba(156, 89, 209, 0.7)',
                borderWidth: 1.5,
                borderDash: [5, 5],
                label: {
                    display: true,
                    content: 'Re-entry',
                    position: 'start',
                    backgroundColor: 'rgba(156, 89, 209, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Add zone annotations
            annotations.uptrendZone = {
                type: 'box',
                xMin: 0,
                xMax: firstThird,
                backgroundColor: 'rgba(46, 204, 113, 0.08)',
                borderColor: 'rgba(46, 204, 113, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'UPTREND',
                    position: 'center',
                    color: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            annotations.correctionZone = {
                type: 'box',
                xMin: firstThird,
                xMax: secondThird,
                backgroundColor: 'rgba(231, 76, 60, 0.08)',
                borderColor: 'rgba(231, 76, 60, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'CORRECTION',
                    position: 'center',
                    color: 'rgba(231, 76, 60, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            annotations.reentryUptrendZone = {
                type: 'box',
                xMin: secondThird,
                xMax: newData.length - 1,
                backgroundColor: 'rgba(46, 204, 113, 0.08)',
                borderColor: 'rgba(46, 204, 113, 0.2)',
                borderWidth: 1,
                label: {
                    display: true,
                    content: 'NEW UPTREND',
                    position: 'center',
                    color: 'rgba(46, 204, 113, 0.7)',
                    font: {
                        size: 11,
                        weight: 'bold'
                    }
                }
            };
            
            // Calculate profit percentages
            const initialProfitPercent = (((exitPrice - initialEntryPrice) / initialEntryPrice) * 100).toFixed(2);
            const reEntryProfitPercent = (((finalPrice - reEntryPrice) / reEntryPrice) * 100).toFixed(2);
            
            // Update action list
            updateActionList([
                { type: 'buy', time: '10:15:40', description: `Entry at $${numberWithCommas(initialEntryPrice)} • 0.35 BTC` },
                { type: 'tp', time: '11:30:22', description: `Exit at $${numberWithCommas(exitPrice)} • +${initialProfitPercent}%` },
                { type: 'system', time: '13:05:15', description: 'Analyzing pullback pattern...' },
                { type: 'system', time: '14:10:05', description: 'Re-entry condition detected' },
                { type: 'buy', time: '14:15:30', description: `Re-entry at $${numberWithCommas(reEntryPrice)} • 0.40 BTC` },
                { type: 'system', time: '16:45:18', description: `Current profit: +${reEntryProfitPercent}%` }
            ]);
            break;
    }

    // Set chart annotations
    window.demoChartInstance.options.plugins.annotation.annotations = annotations;
    
    // Add required annotation plugin if needed
    if (!Chart.annotationSupported) {
        const script = document.createElement('script');
        script.src = 'https://cdn.jsdelivr.net/npm/chartjs-plugin-annotation@2.1.0/dist/chartjs-plugin-annotation.min.js';
        script.onload = function() {
            Chart.annotationSupported = true;
            Chart.register(ChartAnnotation);
            // Update chart with new data
            window.demoChartInstance.data.labels = baseLabels;
            window.demoChartInstance.data.datasets[0].data = newData;
            window.demoChartInstance.update();
        };
        document.head.appendChild(script);
    } else {
        // Update chart with new data
        window.demoChartInstance.data.labels = baseLabels;
        window.demoChartInstance.data.datasets[0].data = newData;
        window.demoChartInstance.update();
    }
}

/**
 * Update the action list in the demo section
 */
function updateActionList(actions) {
    const actionList = document.querySelector('.action-list');
    if (!actionList) return;
    
    // Clear existing actions
    actionList.innerHTML = '';
    
    // Add new actions
    actions.forEach(action => {
        const actionItem = document.createElement('div');
        actionItem.className = `action-item ${action.type}`;
        actionItem.innerHTML = `
            <div class="action-time">${action.time}</div>
            <div class="action-description">
                <div class="action-type">${action.type.toUpperCase()}</div>
                <div class="action-details">${action.description}</div>
            </div>
        `;
        actionList.appendChild(actionItem);
    });
} 