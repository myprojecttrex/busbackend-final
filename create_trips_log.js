const db = require("./config/db");

async function migrate() {
    try {
        await db.query(`
      CREATE TABLE IF NOT EXISTS trips_log (
        id            INT AUTO_INCREMENT PRIMARY KEY,
        trip_code     VARCHAR(10) NOT NULL,
        driver_name   VARCHAR(100),
        bus_number    VARCHAR(50),
        from_location VARCHAR(100),
        to_location   VARCHAR(100),
        company_id    INT,
        started_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        ended_at      TIMESTAMP NULL,
        KEY idx_trip_code (trip_code),
        KEY idx_company  (company_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4
    `);
        console.log("✅ trips_log table created successfully!");
        process.exit(0);
    } catch (e) {
        console.error("❌ Migration failed:", e.message);
        process.exit(1);
    }
}

migrate();
