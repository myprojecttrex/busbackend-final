const db = require("./config/db");
const {
  buildCompanyAdminUserId,
  buildCompanyCode,
} = require("./utils/authCredentials");

async function columnExists(table, column) {
  const [rows] = await db.query(
    `SELECT 1
       FROM information_schema.columns
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND column_name = ?
      LIMIT 1`,
    [table, column]
  );
  return rows.length > 0;
}

async function indexExists(table, indexName) {
  const [rows] = await db.query(
    `SELECT 1
       FROM information_schema.statistics
      WHERE table_schema = DATABASE()
        AND table_name = ?
        AND index_name = ?
      LIMIT 1`,
    [table, indexName]
  );
  return rows.length > 0;
}

async function ensureColumn(table, column, definition) {
  if (await columnExists(table, column)) return;
  await db.query(`ALTER TABLE ${table} ADD COLUMN ${column} ${definition}`);
  console.log(`Added ${table}.${column}`);
}

async function ensureIndex(table, indexName, definition) {
  if (await indexExists(table, indexName)) return;
  await db.query(`ALTER TABLE ${table} ADD ${definition}`);
  console.log(`Added index ${indexName} on ${table}`);
}

async function backfillCompanyCodes() {
  const [companies] = await db.query(
    "SELECT company_id, company_code FROM companies ORDER BY company_id ASC"
  );

  for (const company of companies) {
    const companyCode = company.company_code || buildCompanyCode(company.company_id);
    await db.query(
      "UPDATE companies SET company_code = ? WHERE company_id = ?",
      [companyCode, company.company_id]
    );
  }
}

async function backfillCompanyAdminCredentials() {
  const [companies] = await db.query(
    "SELECT company_id, company_code FROM companies ORDER BY company_id ASC"
  );

  for (const company of companies) {
    const companyCode = company.company_code || buildCompanyCode(company.company_id);
    const [admins] = await db.query(
      `SELECT company_admin_id, user_id
         FROM company_admins
        WHERE company_id = ?
        ORDER BY company_admin_id ASC`,
      [company.company_id]
    );

    const existingUserIds = [];

    for (const admin of admins) {
      let nextUserId = admin.user_id;
      if (!nextUserId) {
        nextUserId = buildCompanyAdminUserId(companyCode, existingUserIds);
        await db.query(
          "UPDATE company_admins SET user_id = ?, username = COALESCE(username, ?) WHERE company_admin_id = ?",
          [nextUserId, nextUserId, admin.company_admin_id]
        );
      }
      existingUserIds.push(nextUserId);
    }
  }
}

async function run() {
  try {
    await ensureColumn("companies", "company_code", "VARCHAR(20) NULL AFTER company_id");
    await ensureColumn("company_admins", "user_id", "VARCHAR(50) NULL AFTER email");
    await ensureColumn(
      "company_admins",
      "role",
      "VARCHAR(30) NOT NULL DEFAULT 'company_admin' AFTER password"
    );
    await ensureColumn(
      "company_admins",
      "must_change_password",
      "TINYINT(1) NOT NULL DEFAULT 1 AFTER role"
    );
    await ensureColumn(
      "company_admins",
      "password_changed_at",
      "DATETIME NULL DEFAULT NULL AFTER must_change_password"
    );
    await ensureColumn(
      "company_admins",
      "last_login_at",
      "DATETIME NULL DEFAULT NULL AFTER password_changed_at"
    );

    await backfillCompanyCodes();
    await backfillCompanyAdminCredentials();

    await ensureIndex(
      "companies",
      "uq_companies_company_code",
      "UNIQUE KEY uq_companies_company_code (company_code)"
    );
    await ensureIndex(
      "company_admins",
      "uq_company_admins_user_id",
      "UNIQUE KEY uq_company_admins_user_id (user_id)"
    );

    console.log("Multi-tenant auth migration completed.");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error.message);
    process.exit(1);
  }
}

run();
