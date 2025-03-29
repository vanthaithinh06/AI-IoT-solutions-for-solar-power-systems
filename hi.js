import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue, get } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const firebaseConfig = {
    apiKey: "AIzaSyB8HxGOHy2SoLfxZIBaHVsym07I1JT65-8",
    authDomain: "dht11-a44e5.firebaseapp.com",
    databaseURL: "https://dht11-a44e5-default-rtdb.firebaseio.com/",
    projectId: "dht11-a44e5",
    storageBucket: "dht11-a44e5.appspot.com",
    messagingSenderId: "563651227211",
    appId: "1:563651227211:web:1490d34d7b26c4a10827ce",
    measurementId: "G-CDR71MQGTJ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Khai báo biến để theo dõi interval ID và service worker
let dataUploadIntervalId = null;
let serviceWorkerRegistration = null;

// Function to send data to Google Sheets
async function sendToGoogleSheets(data) {
    try {
        const sheetURL = "https://script.google.com/macros/s/AKfycbwFPNcjeehbxzmZyikmcI_WEcx49WJVukP7HHZYdq3v-SWSSvZ9z6J9_Y4f6YM7ou-ebw/exec";
        
        // Đảm bảo timestamp luôn được cập nhật mới nhất
        data.timestamp = new Date().toISOString();
        
        console.log("Dữ liệu đang gửi đến Google Sheets:", data);
        
        // Chuyển đổi toàn bộ dữ liệu thành một chuỗi JSON duy nhất
        const jsonData = JSON.stringify(data);
        
        // Gửi dữ liệu dưới dạng một tham số duy nhất
        const url = `${sheetURL}?data=${encodeURIComponent(jsonData)}`;
        
        const response = await fetch(url, {
            method: 'GET',
            mode: 'no-cors',
            cache: 'no-cache' // Thêm để tránh cache
        });
        
        console.log("Yêu cầu đã được gửi đến Google Sheets lúc:", new Date().toLocaleTimeString('vi-VN'));
        return true;
    } catch (error) {
        console.error("Lỗi khi gửi dữ liệu đến Google Sheets:", error);
        return false;
    }
}

// Function to update value in HTML
function updateValue(elementId, value, unit = "") {
    const element = document.getElementById(elementId);
    if (element) {
        if (value !== null && value !== undefined) {
            element.textContent = `${value} ${unit}`;
        } else {
            element.textContent = `-- ${unit}`;
        }
    } else {
        console.warn(`Element with ID ${elementId} not found`);
    }
}

// Firebase data paths
const dataPaths = {
    radiation: "nhayen/thietbi/pinmattroi/bucxamattroi",
    windSpeed: "nhayen/thietbi/pinmattroi/tocdogio",
    temperature: "nhayen/thietbi/pinmattroi/nhietdo",
    humidity: "nhayen/thietbi/pinmattroi/doam",
    voltage: "nhayen/thietbi/pinmattroi/dienap",
    power: "nhayen/thietbi/pinmattroi/congsuat",
    energy: "nhayen/thietbi/pinmattroi/nangluong",
    predictedPower: "nhayen/thietbi/pinmattroi/congsuatdudoan"
};

// Units for each data type
function getUnit(key) {
    const units = {
        radiation: "W/m²",
        windSpeed: "m/s",
        temperature: "°C",
        humidity: "%",
        voltage: "V",
        power: "W",
        energy: "W",
        predictedPower: "W"
    };
    return units[key] || "";
}

// Initialize power chart
let powerChart;

function initializePowerChart() {
    const ctx = document.getElementById('powerChart');
    if (!ctx) {
        console.warn('Power chart canvas not found');
        return null;
    }

    return new Chart(ctx, {
        type: 'line',
        data: {
            labels: [],
            datasets: [{
                label: 'Công suất (W)',
                data: [],
                borderColor: '#4CAF50',
                backgroundColor: 'rgba(76, 175, 80, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Công suất (W)'
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: 'Thời gian'
                    }
                }
            }
        }
    });
}

// Khai báo biến collectedData ở phạm vi toàn cục
let collectedData = {
    timestamp: null,
    radiation: null,
    windSpeed: null,
    temperature: null,
    humidity: null,
    voltage: null,
    power: null,
    energy: null,
    predictedPower: null
};

