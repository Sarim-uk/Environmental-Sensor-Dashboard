// DOM Elements
const apiConfigSection = document.getElementById('apiConfig');
const channelIdInput = document.getElementById('channelId');
const apiKeyInput = document.getElementById('apiKey');
const saveConfigBtn = document.getElementById('saveConfig');
const configStatusDiv = document.getElementById('configStatus');
const loadingIndicator = document.getElementById('loadingIndicator');
const errorDisplay = document.getElementById('errorDisplay');
const errorMessage = document.getElementById('errorMessage');
const currentReadingsSection = document.getElementById('currentReadings');
const historicalDataSection = document.getElementById('historicalData');
const exportDataBtn = document.getElementById('exportData');
const timeRangeBtns = document.querySelectorAll('.time-range-btn');
const lastUpdateTime = document.getElementById('lastUpdateTime');

// Gauge and value elements
const temperatureGauge = document.getElementById('temperatureGauge');
const humidityGauge = document.getElementById('humidityGauge');
const gasGauge = document.getElementById('gasGauge');
const temperatureValue = document.getElementById('temperatureValue');
const humidityValue = document.getElementById('humidityValue');
const gasValue = document.getElementById('gasValue');

// Chart elements
const historyChartCanvas = document.getElementById('historyChart');
let historyChart = null;

// Application state
let config = {
    channelId: '',
    apiKey: '',
};
let currentData = null;
let historicalData = [];
let selectedTimeRange = '24h';

// Constants
const STORAGE_KEY = 'iot_dashboard_config';
const UPDATE_INTERVAL = 30000; // 30 seconds
const CIRCUMFERENCE = 2 * Math.PI * 45; // Circumference of the gauge circles
const MAX_TEMPERATURE = 50; // °C
const MAX_HUMIDITY = 100; // %
const MAX_GAS = 1000; // ppm (adjust based on your sensor's range)

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
    initializeApp();
});

// Initialize application
function initializeApp() {
    // Load saved configuration
    loadConfig();
    
    // Set up event listeners
    saveConfigBtn.addEventListener('click', saveConfig);
    exportDataBtn.addEventListener('click', exportDataToCSV);
    
    timeRangeBtns.forEach(btn => {
        btn.addEventListener('click', (e) => {
            selectedTimeRange = e.target.dataset.range;
            updateTimeRangeButtons();
            fetchHistoricalData();
        });
    });
    
    // Check if we have a valid config
    if (isConfigValid()) {
        fetchSensorData();
        setupDataRefresh();
        // Set default time range button as active
        document.querySelector('[data-range="24h"]').classList.add('active');
    } else {
        // Pre-fill with example credentials from the URL if available
        const urlParams = new URLSearchParams(window.location.search);
        const channelIdParam = urlParams.get('channelId');
        const apiKeyParam = urlParams.get('apiKey');
        
        if (channelIdParam) channelIdInput.value = channelIdParam;
        if (apiKeyParam) apiKeyInput.value = apiKeyParam;
        
        // If both are provided in URL, save config automatically
        if (channelIdParam && apiKeyParam) {
            saveConfig();
        }
    }
}

// Load configuration from localStorage
function loadConfig() {
    const savedConfig = localStorage.getItem(STORAGE_KEY);
    if (savedConfig) {
        config = JSON.parse(savedConfig);
        channelIdInput.value = config.channelId;
        apiKeyInput.value = config.apiKey;
    }
}

// Save configuration to localStorage
function saveConfig() {
    config.channelId = channelIdInput.value.trim();
    config.apiKey = apiKeyInput.value.trim();
    
    if (!config.channelId || !config.apiKey) {
        showConfigStatus('Please enter both Channel ID and API Key', 'error');
        return;
    }
    
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    showConfigStatus('Configuration saved successfully', 'success');
    
    // Start fetching data
    fetchSensorData();
    setupDataRefresh();
    // Set default time range button as active
    document.querySelector('[data-range="24h"]').classList.add('active');
}

// Show configuration status message
function showConfigStatus(message, type) {
    configStatusDiv.textContent = message;
    configStatusDiv.className = 'mt-2 text-sm';
    
    if (type === 'error') {
        configStatusDiv.classList.add('text-red-400');
    } else {
        configStatusDiv.classList.add('text-green-400');
    }
    
    configStatusDiv.classList.remove('hidden');
    
    // Hide after 3 seconds
    setTimeout(() => {
        configStatusDiv.classList.add('hidden');
    }, 3000);
}

// Check if config is valid
function isConfigValid() {
    return config.channelId && config.apiKey;
}

