const express = require('express');
const router = express.Router();
const { readDB, writeDB, uid } = require('../db');

router.get('/', async (req, res) => {
  const data = await readDB(req.userId || "default");
  res.json(data.faculty);
});

router.post('/', async (req, res) => {
  const { name, dept, email, maxPeriodsPerDay, specialization } = req.body;
  if (!name || !dept) return res.status(400).json({ error: 'Name and department required' });
  const data = await readDB(req.userId || "default");
  const item = { id: uid(), name, dept, email: email || '', maxPeriodsPerDay: maxPeriodsPerDay || 4, specialization: specialization || '' };
  data.faculty.push(item);
  await writeDB(req.userId || "default", data);
  res.status(201).json(item);
});

router.post('/bulk-import', async (req, res) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) {
      return res.status(400).json({ error: 'Items must be an array' });
    }

    const data = await readDB(req.userId || "default");
    
    // Add new faculty items
    const imported = items.map(item => ({
      id: item.id || uid(),
      name: item.name || '',
      dept: item.dept || '',
      email: item.email || '',
      maxPeriodsPerDay: item.maxPeriodsPerDay || 4,
      specialization: item.specialization || ''
    }));

    data.faculty.push(...imported);
    await writeDB(req.userId || "default", data);
    
    res.json({ success: true, imported: imported.length, message: `Successfully imported ${imported.length} faculty members` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

router.put('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  const idx = data.faculty.findIndex(f => f.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data.faculty[idx] = { ...data.faculty[idx], ...req.body, id: req.params.id };
  await writeDB(req.userId || "default", data);
  res.json(data.faculty[idx]);
});

router.delete('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  data.faculty = data.faculty.filter(f => f.id !== req.params.id);
  await writeDB(req.userId || "default", data);
  res.json({ success: true });
});

module.exports = router;
