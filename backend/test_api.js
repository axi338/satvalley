async function testApi() {
    try {
        const response = await fetch('http://localhost:3000/api/admin/import/jobs');
        const data = await response.json();
        console.log("Status Code:", response.status);
        console.log("Response Body:", JSON.stringify(data, null, 2));
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
testApi();
