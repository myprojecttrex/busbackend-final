const db = require('./config/db');
(async () => {
    try {
        await db.query(`
      ALTER TABLE drivers
        ADD COLUMN address VARCHAR(255) DEFAULT NULL,
        ADD COLUMN licence_number VARCHAR(50) DEFAULT NULL,
        ADD COLUMN licence_expiry DATE DEFAULT NULL,
        ADD COLUMN experience VARCHAR(30) DEFAULT NULL,
        ADD COLUMN police_verification ENUM('pending','verified','rejected') DEFAULT 'pending'
    `);
        console.log('Columns added successfully');
    } catch (err) {
        if (err.code === 'ER_DUP_FIELDNAME') {
            console.log('Columns already exist, skipping');
        } else {
            console.error('Error:', err.message);
        }
    }
    process.exit(0);
})();
