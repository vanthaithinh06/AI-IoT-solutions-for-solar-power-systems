// Service Worker để duy trì việc gửi dữ liệu trong nền
let timer = null;
let sheetURL = null;
let lastData = {};

// Lắng nghe tin nhắn từ trang chính
self.addEventListener('message', event => {
  const message = event.data;
  
  if (message.type === 'start') {
    sheetURL = message.url;
    lastData = message.data;
    console.log('[SW] Starting with data:', lastData);
    startSending(message.interval);
    
    // Phản hồi lại trang chính
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'status',
          status: 'started'
        });
      });
    });
  } 
  else if (message.type === 'update') {
    console.log('[SW] Updating data:', message.data);
    console.log('[SW] Current value before update:', lastData.current);
    lastData = message.data;
    console.log('[SW] Current value after update:', lastData.current);
  }
  else if (message.type === 'stop') {
    stopSending();
  }
});

// Bắt đầu gửi dữ liệu
function startSending(interval) {
  if (timer) {
    clearInterval(timer);
  }
  
  timer = setInterval(() => {
    sendData();
  }, interval || 5000);
}

// Dừng gửi dữ liệu
function stopSending() {
  if (timer) {
    clearInterval(timer);
    timer = null;
    
    // Thông báo đã dừng
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'status',
          status: 'stopped'
        });
      });
    });
  }
}

// Gửi dữ liệu đến Google Sheets
async function sendData() {
  try {
    if (!sheetURL || !lastData) return;
    
    // Cập nhật timestamp
    const data = {...lastData, timestamp: new Date().toISOString()};
    
    // Log dữ liệu dòng điện trước khi gửi
    console.log('[SW] Sending data with current value:', data.current);
    
    // Chuyển đổi dữ liệu thành JSON
    const jsonData = JSON.stringify(data);
    
    // Tạo URL với dữ liệu
    const url = `${sheetURL}?data=${encodeURIComponent(jsonData)}`;
    
    // Gửi dữ liệu
    const response = await fetch(url, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    
    // Thông báo đã gửi
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'sent',
          timestamp: new Date().toISOString(),
          dataSent: {
            current: data.current,
            allFields: Object.keys(data)
          }
        });
      });
    });
  } catch (error) {
    // Thông báo lỗi
    console.error('[SW] Error sending data:', error);
    self.clients.matchAll().then(clients => {
      clients.forEach(client => {
        client.postMessage({
          type: 'error',
          error: error.message
        });
      });
    });
  }
}

// Đảm bảo Service Worker luôn hoạt động
self.addEventListener('install', event => {
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(self.clients.claim());
});