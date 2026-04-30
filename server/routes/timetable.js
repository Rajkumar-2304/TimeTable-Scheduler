const express = require('express');
const router = express.Router();
const { readDB, writeDB } = require('../db');
const { TimetableScheduler } = require('../scheduler');

router.get('/', async (req, res) => {
  const data = await readDB(req.userId || "default");
  res.json(data.timetable || null);
});

router.post('/generate', async (req, res) => {
  const data = await readDB(req.userId || "default");
  const { populationSize = 60, maxGenerations = 400, mutationRate = 0.15 } = req.body;

  if (!data.faculty.length || !data.subjects.length || !data.rooms.length) {
    return res.status(400).json({ error: 'Add faculty, subjects and rooms first' });
  }

  const totalSessions = data.groups.reduce((s, g) =>
    s + (g.curriculum || []).reduce((a, c) => a + c.periodsPerWeek, 0), 0);
  if (totalSessions === 0) {
    return res.status(400).json({ error: 'Add student groups with curriculum first' });
  }

  const scheduler = new TimetableScheduler(
    { faculty: data.faculty, subjects: data.subjects, rooms: data.rooms, groups: data.groups, config: data.config },
    { populationSize, maxGenerations, mutationRate }
  );

  const result = scheduler.generate();

  if (!result.success) {
    return res.status(500).json({ error: result.error });
  }

  data.timetable = {
    sessions: result.sessions,
    fitness: result.fitness,
    violations: result.violations || [],
    stats: result.stats,
    generatedAt: new Date().toISOString()
  };
  await writeDB(req.userId || "default", data);
  res.json(data.timetable);
});

module.exports = router;
