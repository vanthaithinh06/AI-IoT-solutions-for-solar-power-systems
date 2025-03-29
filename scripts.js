import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

const database = window.firebaseDatabase;

// Initialize power chart
let powerChart;

function initializeChart() {
    const ctx = document.getElementById('powerChart').getContext('2d');
    powerChart = new Chart(ctx, {
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
            plugins: {
                legend: {
                    position: 'top',
                }
            },
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
    return powerChart;
}

// Update HTML values
function updateValue(elementId, value, unit = "") {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value !== null ? `${value} ${unit}` : "-- " + unit;
    }
}

// Update chart with new data
function updateChart(newValue) {
    const currentTime = new Date().toLocaleTimeString();
    
    powerChart.data.labels.push(currentTime);
    powerChart.data.datasets[0].data.push(newValue);

    // Keep only last 10 points
    if (powerChart.data.labels.length > 10) {
        powerChart.data.labels.shift();
        powerChart.data.datasets[0].data.shift();
    }

    powerChart.update();
}

// Initialize when document is ready
document.addEventListener('DOMContentLoaded', () => {
    // Initialize chart
    powerChart = initializeChart();

    // Listen to Firebase data
    const dataRef = ref(database, "nhayen/thietbi/pinmattroi");
    onValue(dataRef, (snapshot) => {
        const data = snapshot.val();
        if (!data) {
            console.error("Không có dữ liệu từ Firebase!");
            return;
        }

        // Update values
        updateValue("currentPower", data.congsuat, "W");
        updateValue("monthlyEnergy", data.nangluong, "kWh");
        updateValue("dailyEnergy", data.congsuatdudoan?.predicted_power, "W");

        // Update chart with new power value
        updateChart(data.congsuat);

        // Update time
        const currentTime = new Date().toLocaleTimeString();
        const updateTimeElements = document.querySelectorAll('#updateTime');
        updateTimeElements.forEach(el => el.textContent = currentTime);
    });

    // Update current time every second
    setInterval(() => {
        const now = new Date().toLocaleTimeString();
        const timeElements = document.querySelectorAll('#currentTime');
        timeElements.forEach(el => el.textContent = now);
    }, 1000);
});