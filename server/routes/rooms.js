const express = require('express');
const router = express.Router();
const { readDB, writeDB, uid } = require('../db');

router.get('/', async (req, res) => {
  res.json((await readDB(req.userId || "default")).rooms);
});

router.post('/', async (req, res) => {
  const { name, capacity, floor, isLab } = req.body;
  if (!name) return res.status(400).json({ error: 'Room name required' });
  const data = await readDB(req.userId || "default");
  const item = { id: uid(), name, capacity: capacity || 60, floor: floor || '', isLab: !!isLab };
  data.rooms.push(item);
  await writeDB(req.userId || "default", data);
  res.status(201).json(item);
});

router.put('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  const idx = data.rooms.findIndex(r => r.id === req.params.id);
  if (idx < 0) return res.status(404).json({ error: 'Not found' });
  data.rooms[idx] = { ...data.rooms[idx], ...req.body, id: req.params.id };
  await writeDB(req.userId || "default", data);
  res.json(data.rooms[idx]);
});

router.delete('/:id', async (req, res) => {
  const data = await readDB(req.userId || "default");
  data.rooms = data.rooms.filter(r => r.id !== req.params.id);
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
      capacity: item.capacity || 60,
      floor: item.floor || '',
      isLab: !!item.isLab
    }));

    data.rooms.push(...imported);
    await writeDB(req.userId || "default", data);
    
    res.json({ success: true, imported: imported.length, message: `Successfully imported ${imported.length} rooms` });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
