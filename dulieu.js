function fetchData(dataType) {
    const sheetId = "1jCoi7WkHpYyfpsiInC0xvOcEuGslzKFMTEe2WvcgqUM";
    const sheetUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/gviz/tq?tqx=out:csv`;

    const columnMapping = {
        "Radiation": [0, 1],
        "WindSpeed": [0, 4],
        "Temperature": [0, 3],
        "Humidity": [0, 2],
        "Voltage": [0, 5],
        "Current": [0, 6],
        "Power": [0, 7],
        "Energy": [0, 8]
    };
    
    if (!columnMapping[dataType]) {
        console.error("Dữ liệu không hợp lệ");
        return;
    }
    
    fetch(sheetUrl)
        .then(response => response.text())
        .then(csvText => {
            Papa.parse(csvText, {
                complete: function (result) {
                    filterDataByDate(dataType, result.data, columnMapping[dataType]);
                },
                skipEmptyLines: true
            });
        })
        .catch(error => console.error("Lỗi khi lấy dữ liệu:", error));
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

    let filteredData = data.filter((row, index) => {
        if (index === 0) return false;
        let rowDateStr = row[columns[0]].split(" ")[0];
        let rowDate = new Date(convertToISO(rowDateStr));
        return rowDate >= startDate && rowDate <= endDate;
    });

    // Generate 7 mock rows
    if (filteredData.length > 0) {
        let lastEntry = filteredData[filteredData.length - 1];
        let lastDate = new Date(lastEntry[columns[0]]);
        let lastValue = parseFloat(lastEntry[columns[1]]) || 0;

        for (let i = 1; i <= 7; i++) {
            let newDate = new Date(lastDate);
            newDate.setDate(lastDate.getDate() + i);
            let newValue = (lastValue * (0.95 + Math.random() * 0.1)).toFixed(2);
            let newDateString = newDate.toISOString().split("T")[0];

            if (!filteredData.some(row => row[columns[0]] === newDateString)) {
                filteredData.push([newDateString, newValue]);
            }
        }
    }

    displayPopup(title, filteredData, columns);
}




function parseDateTime(dateTimeStr) {
    return new Date(dateTimeStr.replace(" ", "T"));
}

function displayPopup(title, data, columns) {
    let tableHTML = "<table class='border-collapse border border-gray-400'>";
    tableHTML += "<tr><th class='border px-4 py-2'>Thời gian</th><th class='border px-4 py-2'>Giá trị</th></tr>";
    
    data.forEach(row => {
        tableHTML += `<tr><td class='border px-4 py-2'>${row[columns[0]]}</td><td class='border px-4 py-2'>${row[columns[1]]}</td></tr>`;
    });
    tableHTML += "</table>";
    
    const popup = document.createElement("div");
    popup.classList.add("popup-overlay");
    popup.innerHTML = `
        <div class='popup'>
            <button class='close-btn' onclick='closePopup()'>x</button>
            <h2>${title}</h2>
            ${tableHTML}
        </div>
    `;
    document.body.appendChild(popup);
}

function closePopup() {
    document.querySelector(".popup-overlay").remove();
}

const style = document.createElement("style");
style.innerHTML = `
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
        padding: 20px;
        border-radius: 8px;
        box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
        position: relative;
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
`;
document.head.appendChild(style);
