const { createClient } = require('@libsql/client');

const client = createClient({
  url:       process.env.TURSO_URL,
  authToken: process.env.TURSO_AUTH_TOKEN,
});

// ─── Initialize tables on startup ─────────────────────────────
async function initDB() {
  await client.execute(`
    CREATE TABLE IF NOT EXISTS users (
      id              TEXT PRIMARY KEY,
      username        TEXT UNIQUE NOT NULL,
      password        TEXT NOT NULL,
      institutionName TEXT
    )
  `);

  await client.execute(`
    CREATE TABLE IF NOT EXISTS app_data (
      userId TEXT PRIMARY KEY,
      json   TEXT,
      FOREIGN KEY(userId) REFERENCES users(id)
    )
  `);

  console.log('✓ Turso database initialized');
}

initDB().catch(err => console.error('DB init error:', err));

// ─── Default data shape ────────────────────────────────────────
const DEFAULT_DATA = {
  faculty: [], subjects: [], rooms: [], groups: [],
  config: {
    days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    periodsPerDay: 6, breakAfterPeriod: 3, institution: '',
    periodTimes: [
      '09:00 - 10:00', '10:00 - 11:00', '11:00 - 12:00',
      '12:00 - 13:00', '14:00 - 15:00', '15:00 - 16:00'
    ]
  },
  timetable: null
};

// ─── Read / Write app data ─────────────────────────────────────
async function readDB(userId) {
  const result = await client.execute({
    sql:  'SELECT json FROM app_data WHERE userId = ?',
    args: [userId],
  });
  const row = result.rows[0];
  if (row && row.json) {
    try { return JSON.parse(row.json); }
    catch (e) { return JSON.parse(JSON.stringify(DEFAULT_DATA)); }
  }
  return JSON.parse(JSON.stringify(DEFAULT_DATA));
}

async function writeDB(userId, data) {
  const payload = JSON.stringify(data);
  await client.execute({
    sql: `INSERT INTO app_data (userId, json) VALUES (?, ?)
          ON CONFLICT(userId) DO UPDATE SET json = excluded.json`,
    args: [userId, payload],
  });
}

// ─── User auth helpers ────────────────────────────────────────
async function getUserByName(username) {
  const result = await client.execute({
    sql:  'SELECT * FROM users WHERE username = ?',
    args: [username],
  });
  return result.rows[0] || null;
}

async function createUser(id, username, hash, institutionName) {
  await client.execute({
    sql:  'INSERT INTO users (id, username, password, institutionName) VALUES (?, ?, ?, ?)',
    args: [id, username, hash, institutionName],
  });
}

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

module.exports = { client, readDB, writeDB, uid, getUserByName, createUser };