// Hàm đăng ký và khởi động Service Worker
async function registerServiceWorker() {
    if ('serviceWorker' in navigator) {
        try {
            // Đăng ký Service Worker
            serviceWorkerRegistration = await navigator.serviceWorker.register('sw.js');
            console.log('Service Worker đã được đăng ký thành công');
            
            // Lắng nghe tin nhắn từ Service Worker
            navigator.serviceWorker.addEventListener('message', (event) => {
                const message = event.data;
                
                if (message.type === 'sent') {
                    console.log('Dữ liệu đã được gửi lúc:', new Date(message.timestamp).toLocaleTimeString('vi-VN'));
                } 
                else if (message.type === 'error') {
                    console.error('Lỗi khi gửi dữ liệu:', message.error);
                }
                else if (message.type === 'status') {
                    console.log('Trạng thái Service Worker:', message.status);
                }
            });
            
            // Đợi Service Worker sẵn sàng
            await navigator.serviceWorker.ready;
            
            // Bắt đầu gửi dữ liệu
            startDataUploadWithServiceWorker();
            
            return true;
        } catch (error) {
            console.error('Không thể đăng ký Service Worker:', error);
            return false;
        }
    } else {
        console.warn('Trình duyệt không hỗ trợ Service Worker');
        return false;
    }
}

// Hàm bắt đầu gửi dữ liệu với Service Worker
function startDataUploadWithServiceWorker() {
    if (navigator.serviceWorker.controller) {
        const sheetURL = "https://script.google.com/macros/s/AKfycbwFPNcjeehbxzmZyikmcI_WEcx49WJVukP7HHZYdq3v-SWSSvZ9z6J9_Y4f6YM7ou-ebw/exec";
        
        // Gửi tin nhắn đến Service Worker để bắt đầu gửi dữ liệu
        navigator.serviceWorker.controller.postMessage({
            type: 'start',
            url: sheetURL,
            data: collectedData,
            interval: 5000
        });
        
        localStorage.setItem('dataUploadActive', 'true');
        console.log('Đã bắt đầu gửi dữ liệu với Service Worker');
    } else {
        console.warn('Service Worker chưa sẵn sàng');
        // Thử lại sau 1 giây
        setTimeout(startDataUploadWithServiceWorker, 1000);
    }
}

// Hàm cập nhật dữ liệu cho Service Worker
function updateServiceWorkerData() {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'update',
            data: collectedData
        });
    }
}

// Fallback method using setInterval
function startFallbackInterval() {
    if (dataUploadIntervalId !== null) {
        clearInterval(dataUploadIntervalId);
    }
    
    // Đánh dấu rằng đã bắt đầu gửi dữ liệu
    localStorage.setItem('dataUploadActive', 'true');
    
    // Gửi dữ liệu tự động mỗi 5 giây
    dataUploadIntervalId = setInterval(() => {
        sendToGoogleSheets(collectedData);
        console.log('Đang tự động gửi dữ liệu đến Google Sheets (fallback)...');
    }, 5000); // 5 giây
}

// Hàm dừng gửi dữ liệu
function stopDataUpload() {
    if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
            type: 'stop'
        });
    }
    
    if (dataUploadIntervalId !== null) {
        clearInterval(dataUploadIntervalId);
        dataUploadIntervalId = null;
    }
    
    localStorage.removeItem('dataUploadActive');
}

