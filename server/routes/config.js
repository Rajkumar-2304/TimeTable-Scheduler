const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db');

router.get('/', async (req, res) => {
  res.json((await readDB(req.userId || "default")).config);
});

router.put('/', async (req, res) => {
  const data = await readDB(req.userId || "default");
  data.config = { ...data.config, ...req.body };
  await writeDB(req.userId || "default", data);
  res.json(data.config);
});

module.exports = router;
