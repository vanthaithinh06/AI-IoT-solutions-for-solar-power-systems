// Biến để lưu trữ interval ID
let uploadIntervalId = null;
let collectedData = {};
let workerId = Date.now(); // ID duy nhất cho worker này
let connections = 0; // Đếm số kết nối

// Lắng nghe kết nối từ các trang
self.addEventListener('connect', function(e) {
  const port = e.ports[0];
  connections++;
  
  console.log(`[WORKER ${workerId}] Kết nối mới, tổng số kết nối: ${connections}`);
  
  // Lắng nghe tin nhắn từ trang
  port.addEventListener('message', function(e) {
    const message = e.data;
    
    console.log(`[WORKER ${workerId}] Nhận tin nhắn:`, message.command);
    
    switch(message.command) {
      case 'start':
        collectedData = message.data;
        startUpload(message.url, message.interval);
        break;
      case 'stop':
        stopUpload();
        break;
      case 'updateData':
        collectedData = message.data;
        break;
    }
  });
  
  // Mở kết nối
  port.start();
  
  // Thông báo kết nối thành công
  port.postMessage({
    status: 'connected',
    workerId: workerId,
    connections: connections
  });
  
  // Khi kết nối đóng
  port.addEventListener('close', function() {
    connections--;
    console.log(`[WORKER ${workerId}] Kết nối đóng, còn lại: ${connections}`);
    
    // Nếu không còn kết nối nào, dừng gửi dữ liệu
    if (connections <= 0 && uploadIntervalId !== null) {
      console.log(`[WORKER ${workerId}] Không còn kết nối, dừng gửi dữ liệu`);
      stopUpload();
    }
  });
});

// Hàm bắt đầu gửi dữ liệu
function startUpload(url, interval) {
  console.log(`[WORKER ${workerId}] Bắt đầu gửi dữ liệu, interval:`, interval);
  
  if (uploadIntervalId !== null) {
    console.log(`[WORKER ${workerId}] Xóa interval cũ:`, uploadIntervalId);
    clearInterval(uploadIntervalId);
  }
  
  uploadIntervalId = setInterval(() => {
    console.log(`[WORKER ${workerId}] Đang gửi dữ liệu...`);
    sendData(url, collectedData);
  }, interval);
  
  console.log(`[WORKER ${workerId}] Đã tạo interval mới:`, uploadIntervalId);
  
  // Thông báo cho tất cả các kết nối
  self.clients.forEach(client => {
    client.postMessage({ 
      status: 'started',
      workerId: workerId,
      intervalId: uploadIntervalId
    });
  });
}

// Hàm dừng gửi dữ liệu
function stopUpload() {
  if (uploadIntervalId !== null) {
    console.log(`[WORKER ${workerId}] Dừng gửi dữ liệu, xóa interval:`, uploadIntervalId);
    clearInterval(uploadIntervalId);
    uploadIntervalId = null;
    
    // Thông báo cho tất cả các kết nối
    self.clients.forEach(client => {
      client.postMessage({ 
        status: 'stopped',
        workerId: workerId
      });
    });
  }
}

// Hàm gửi dữ liệu đến Google Sheets
async function sendData(url, data) {
  try {
    // Đảm bảo timestamp luôn được cập nhật mới nhất
    data.timestamp = new Date().toISOString();
    
    // Chuyển đổi toàn bộ dữ liệu thành một chuỗi JSON duy nhất
    const jsonData = JSON.stringify(data);
    
    // Gửi dữ liệu dưới dạng một tham số duy nhất
    const fullUrl = `${url}?data=${encodeURIComponent(jsonData)}`;
    
    console.log(`[WORKER ${workerId}] Gửi dữ liệu đến URL:`, url);
    
    // Sử dụng fetch API để gửi dữ liệu
    await fetch(fullUrl, {
      method: 'GET',
      mode: 'no-cors',
      cache: 'no-cache'
    });
    
    console.log(`[WORKER ${workerId}] Đã gửi dữ liệu thành công`);
    
    // Thông báo cho tất cả các kết nối
    self.clients.forEach(client => {
      client.postMessage({ 
        status: 'sent', 
        timestamp: new Date().toISOString(),
        workerId: workerId,
        data: data
      });
    });
  } catch (error) {
    console.error(`[WORKER ${workerId}] Lỗi khi gửi dữ liệu:`, error);
    
    // Thông báo lỗi cho tất cả các kết nối
    self.clients.forEach(client => {
      client.postMessage({ 
        status: 'error', 
        error: error.message,
        workerId: workerId
      });
    });
  }
}

// Thông báo worker đã khởi động
console.log(`[WORKER ${workerId}] Shared Worker đã khởi động`);