// Main initialization
document.addEventListener("DOMContentLoaded", async () => {
    console.log("DOM loaded, initializing...");
    
    // Check if elements exist
    const elementIds = [
        'radiationValue', 'windSpeedValue', 'temperatureValue',
        'humidityValue', 'voltageValue', 'powerValue',
        'energyValue', 'predictedPowerValue', 'powerChart',
        'sendToSheetsButton'
    ];
    
    elementIds.forEach(id => {
        const element = document.getElementById(id);
        console.log(`Element #${id}: ${element ? 'Found' : 'MISSING'}`);
    });
    
    // Initialize chart if canvas exists
    powerChart = initializePowerChart();
    
    // Real-time clock
    function updateClock() {
        const now = new Date();
        document.querySelectorAll('.current-time').forEach(el => {
            el.textContent = now.toLocaleTimeString('vi-VN');
        });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Test Firebase connection
    const rootRef = ref(database);
    get(rootRef).then((snapshot) => {
        console.log("Firebase connection successful");
    }).catch((error) => {
        console.error("Firebase connection error:", error);
    });

    // Initialize all data displays
    Object.entries(dataPaths).forEach(([key, path]) => {
        console.log(`Setting up listener for ${key} at path: ${path}`);
        const dataRef = ref(database, path);
        
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            console.log(`Data update for ${key}:`, data);
            
            if (data === null || data === undefined) {
                console.warn(`No data found at path: ${path}`);
                updateValue(`${key}Value`, null, getUnit(key));
                return;
            }
            
            // Store data for Google Sheets
            if (key === 'predictedPower' && typeof data === 'object' && data.predicted_power !== undefined) {
                collectedData[key] = data.predicted_power;
            } else {
                collectedData[key] = data;
            }
            
            // Cập nhật dữ liệu cho Service Worker
            updateServiceWorkerData();
            
            // Update the UI
            switch(key) {
                case 'predictedPower':
                    if (typeof data === 'object' && data.predicted_power !== undefined) {
                        updateValue('predictedPowerValue', data.predicted_power, 'W');
                    } else {
                        updateValue('predictedPowerValue', data, 'W');
                    }
                    break;
                case 'power':
                    updateValue('powerValue', data, 'W');
                    
                    // Update chart if it exists
                    if (powerChart) {
                        const now = new Date().toLocaleTimeString('vi-VN', {hour: '2-digit', minute: '2-digit'});
                        powerChart.data.labels.push(now);
                        powerChart.data.datasets[0].data.push(data);
                        
                        // Keep only last 10 points
                        if (powerChart.data.labels.length > 10) {
                            powerChart.data.labels.shift();
                            powerChart.data.datasets[0].data.shift();
                        }
                        
                        powerChart.update();
                    }
                    break;
                default:
                    updateValue(`${key}Value`, data, getUnit(key));
            }
        }, (error) => {
            console.error(`Error reading ${key} data:`, error);
            updateValue(`${key}Value`, null, getUnit(key));
        });
    });
    
    // Add button event listener for manual data sending
    const sendButton = document.getElementById('sendToSheetsButton');
    if (sendButton) {
        sendButton.addEventListener('click', () => {
            sendToGoogleSheets(collectedData);
            console.log('Đang gửi dữ liệu đến Google Sheets theo yêu cầu...');
        });
    }
    
    // Đăng ký Service Worker và bắt đầu gửi dữ liệu
    const serviceWorkerSuccess = await registerServiceWorker();
    
    // Nếu Service Worker không thành công, sử dụng phương pháp fallback
    if (!serviceWorkerSuccess) {
        console.log('Sử dụng phương pháp fallback để gửi dữ liệu');
        startFallbackInterval();
    }
});

// Thêm sự kiện để theo dõi khi trang được hiển thị/ẩn
document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
        console.log('Trang được hiển thị lại, kiểm tra trạng thái Service Worker');
        
        // Khi trang được hiển thị lại, kiểm tra xem Service Worker có hoạt động không
        if (localStorage.getItem('dataUploadActive') === 'true' && !navigator.serviceWorker.controller) {
            console.log('Service Worker không hoạt động, đăng ký lại');
            registerServiceWorker();
        }
    }
});

// Đảm bảo dừng interval khi trang bị đóng hoặc làm mới
window.addEventListener('beforeunload', () => {
    // Không cần dừng Service Worker vì nó sẽ tiếp tục chạy
    // Chỉ cần lưu trạng thái
    localStorage.setItem('dataUploadActive', 'true');
});

// Kiểm tra xem có cần khởi động lại việc gửi dữ liệu khi trang được tải
if (localStorage.getItem('dataUploadActive') === 'true') {
    // Đảm bảo DOM đã được tải trước khi bắt đầu
    if (document.readyState === 'complete' || document.readyState === 'interactive') {
        registerServiceWorker();
    } else {
        document.addEventListener('DOMContentLoaded', registerServiceWorker);
    }
}