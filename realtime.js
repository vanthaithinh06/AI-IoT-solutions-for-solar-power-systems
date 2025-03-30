import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

// Lấy database từ Firebase (đã khởi tạo sẵn trong `index.html`)
const database = window.firebaseDatabase;

// Hàm cập nhật giá trị vào HTML
function updateValue(elementId, value, unit = "") {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value !== null ? `${value} ${unit}` : "-- " + unit;
    }
}

// Lắng nghe dữ liệu từ Firebase
const dataRef = ref(database, "nhayen/thietbi/pinmattroi"); // Đường dẫn Firebase đúng
onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        console.error("Không có dữ liệu từ Firebase!");
        return;
    }

    console.log("Dữ liệu từ Firebase:", data); // Kiểm tra dữ liệu trên Console

    // Cập nhật giá trị vào HTML
    updateValue("powerOutput", data.congsuat, "W"); // Đúng `id`
    updateValue("voltageVDC", data.dienap, "V"); // Điện áp DC
    updateValue("voltageVAC", data.dienapvac, "V"); // Điện áp AC
    updateValue("currentA", data.dongdien, "A"); // Dòng điện
    updateValue("predictedPower", data.congsuatdudoan?.predicted_power, "W"); // Công suất dự đoán
    updateValue("systemEfficiency", data.hieusuathethong, "%"); // Hiệu suất hệ thống
});


document.addEventListener("DOMContentLoaded", async function () {

    const SPREADSHEET_ID = "19auwndp7u-Jp3yVe6ulasICyAfoxifrXbtziY7QYkpY";
    const SHEET_NAME = "SolarData";

    // Cấu hình các biểu đồ
    const chartsConfig = [
        { id: "radiationHumidityChart", label: ["Radiation",], columns: [1] },
        { id: "windSpeedChart",label: ["Wind Speed"],columns: [1], colors: ["#2ecc71"],bgColors: ["#27ae6020"]},
        { id: "temperatureWindChart", label: ["Temperature", "Humidity"], columns: [3, 4] },
        { id: "voltageCurrentChart", label: ["Voltage (V)", "Current (A)"], columns: [5, 6] },
        { id: "powerPredictedChart", label: ["Power (W)", "Power Predicted"], columns: [6, 8] },
        { id: "powerEnergyChart", label: ["Power Predicted"], columns: [7] } // Biểu đồ mới
    ];

    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json&gid=1321670110`;
        try {
            const response = await fetch(url);
            const text = await response.text();
            const json = JSON.parse(text.substring(47, text.length - 2));
            return json.table.rows.map(row => row.c.map(cell => cell ? cell.v : null));
        } catch (error) {
            console.error("Lỗi khi lấy dữ liệu từ Google Sheets:", error);
            return null;
        }
    }

        // Lưu dữ liệu cũ để so sánh
    let lastSheetData = null;
    let chartInstances = {};

    async function updateCharts() {
        const sheetData = await fetchSheetData();
        if (!sheetData) return;
    
        if (JSON.stringify(sheetData) === JSON.stringify(lastSheetData)) {
            console.log("Dữ liệu không thay đổi, không cập nhật biểu đồ.");
            return;
        }
    
        console.log("Dữ liệu thay đổi, cập nhật biểu đồ.");
        lastSheetData = sheetData;
    
        for (const config of chartsConfig) {
            const ctx = document.getElementById(config.id)?.getContext("2d");
            if (!ctx) continue;
    
            if (chartInstances[config.id]) {
                chartInstances[config.id].destroy();
            }
    
            const labels = sheetData.map(row => row[0]); // Cột A: Thời gian
            const datasets = config.columns.map((colIndex, i) => ({
                label: Array.isArray(config.label) ? config.label[i] : config.label,
                data: sheetData.map(row => row[colIndex] !== null ? parseFloat(row[colIndex]) : null),
                borderColor: config.colors ? config.colors[i] : ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"][i % 5],
                backgroundColor: config.bgColors ? config.bgColors[i] : ["#FF638420", "#36A2EB20", "#FFCE5620", "#4BC0C020", "#9966FF20"][i % 5],
                borderWidth: 2,
                tension: 0.4
            }));
    
            chartInstances[config.id] = new Chart(ctx, {
                type: "line",
                data: { labels, datasets },
                options: {
                    responsive: true,
                    scales: {
                        x: { title: { display: true, text: "Thời gian" } },
                        y: { title: { display: true, text: "Giá trị" }, beginAtZero: false }
                    },
                    spanGaps: false // Quan trọng! Không nối các điểm bị null
                }
            });
        }
    }
    


    await updateCharts();
    setInterval(updateCharts, 1000);
});
