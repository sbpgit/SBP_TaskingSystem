const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');

let pool;

function connectionConfig() {
  return {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
  };
}

// Creates the database (if missing), the connection pool, and all tables.
async function initDb() {
  const dbName = process.env.DB_NAME || 'ticketing_system';
  if (!/^[A-Za-z0-9_]+$/.test(dbName)) throw new Error('DB_NAME may only contain letters, digits and underscores');

  const conn = await mysql.createConnection(connectionConfig());
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${dbName}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();

  pool = mysql.createPool({
    ...connectionConfig(),
    database: dbName,
    waitForConnections: true,
    connectionLimit: 10,
    multipleStatements: true,
    dateStrings: true,
  });

  const schema = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf8');
  await pool.query(schema);
  await migrate(dbName);
  return pool;
}

// Upgrades databases created by earlier versions of the app.
// Each step is idempotent, so it is safe to run on every startup.
const ROLE_ENUM = "ENUM('admin','team_lead','member') NOT NULL DEFAULT 'member'";
const USER_COLUMNS = [
  ['role', ROLE_ENUM],
  ['employee_code', 'VARCHAR(20) NULL UNIQUE'],
  ['phone', 'VARCHAR(30) NULL'],
  ['designation', 'VARCHAR(100) NULL'],
  ['department', 'VARCHAR(100) NULL'],
  ['team_id', 'INT NULL'],
  ['status', "ENUM('active','inactive') NOT NULL DEFAULT 'active'"],
  ['joined_on', 'DATE NULL'],
];

async function migrate(dbName) {
  const [existing] = await pool.query(
    "SELECT COLUMN_NAME, COLUMN_TYPE FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users'",
    [dbName]
  );
  const types = Object.fromEntries(existing.map((c) => [c.COLUMN_NAME, c.COLUMN_TYPE]));

  for (const [name, def] of USER_COLUMNS) {
    if (!types[name]) await pool.query(`ALTER TABLE users ADD COLUMN ${name} ${def}`);
  }
  // Older versions only had admin/member roles.
  if (types.role && !types.role.includes('team_lead')) {
    await pool.query(`ALTER TABLE users MODIFY COLUMN role ${ROLE_ENUM}`);
  }

  const [fk] = await pool.query(
    `SELECT CONSTRAINT_NAME FROM information_schema.KEY_COLUMN_USAGE
     WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'users' AND COLUMN_NAME = 'team_id' AND REFERENCED_TABLE_NAME = 'teams'`,
    [dbName]
  );
  if (!fk.length) {
    await pool.query('ALTER TABLE users ADD CONSTRAINT fk_users_team FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL');
  }

  // Epic linking: a story/task/bug may belong to an epic (another issue of type 'epic' in the same project).
  const [epicCol] = await pool.query(
    "SELECT COLUMN_NAME FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = ? AND TABLE_NAME = 'issues' AND COLUMN_NAME = 'epic_id'",
    [dbName]
  );
  if (!epicCol.length) {
    await pool.query('ALTER TABLE issues ADD COLUMN epic_id INT NULL AFTER project_id');
    await pool.query('ALTER TABLE issues ADD CONSTRAINT fk_issues_epic FOREIGN KEY (epic_id) REFERENCES issues(id) ON DELETE SET NULL');
  }

  // Give existing accounts an employee code.
  const [noCode] = await pool.query('SELECT id FROM users WHERE employee_code IS NULL');
  for (const { id } of noCode) {
    try {
      await pool.query('UPDATE users SET employee_code = ? WHERE id = ?', [defaultEmployeeCode(id), id]);
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err; // code already taken manually; leave blank
    }
  }

  // There must always be at least one active Manager (admin); promote the oldest active user if none exists.
  const [[{ admins }]] = await pool.query("SELECT COUNT(*) AS admins FROM users WHERE role = 'admin' AND status = 'active'");
  if (!admins) await pool.query("UPDATE users SET role = 'admin' WHERE status = 'active' ORDER BY id LIMIT 1");
}

const defaultEmployeeCode = (id) => `EMP${String(id).padStart(4, '0')}`;

function getPool() {
  if (!pool) throw new Error('Database not initialised');
  return pool;
}

module.exports = { initDb, getPool, defaultEmployeeCode };
