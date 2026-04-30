const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getUserByName, createUser, uid } = require('../db');
const { JWT_SECRET } = require('../middleware/auth');

router.post('/register', async (req, res) => {
  try {
    const { username, institutionName, password } = req.body;
    if (!username || !institutionName || !password) return res.status(400).json({ error: 'Missing credentials' });

    const existing = await getUserByName(username);
    if (existing) return res.status(400).json({ error: 'Username already registered' });

    const salt = await bcrypt.genSalt(10);
    const hash = await bcrypt.hash(password, salt);
    
    const userId = uid();
    await createUser(userId, username, hash, institutionName);

    const token = jwt.sign({ id: userId, name: username, institution: institutionName }, JWT_SECRET, { expiresIn: '7d' });
    res.status(201).json({ token, username, institutionName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    if (!username || !password) return res.status(400).json({ error: 'Missing credentials' });

    const user = await getUserByName(username);
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    const token = jwt.sign({ id: user.id, name: user.username, institution: user.institutionName }, JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, username: user.username, institutionName: user.institutionName });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

module.exports = router;
