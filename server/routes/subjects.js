const express = require('express');
const router = express.Router();
const { readDB, writeDB, uid } = require('../db');

router.get('/', async (req, res) => {
  res.json((await readDB(req.userId || "default")).subjects);
});

router.post('/', async (req, res) => {
  const { name, code, dept, credits, periodsPerWeek, isLab, labDuration } = req.body;
  if (!name || !code || !dept) return res.status(400).json({ error: 'Name, code and dept required' });
  const data = await readDB(req.userId || "default");
  const item = { id: uid(), name, code, dept, credits: credits || 3, periodsPerWeek: periodsPerWeek || 3, isLab: !!isLab, labDuration: Number(labDuration) || 2 };
  data.subjects.push(item);
  await writeDB(req.userId || "default", data);
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  const idx = data.subjects.findIndex(s => s.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data.subjects[idx] = { ...data.subjects[idx], ...req.body, id: req.params.id };
  await writeDB(req.userId || "default", data);
  res.json(data.subjects[idx]);
});

router.delete('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  data.subjects = data.subjects.filter(s => s.id !== req.params.id);
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
      code: item.code || '',
      dept: item.dept || '',
      credits: item.credits || 3,
      periodsPerWeek: item.periodsPerWeek || 3,
      isLab: !!item.isLab,
      labDuration: Number(item.labDuration) || 2
    }));

    data.subjects.push(...imported);
    await writeDB(req.userId || "default", data);
    
    res.json({ success: true, imported: imported.length, message: `Successfully imported ${imported.length} subjects` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
