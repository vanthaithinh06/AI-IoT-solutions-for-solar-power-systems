const columnMapping = {
    "Radiation": [0, 1],
    "WindSpeed": [0, 2],
    "Temperature": [0, 3],
    "Humidity": [0, 4],
    "Voltage": [0, 5],
    "Current": [0, 9],
    "Power": [0, 6],
    "Energy": [0, 7]
};
function fetchData(dataType) {
    const SPREADSHEET_ID = "19auwndp7u-Jp3yVe6ulasICyAfoxifrXbtziY7QYkpY";
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=1321670110`;

    console.log("Đang lấy dữ liệu cho:", dataType);
    console.log("URL:", sheetUrl);
    
    if (!columnMapping[dataType]) {
        console.error("Dữ liệu không hợp lệ");
        return;
    }
    
    fetch(sheetUrl)
    .then(response => {
        console.log("Trạng thái phản hồi:", response.status);
        if (!response.ok) {
            throw new Error(`Lỗi HTTP: ${response.status}`);
        }
        return response.text();
    })
    .then(text => {
        try {
            console.log("Phản hồi thô:", text.substring(0, 100) + "...");
            
            // Cải thiện việc trích xuất JSON
            const jsonMatch = text.match(/google\.visualization\.Query\.setResponse\((.*)\);/);
            if (!jsonMatch || !jsonMatch[1]) {
                throw new Error("Không thể trích xuất JSON từ phản hồi");
            }
            
            const jsonString = jsonMatch[1];
            console.log("JSON đã trích xuất:", jsonString.substring(0, 100) + "...");
            
            const jsonData = JSON.parse(jsonString);
            console.log("Cấu trúc dữ liệu:", Object.keys(jsonData));
            
            if (!jsonData.table || !jsonData.table.rows) {
                throw new Error("Cấu trúc dữ liệu không hợp lệ từ Google Sheets");
            }
            
            console.log("Số hàng:", jsonData.table.rows.length);
            if (jsonData.table.rows.length > 0) {
                console.log("Mẫu hàng đầu tiên:", JSON.stringify(jsonData.table.rows[0]));
            }
            
            // Trích xuất dữ liệu với kiểm tra null
            const data = jsonData.table.rows.map(row => {
                if (!row.c) return [];
                return row.c.map(cell => cell?.v ?? null);
            });
            
            console.log("Mẫu dữ liệu đã xử lý:", data.slice(0, 3));
            
            filterDataByDate(dataType, data, columnMapping[dataType]);
        } catch (error) {
            console.error("Lỗi xử lý dữ liệu:", error);
            alert("Lỗi xử lý dữ liệu. Đang sử dụng dữ liệu mẫu.");
            
            // Sử dụng dữ liệu mẫu khi có lỗi
            const mockData = generateMockData(dataType, new Date(), new Date());
            filterDataByDate(dataType, mockData, [0, 1]);
        }
    })
    .catch(error => {
        console.error("Lỗi mạng:", error);
        alert("Không thể kết nối đến Google Sheets. Đang sử dụng dữ liệu mẫu.");
        
        // Sử dụng dữ liệu mẫu khi có lỗi
        const mockData = generateMockData(dataType, new Date(), new Date());
        filterDataByDate(dataType, mockData, [0, 1]);
    });
}


function filterDataByDate(title, data, columns) {
    const startDateInput = document.getElementById("startDate" + title).value;
    const endDateInput = document.getElementById("endDate" + title).value;
    
    if (!startDateInput || !endDateInput) {
        alert("Vui lòng chọn ngày bắt đầu và kết thúc hợp lệ để chọn dữ liệu!");
        return;
    }

    function convertToISO(dateStr) {
        let parts = dateStr.split("/");
        if (parts.length === 3) {
            return `${parts[2]}-${parts[1]}-${parts[0]}`;
        }
        return dateStr;
    }

    const startDate = new Date(convertToISO(startDateInput));
    const endDate = new Date(convertToISO(endDateInput));

    // Nếu không có dữ liệu, sử dụng dữ liệu mẫu
    if (!data || data.length === 0) {
        const mockData = generateMockData(title, startDate, endDate);
        displayPopup(title, mockData, [0, 1]);
        return;
    }

    // Hiển thị tất cả dữ liệu thay vì lọc (tạm thời để kiểm tra)
    displayPopup(title, data, columns);
}

// Thêm hàm tạo dữ liệu mẫu
function generateMockData(dataType, startDate, endDate) {
    const mockData = [];
    const dayDiff = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24));
    const days = Math.min(dayDiff, 30); // Giới hạn 30 ngày
    
    for (let i = 0; i < days; i++) {
        const date = new Date(startDate);
        date.setDate(startDate.getDate() + i);
        const dateStr = date.toISOString().split('T')[0];
        
        let value;
        switch(dataType) {
            case "Radiation": value = Math.floor(500 + Math.random() * 500); break;
            case "WindSpeed": value = (2 + Math.random() * 8).toFixed(1); break;
            case "Temperature": value = (20 + Math.random() * 15).toFixed(1); break;
            case "Humidity": value = Math.floor(40 + Math.random() * 40); break;
            case "Voltage": value = (220 + Math.random() * 10).toFixed(1); break;
            case "Current": value = (5 + Math.random() * 5).toFixed(2); break;
            case "Power": value = Math.floor(1000 + Math.random() * 1000); break;
            case "Energy": value = Math.floor(5000 + Math.random() * 3000); break;
            default: value = Math.floor(Math.random() * 100);
        }
        
        mockData.push([dateStr, value]);
    }
    
    return mockData;
}




function parseDateTime(dateTimeStr) {
    return new Date(dateTimeStr.replace(" ", "T"));
}

function displayPopup(title, data, columns) {
    let tableHTML = "<table class='border-collapse border border-gray-400 w-full'>";
    tableHTML += "<tr><th class='border px-4 py-2 bg-gray-100'>Thời gian</th><th class='border px-4 py-2 bg-gray-100'>Giá trị</th></tr>";
    
    // Kiểm tra và xử lý dữ liệu trước khi hiển thị
    if (!data || data.length === 0) {
        tableHTML += "<tr><td colspan='2' class='border px-4 py-2 text-center'>Không có dữ liệu</td></tr>";
    } else {
        data.forEach(row => {
            // Xử lý hiển thị ngày tháng và giờ phút giây
            let timeDisplay = row[columns[0]];
            if (typeof timeDisplay === 'string' && timeDisplay.includes('Date(')) {
                try {
                    const match = timeDisplay.match(/Date\((\d+),(\d+),(\d+)(?:,(\d+),(\d+),(\d+))?\)/);
                    if (match) {
                        const year = parseInt(match[1]);
                        const month = parseInt(match[2]);
                        const day = parseInt(match[3]);
                        
                        // Lấy giờ, phút, giây nếu có
                        const hour = match[4] ? parseInt(match[4]) : 0;
                        const minute = match[5] ? parseInt(match[5]) : 0;
                        const second = match[6] ? parseInt(match[6]) : 0;
                        
                        // Định dạng giờ phút giây
                        const hourStr = hour.toString().padStart(2, '0');
                        const minuteStr = minute.toString().padStart(2, '0');
                        const secondStr = second.toString().padStart(2, '0');
                        
                        // Hiển thị đầy đủ ngày tháng năm giờ phút giây
                        timeDisplay = `${day}/${month}/${year} ${hourStr}:${minuteStr}:${secondStr}`;
                    }
                } catch (e) {
                    console.error("Lỗi định dạng ngày:", e);
                }
            }
            
            // Xử lý hiển thị giá trị
            let valueDisplay = row[columns[1]];
            if (valueDisplay === null || valueDisplay === undefined) {
                valueDisplay = "N/A";
            }
            
            tableHTML += `<tr><td class='border px-4 py-2'>${timeDisplay}</td><td class='border px-4 py-2'>${valueDisplay}</td></tr>`;
        });
    }
    
    tableHTML += "</table>";
    
    const popup = document.createElement("div");
    popup.classList.add("popup-overlay");
    popup.innerHTML = `
        <div class='popup'>
            <button class='close-btn' onclick='closePopup()'>x</button>
            <h2 class="text-xl font-bold mb-4">${title}</h2>
            <div class="table-container">
                ${tableHTML}
            </div>
        </div>
    `;
    document.body.appendChild(popup);
}
function closePopup() {
    document.querySelector(".popup-overlay").remove();
}

const style = document.createElement("style");
style.innerHTML = `

.sidebar {
    width: 250px;
    background-color: #2d3748;
    color: white;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: flex-start;
    padding: 20px;
    height: calc(100vh - 20px);
    position: sticky;
    top: 0;
}
        
    .popup-overlay {
        position: fixed;
        top: 0; left: 0;
        width: 100%; height: 100%;
        background: rgba(0, 0, 0, 0.5);
        display: flex;
        justify-content: center;
        align-items: center;
        z-index: 1000;
    }
       .popup {
        background: white;
        padding: 30px;
        border-radius: 8px;
        box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
        position: relative;
        width: 80%;
        max-width: 800px;
        max-height: 80vh;
        overflow: auto;
    }
        table {
        min-width: 100%;
        border-collapse: collapse;
    }
    .close-btn {
        position: absolute;
        top: 10px;
        right: 10px;
        background: red;
        color: white;
        border: none;
        padding: 5px 10px;
        cursor: pointer;
    }

    .logo-container {
    display: flex;
    justify-content: center;
    align-items: center;
    margin-bottom: 20px;
    width: 100%;
    text-align: center;
}

.logo {
    width: 120px;
    height: 120px;
    object-fit: cover;
    border: 3px solid white;
    box-shadow: 0 0 10px rgba(255, 255, 255, 0.2);
    display: block;
    margin: 0 auto;
}

.sidebar img {
    width: 120px;
    height: 120px;
    display: block;
    margin: 20px auto;
    border-radius: 0;
}
`;
document.head.appendChild(style);
