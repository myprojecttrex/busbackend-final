const http = require("http");

const paths = [
    "/api/company/dashboard",
    "/api/company/drivers",
    "/api/company/buses",
    "/api/company/routes",
    "/api/tripcodes"
];

paths.forEach(p => {
    const req = http.request({
        hostname: "localhost",
        port: 5000,
        path: p,
        method: "GET",
        headers: { "Authorization": "Bearer fake" }
    }, res => {
        let raw = "";
        res.on("data", d => raw += d);
        res.on("end", () => {
            console.log(`[${p}] ${res.statusCode} ${raw}`);
        });
    });
    req.end();
});
