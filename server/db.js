const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_FILE = path.join(__dirname, 'database.sqlite');
const db = new sqlite3.Database(DB_FILE);

db.serialize(() => {
  // Check and migrate existing schema
  db.all("PRAGMA table_info(users)", (err, columns) => {
    if (err || !columns || columns.length === 0) {
      // Table doesn't exist, create new one
      db.run(`CREATE TABLE users (
        id TEXT PRIMARY KEY,
        username TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        institutionName TEXT
      )`, (createErr) => {
        if (createErr) console.error('Error creating users table:', createErr);
      });
    } else {
      // Table exists, check if migration needed
      const hasUsername = columns.some(col => col.name === 'username');
      const hasCollegeName = columns.some(col => col.name === 'collegeName');
      const hasInstitution = columns.some(col => col.name === 'institutionName');
      
      if (hasCollegeName && !hasUsername) {
        // Migrate collegeName to username
        db.run(`ALTER TABLE users RENAME COLUMN collegeName TO username`, (migErr) => {
          if (!migErr && !hasInstitution) {
            db.run(`ALTER TABLE users ADD COLUMN institutionName TEXT`, () => {
              console.log('✓ Database migrated successfully');
            });
          }
        });
      } else if (!hasInstitution) {
        db.run(`ALTER TABLE users ADD COLUMN institutionName TEXT`, () => {
          console.log('✓ Database schema updated');
        });
      }
    }
  });
  
  db.run(`CREATE TABLE IF NOT EXISTS app_data (
    userId TEXT PRIMARY KEY,
    json TEXT,
    FOREIGN KEY(userId) REFERENCES users(id)
  )`);
});

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

// Return a promise since sqlite queries are async
function readDB(userId) {
  return new Promise((resolve, reject) => {
    db.get('SELECT json FROM app_data WHERE userId = ?', [userId], (err, row) => {
      if (err) return reject(err);
      if (row && row.json) {
        try { resolve(JSON.parse(row.json)); }
        catch(e) { resolve(JSON.parse(JSON.stringify(DEFAULT_DATA))); }
      } else {
        resolve(JSON.parse(JSON.stringify(DEFAULT_DATA)));
      }
    });
  });
}

function writeDB(userId, data) {
  return new Promise((resolve, reject) => {
    const payload = JSON.stringify(data);
    db.run(`INSERT INTO app_data (userId, json) VALUES (?, ?) 
            ON CONFLICT(userId) DO UPDATE SET json = excluded.json`,
      [userId, payload], (err) => {
        if (err) reject(err);
        else resolve();
    });
  });
}

// User auth functions
function getUserByName(username) {
  return new Promise((resolve, reject) => {
    db.get('SELECT * FROM users WHERE username = ?', [username], (err, row) => {
      if (err) reject(err); else resolve(row);
    });
  });
}

function createUser(id, username, hash, institutionName) {
  return new Promise((resolve, reject) => {
    db.run('INSERT INTO users (id, username, password, institutionName) VALUES (?, ?, ?, ?)', [id, username, hash, institutionName], (err) => {
      if (err) reject(err); else resolve();
    });
  });
}

function uid() {
  return 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

module.exports = { db, readDB, writeDB, uid, getUserByName, createUser };
