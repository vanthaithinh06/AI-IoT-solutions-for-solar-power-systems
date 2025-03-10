const GOOGLE_SHEET_API_URL = "https://script.google.com/macros/s/AKfycbw-c9iZGcOyYXWW22O9i8GgMbhBrY3UUWlK8WOLJa8366ioExVUtStffHCkQVYZtUw/exec"; // Thay URL đúng vào đây

// Hàm lấy dữ liệu từ Google Sheets
export async function fetchDataFromGoogleSheets() {
    try {
        const response = await fetch(GOOGLE_SHEET_API_URL);
        if (!response.ok) throw new Error("Lỗi HTTP: " + response.status);

        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Lỗi khi lấy dữ liệu từ Google Sheets:", error);
        return [];
    }
}

// Hàm gửi dữ liệu lên Google Sheets
export async function saveDataToGoogleSheets(data) {
    try {
        const response = await fetch(GOOGLE_SHEET_API_URL, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(data)
        });

        const result = await response.json();
        return result;
    } catch (error) {
        console.error("Lỗi khi lưu dữ liệu lên Google Sheets:", error);
        return null;
    }
}
