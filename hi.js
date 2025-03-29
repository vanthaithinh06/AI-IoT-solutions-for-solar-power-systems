import { initializeApp } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-app.js";
import { getDatabase, ref, onValue } from "https://www.gstatic.com/firebasejs/10.7.1/firebase-database.js";

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

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

function updateValue(elementId, value, unit = "") {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = value !== null ? `${value} ${unit}` : `-- ${unit}`;
    }
}

const dataPaths = {
    radiation: "nhayen/thietbi/pinmattroi/thietbi/bucxamattroi",
    windSpeed: "nhayen/thietbi/pinmattroi/thietbi/tocdogio",
    temperature: "nhayen/thietbi/pinmattroi/thietbi/nhietdo",
    humidity: "nhayen/thietbi/pinmattroi/thietbi/doam",
    voltage: "nhayen/thietbi/pinmattroi/thietbi/dienap",
    power: "nhayen/thietbi/pinmattroi/thietbi/congsuat",
    energy: "nhayen/thietbi/pinmattroi/thietbi/nangluong",
    predictedPower: "nhayen/thietbi/pinmattroi/thietbi/power_predicted/congsuatdudoan"
};

document.addEventListener("DOMContentLoaded", () => {
    // Real-time clock
    function updateClock() {
        const now = new Date();
        document.querySelectorAll('.current-time').forEach(el => {
            el.textContent = now.toLocaleTimeString('vi-VN');
        });
    }
    setInterval(updateClock, 1000);
    updateClock();

    // Initialize all data displays
    Object.entries(dataPaths).forEach(([key, path]) => {
        const dataRef = ref(database, path);
        
        onValue(dataRef, (snapshot) => {
            const data = snapshot.val();
            console.log(`Data update for ${key}:`, data);
            
            switch(key) {
                case 'predictedPower':
                    updateValue('predictedPowerValue', data?.predicted_power, 'W');
                    break;
                case 'energy':
                    updateValue('energyValue', data, 'kWh');
                    break;
                default:
                    updateValue(`${key}Value`, data, getUnit(key));
            }
        }, (error) => {
            console.error(`Error reading ${key} data:`, error);
            updateValue(`${key}Value`, null, getUnit(key));
        });
    });
});

function getUnit(key) {
    const units = {
        radiation: "W/m²",
        windSpeed: "m/s",
        temperature: "°C",
        humidity: "%",
        voltage: "V",
        power: "W",
        energy: "kWh",
        predictedPower: "W"
    };
    return units[key] || "";
}

// Error handling for missing elements
const requiredElements = Object.keys(dataPaths).map(k => `${k}Value`);
document.addEventListener('DOMContentLoaded', () => {
    requiredElements.forEach(id => {
        if (!document.getElementById(id)) {
            console.warn(`Missing display element: #${id}`);
        }
    });
});