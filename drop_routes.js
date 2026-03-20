const db = require("./config/db");

async function migrate() {
    try {
        // Find FK constraint name for route_id on buses
        const [fks] = await db.query(
            `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE 
       WHERE TABLE_NAME='buses' AND COLUMN_NAME='route_id' AND TABLE_SCHEMA='bus_tracking'
       AND REFERENCED_TABLE_NAME IS NOT NULL`
        );

        for (const fk of fks) {
            console.log("Dropping FK:", fk.CONSTRAINT_NAME);
            await db.query(`ALTER TABLE buses DROP FOREIGN KEY ${fk.CONSTRAINT_NAME}`);
        }

        // Drop the route_id column from buses
        await db.query("ALTER TABLE buses DROP COLUMN route_id");
        console.log("✅ Removed route_id from buses table");

        // Drop the routes table
        await db.query("DROP TABLE IF EXISTS routes");
        console.log("✅ Dropped routes table");

        process.exit(0);
    } catch (e) {
        console.error("❌ Migration error:", e.message);
        process.exit(1);
    }
}

migrate();
