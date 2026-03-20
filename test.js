const http = require("http");

const req = http.request({
    hostname: "localhost",
    port: 5000,
    path: "/api/tripcodes/generate",
    method: "POST",
    headers: { "Content-Type": "application/json", "Authorization": "Bearer fakeToken" }
}, res => {
    console.log("Status:", res.statusCode);
    res.on("data", d => process.stdout.write(d));
});

req.on("error", e => console.error("Error:", e.message));
req.write(JSON.stringify({ driver_id: 1, bus_id: 1, from_location: "A", to_location: "B" }));
req.end();
