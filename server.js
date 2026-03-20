require("dotenv").config();
const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api/auth", require("./routes/auth"));
app.use("/api/tripcodes", require("./routes/tripCodes"));
app.use("/api/company", require("./routes/company"));
app.use("/api/tracking", require("./routes/tracking"));
app.use("/api/admin", require("./routes/admin"));

app.get("/api/health", (req, res) => res.json({ status: "ok", time: new Date() }));
app.get("/", (req, res) => res.json({ success: true, message: "🚌 Bus Tracking Backend is running normally." }));

app.use((req, res) => res.status(404).json({ error: "Route not found" }));
app.use((err, req, res, next) => res.status(500).json({ error: "Server error" }));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log("🚌 Bus Tracking Backend running on http://localhost:" + PORT);
});
