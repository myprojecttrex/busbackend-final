const http = require("http");

async function getToken() {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: "localhost",
            port: 5000,
            path: "/api/auth/company-admin/login",
            method: "POST",
            headers: { "Content-Type": "application/json" }
        }, res => {
            let data = "";
            res.on("data", chunk => data += chunk);
            res.on("end", () => resolve(JSON.parse(data).token));
        });
        // From seeder: username=companyadmin password=admin123
        req.write(JSON.stringify({ username: "companyadmin", password: "admin123" }));
        req.end();
    });
}

async function run() {
    const token = await getToken();
    console.log("Token:", token ? "Got token" : "Failed");

    const req = http.request({
        hostname: "localhost",
        port: 5000,
        path: "/api/tripcodes/generate",
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer " + token
        }
    }, res => {
        let raw = "";
        res.on("data", d => raw += d);
        res.on("end", () => {
            console.log(`Status: ${res.statusCode}\\nResponse: ${raw}`);
        });
    });

    // Using valid sample database IDs for driver and bus
    req.write(JSON.stringify({
        driver_id: 1,
        bus_id: 1,
        from_location: "Chennai",
        to_location: "Madurai"
    }));
    req.end();
}

run();