// Fetch sensor data from ThingSpeak API
async function fetchSensorData() {
    if (!isConfigValid()) return;
    
    showLoading(true);
    hideError();
    
    try {
        const url = `https://api.thingspeak.com/channels/${config.channelId}/feeds/last.json?api_key=${config.apiKey}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process and display the data
        currentData = data;
        updateCurrentReadings();
        showCurrentReadingsSection(true);
        showHistoricalDataSection(true);
        
        // Update last update time
        updateLastUpdateTime(data.created_at);
        
        // Fetch historical data for charts
        fetchHistoricalData();
        
    } catch (error) {
        showError(`Failed to fetch sensor data: ${error.message}`);
        showCurrentReadingsSection(false);
        showHistoricalDataSection(false);
    } finally {
        showLoading(false);
    }
}

// Update the last update time display
function updateLastUpdateTime(timestamp) {
    if (!timestamp) return;
    
    const date = new Date(timestamp);
    lastUpdateTime.textContent = date.toLocaleString();
}

// Fetch historical data for the selected time range
async function fetchHistoricalData() {
    if (!isConfigValid()) return;
    
    showLoading(true);
    
    // Determine number of results based on time range
    let results = 100; // Default for 24h
    if (selectedTimeRange === '7d') {
        results = 500;
    } else if (selectedTimeRange === '30d') {
        results = 1000;
    }
    
    try {
        const url = `https://api.thingspeak.com/channels/${config.channelId}/feeds.json?api_key=${config.apiKey}&results=${results}`;
        const response = await fetch(url);
        
        if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}`);
        }
        
        const data = await response.json();
        
        // Process and display historical data
        historicalData = data.feeds;
        updateHistoricalChart();
        
    } catch (error) {
        showError(`Failed to fetch historical data: ${error.message}`);
    } finally {
        showLoading(false);
    }
}

// Update the current readings display
function updateCurrentReadings() {
    if (!currentData) return;
    
    // Extract values (assuming field1, field2, field3 are temperature, humidity, and gas respectively)
    const temperature = parseFloat(currentData.field1) || 0;
    const humidity = parseFloat(currentData.field2) || 0;
    const gas = parseFloat(currentData.field3) || 0;
    
    // Update the gauge values
    updateGauge(temperatureGauge, temperature, MAX_TEMPERATURE);
    updateGauge(humidityGauge, humidity, MAX_HUMIDITY);
    updateGauge(gasGauge, gas, MAX_GAS);
    
    // Update the text values
    temperatureValue.textContent = temperature.toFixed(1);
    humidityValue.textContent = humidity.toFixed(1);
    gasValue.textContent = gas.toFixed(0);
    
    // Add pulse effect to gauges
    const gauges = document.querySelectorAll('.temperature-gauge, .humidity-gauge, .gas-gauge');
    gauges.forEach(gauge => {
        gauge.classList.add('sensor-pulse');
    });
}

// Update a gauge's visual representation
function updateGauge(gaugeElement, value, maxValue) {
    // Calculate the percentage
    const percentage = Math.min(value / maxValue, 1);
    
    // Calculate the stroke-dashoffset
    const offset = CIRCUMFERENCE - (percentage * CIRCUMFERENCE);
    
    // Update the gauge
    gaugeElement.style.strokeDashoffset = offset;
}

// Update the historical data chart
function updateHistoricalChart() {
    if (!historicalData || historicalData.length === 0) return;
    
    // Prepare data for Chart.js
    const timestamps = historicalData.map(item => new Date(item.created_at));
    
    // Extract values (adjust field names as needed)
    const temperatures = historicalData.map(item => parseFloat(item.field1) || null);
    const humidities = historicalData.map(item => parseFloat(item.field2) || null);
    const gasLevels = historicalData.map(item => parseFloat(item.field3) || null);
    
    // Destroy existing chart if it exists
    if (historyChart) {
        historyChart.destroy();
    }
    
    // Create new chart
    historyChart = new Chart(historyChartCanvas, {
        type: 'line',
        data: {
            labels: timestamps,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatures,
                    borderColor: '#06b6d4',
                    backgroundColor: 'rgba(6, 182, 212, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Humidity (%)',
                    data: humidities,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: false
                },
                {
                    label: 'Gas Level (ppm)',
                    data: gasLevels,
                    borderColor: '#10b981',
                    backgroundColor: 'rgba(16, 185, 129, 0.1)',
                    borderWidth: 2,
                    pointRadius: 1,
                    pointHoverRadius: 5,
                    tension: 0.3,
                    fill: false
                }
            ]
        },
        options: {
            responsive: true,
            interaction: {
                mode: 'index',
                intersect: false,
            },
            plugins: {
                title: {
                    display: true,
                    text: `Sensor Data History (${getTimeRangeLabel()})`,
                    color: '#f3f4f6',
                    font: {
                        size: 16,
                        family: "'Space Mono', monospace"
                    }
                },
                tooltip: {
                    mode: 'index',
                    intersect: false,
                    backgroundColor: 'rgba(17, 24, 39, 0.8)',
                    titleColor: '#f3f4f6',
                    bodyColor: '#e5e7eb',
                    borderColor: '#374151',
                    borderWidth: 1,
                    displayColors: true,
                    callbacks: {
                        label: function(context) {
                            let label = context.dataset.label || '';
                            if (label) {
                                label += ': ';
                            }
                            if (context.parsed.y !== null) {
                                label += context.parsed.y.toFixed(1);
                            }
                            return label;
                        }
                    }
                },
                legend: {
                    display: true,
                    position: 'top',
                    labels: {
                        color: '#d1d5db',
                        font: {
                            family: "'Space Mono', monospace"
                        }
                    }
                }
            },
            scales: {
                x: {
                    type: 'time',
                    time: {
                        unit: getTimeUnit(),
                        tooltipFormat: 'yyyy-MM-dd HH:mm'
                    },
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)'
                    },
                    ticks: {
                        color: '#9ca3af',
                        maxRotation: 45,
                        minRotation: 0
                    }
                },
                y: {
                    beginAtZero: true,
                    grid: {
                        color: 'rgba(75, 85, 99, 0.2)'
                    },
                    ticks: {
                        color: '#9ca3af'
                    }
                }
            },
            animation: {
                duration: 1000
            }
        }
    });
}

// Get time unit for chart based on selected range
function getTimeUnit() {
    switch (selectedTimeRange) {
        case '24h':
            return 'hour';
        case '7d':
            return 'day';
        case '30d':
            return 'week';
        default:
            return 'hour';
    }
}

// Get human-readable label for the selected time range
function getTimeRangeLabel() {
    switch (selectedTimeRange) {
        case '24h':
            return 'Last 24 Hours';
        case '7d':
            return 'Last 7 Days';
        case '30d':
            return 'Last 30 Days';
        default:
            return 'Last 24 Hours';
    }
}

// Update time range button styling
function updateTimeRangeButtons() {
    timeRangeBtns.forEach(btn => {
        if (btn.dataset.range === selectedTimeRange) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Export data to CSV
function exportDataToCSV() {
    if (!historicalData || historicalData.length === 0) {
        showError('No data available to export');
        return;
    }
    
    // Build CSV content
    let csvContent = 'Timestamp,Temperature,Humidity,Gas Level\n';
    
    historicalData.forEach(item => {
        const timestamp = new Date(item.created_at).toISOString();
        const temperature = parseFloat(item.field1) || '';
        const humidity = parseFloat(item.field2) || '';
        const gas = parseFloat(item.field3) || '';
        
        csvContent += `${timestamp},${temperature},${humidity},${gas}\n`;
    });
    
    // Create a Blob with the CSV content
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8' });
    
    // Use FileSaver.js to save the file
    const filename = `sensor_data_${selectedTimeRange}_${new Date().toISOString().slice(0, 10)}.csv`;
    saveAs(blob, filename);
}

// Setup data refresh interval
function setupDataRefresh() {
    // Clear any existing interval
    if (window.dataRefreshInterval) {
        clearInterval(window.dataRefreshInterval);
    }
    
    // Set up new interval
    window.dataRefreshInterval = setInterval(() => {
        fetchSensorData();
    }, UPDATE_INTERVAL);
}

// Show/hide loading indicator
function showLoading(show) {
    if (show) {
        loadingIndicator.classList.remove('hidden');
    } else {
        loadingIndicator.classList.add('hidden');
    }
}

// Show error message
function showError(message) {
    errorMessage.textContent = message;
    errorDisplay.classList.remove('hidden');
}

// Hide error message
function hideError() {
    errorDisplay.classList.add('hidden');
}

// Show/hide current readings section
function showCurrentReadingsSection(show) {
    if (show) {
        currentReadingsSection.classList.remove('hidden');
    } else {
        currentReadingsSection.classList.add('hidden');
    }
}

// Show/hide historical data section
function showHistoricalDataSection(show) {
    if (show) {
        historicalDataSection.classList.remove('hidden');
    } else {
        historicalDataSection.classList.add('hidden');
    }
} 