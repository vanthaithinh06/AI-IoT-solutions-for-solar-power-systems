import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const database = window.firebaseDatabase;

// Hàm cập nhật dữ liệu vào HTML
function updateValue(elementId, value, unit = "") {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value !== null ? `${value} ${unit}` : "-- " + unit;
    }
}

// Lắng nghe dữ liệu từ Firebase
const dataRef = ref(database, "nhayen/thietbi/pinmattroi");
onValue(dataRef, (snapshot) => {
    const data = snapshot.val();
    if (!data) {
        console.error("Không có dữ liệu từ Firebase!");
        return;
    }
    console.log("Dữ liệu từ Firebase:", data);
    updateValue("currentPower", data.congsuat, "W");
    updateValue("voltageVDC", data.dienap, "V");
    updateValue("monthlyEnergy", data.nangluong, "V");
    updateValue("currentA", data.dongdien, "A");
    updateValue("dailyEnergy", data.congsuatdudoan?.predicted_power, "W");
    updateValue("systemEfficiency", data.hieusuathethong, "%");
});

document.addEventListener("DOMContentLoaded", async function () {
    const SPREADSHEET_ID = "1jCoi7WkHpYyfpsiInC0xvOcEuGslzKFMTEe2WvcgqUM";
    const SHEET_NAME = "Data";

    const chartsConfig = [
        { id: "powerChart", label: ["Power"], columns: [7] }
    ];

    async function fetchSheetData() {
        const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:json`;
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

            const labels = sheetData.map(row => row[0]);
            const datasets = config.columns.map((colIndex, i) => ({
                label: Array.isArray(config.label) ? config.label[i] : config.label,
                data: sheetData.map(row => row[colIndex] !== null ? parseFloat(row[colIndex]) : null),
                borderColor: ["#FF6384", "#36A2EB", "#FFCE56", "#4BC0C0", "#9966FF"][i % 5],
                backgroundColor: ["#FF638420", "#36A2EB20", "#FFCE5620", "#4BC0C020", "#9966FF20"][i % 5],
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
                    spanGaps: false 
                }
            });
        }
    }

    await updateCharts();
    setInterval(updateCharts, 1000);
});
