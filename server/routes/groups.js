const express = require('express');
const router = express.Router();
const { readDB, writeDB, uid } = require('../db');

router.get('/', async (req, res) => {
  res.json((await readDB(req.userId || "default")).groups);
});

router.post('/', async (req, res) => {
  const { name, dept, semester, strength, curriculum } = req.body;
  if (!name || !dept) return res.status(400).json({ error: 'Name and dept required' });
  const data = await readDB(req.userId || "default");
  const item = { id: uid(), name, dept, semester: semester || 1, strength: strength || 60, curriculum: curriculum || [] };
  data.groups.push(item);
  await writeDB(req.userId || "default", data);
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  const idx = data.groups.findIndex(g => g.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data.groups[idx] = { ...data.groups[idx], ...req.body, id: req.params.id };
  await writeDB(req.userId || "default", data);
  res.json(data.groups[idx]);
});

router.delete('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  data.groups = data.groups.filter(g => g.id !== req.params.id);
  await writeDB(req.userId || "default", data);
  res.json({ success: true });
});

router.post('/bulk-import', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    const data = await readDB(req.userId || "default");
    
    const imported = items.map(item => ({
      id: item.id || uid(),
      name: item.name || '',
      dept: item.dept || '',
      semester: item.semester || 1,
      strength: item.strength || 60,
      curriculum: item.curriculum || []
    }));

    data.groups.push(...imported);
    await writeDB(req.userId || "default", data);
    
    res.json({ success: true, imported: imported.length, message: `Successfully imported ${imported.length} groups` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
