require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { readDB, writeDB, uid } = require('./db');
const { authenticateToken } = require('./middleware/auth');

const app = express();
const PORT = process.env.PORT || 5000;

// Allow requests from Vercel frontend and local dev
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  /\.vercel\.app$/,        // any *.vercel.app domain
];
if (process.env.FRONTEND_URL) allowedOrigins.push(process.env.FRONTEND_URL);

app.use(cors({
  origin: (origin, cb) => {
    // Allow server-to-server calls (no origin) or matched origins
    if (!origin) return cb(null, true);
    const ok = allowedOrigins.some(p =>
      typeof p === 'string' ? p === origin : p.test(origin)
    );
    cb(ok ? null : new Error('CORS: origin not allowed'), ok);
  },
  credentials: true,
}));
app.use(express.json());

// ─── Routes ───────────────────────────────────────────────────
app.use('/api/auth',      require('./routes/auth'));
app.use('/api/faculty',   authenticateToken, require('./routes/faculty'));
app.use('/api/subjects',  authenticateToken, require('./routes/subjects'));
app.use('/api/rooms',     authenticateToken, require('./routes/rooms'));
app.use('/api/groups',    authenticateToken, require('./routes/groups'));
app.use('/api/config',    authenticateToken, require('./routes/config'));
app.use('/api/timetable', authenticateToken, require('./routes/timetable'));
app.use('/api/publish',   authenticateToken, require('./routes/publish'));

// ─── Sample Data ──────────────────────────────────────────────
app.post('/api/sample', authenticateToken, async (req, res) => {
  const uid2 = () => 'id_' + Math.random().toString(36).slice(2, 10) + Date.now().toString(36);

  // Faculty
  const f1 = uid2(), f2 = uid2(), f3 = uid2(), f4 = uid2(),
        f5 = uid2(), f6 = uid2(), f7 = uid2(), f8 = uid2();

  // Subjects
  const s1  = uid2(), s2  = uid2(), s3  = uid2(), s4  = uid2(), s5  = uid2(),
        s6  = uid2(), s7  = uid2(), s8  = uid2(), s9  = uid2(), s10 = uid2();

  // Rooms
  const r1 = uid2(), r2 = uid2(), r3 = uid2(), r4 = uid2();

  // Groups
  const g1 = uid2(), g2 = uid2(), g3 = uid2();

  const data = await readDB(req.userId || 'default');

  data.faculty = [
    { id:f1, name:'Dr. Arun Kumar',      dept:'Computer Science',   email:'arun@college.edu',      maxPeriodsPerDay:4, specialization:'Data Structures & Algorithms' },
    { id:f2, name:'Prof. Meena Sharma',  dept:'Computer Science',   email:'meena@college.edu',     maxPeriodsPerDay:4, specialization:'Database Systems' },
    { id:f3, name:'Dr. Vikram Nair',     dept:'Mathematics',        email:'vikram@college.edu',    maxPeriodsPerDay:5, specialization:'Discrete Mathematics' },
    { id:f4, name:'Prof. Lakshmi Priya', dept:'Computer Science',   email:'lakshmi@college.edu',   maxPeriodsPerDay:4, specialization:'Operating Systems & Networks' },
    { id:f5, name:'Dr. Rajesh Iyer',     dept:'Computer Science',   email:'rajesh@college.edu',    maxPeriodsPerDay:4, specialization:'Software Engineering' },
    { id:f6, name:'Prof. Anitha Menon',  dept:'Electronics',        email:'anitha@college.edu',    maxPeriodsPerDay:4, specialization:'Digital Electronics' },
    { id:f7, name:'Dr. Suresh Babu',     dept:'Computer Science',   email:'suresh@college.edu',    maxPeriodsPerDay:5, specialization:'Computer Networks' },
    { id:f8, name:'Prof. Priya Devi',    dept:'Mathematics',        email:'priya@college.edu',     maxPeriodsPerDay:4, specialization:'Probability & Statistics' },
  ];

  data.subjects = [
    { id:s1,  name:'Data Structures',        code:'CS301',  dept:'Computer Science', credits:4, periodsPerWeek:4, isLab:false },
    { id:s2,  name:'Database Systems',       code:'CS302',  dept:'Computer Science', credits:3, periodsPerWeek:3, isLab:false },
    { id:s3,  name:'Discrete Mathematics',   code:'MA301',  dept:'Mathematics',      credits:4, periodsPerWeek:4, isLab:false },
    { id:s4,  name:'Operating Systems',      code:'CS303',  dept:'Computer Science', credits:3, periodsPerWeek:3, isLab:false },
    { id:s5,  name:'Software Engineering',   code:'CS304',  dept:'Computer Science', credits:3, periodsPerWeek:3, isLab:false },
    { id:s6,  name:'Computer Networks',      code:'CS305',  dept:'Computer Science', credits:3, periodsPerWeek:3, isLab:false },
    { id:s7,  name:'Probability & Stats',    code:'MA302',  dept:'Mathematics',      credits:3, periodsPerWeek:3, isLab:false },
    { id:s8,  name:'OS Lab',                 code:'CS303L', dept:'Computer Science', credits:2, periodsPerWeek:2, isLab:true  },
    { id:s9,  name:'DBMS Lab',               code:'CS302L', dept:'Computer Science', credits:2, periodsPerWeek:2, isLab:true  },
    { id:s10, name:'Digital Electronics',    code:'EC301',  dept:'Electronics',      credits:3, periodsPerWeek:3, isLab:false },
  ];

  data.rooms = [
    { id:r1, name:'Room 101', capacity:65, floor:'Block A, Floor 1', isLab:false },
    { id:r2, name:'Room 102', capacity:65, floor:'Block A, Floor 1', isLab:false },
    { id:r3, name:'Room 201', capacity:70, floor:'Block B, Floor 2', isLab:false },
    { id:r4, name:'CS Lab 1', capacity:35, floor:'Block C, Floor 1', isLab:true  },
  ];

  data.groups = [
    {
      id:g1, name:'CSE - A (Sem 3)', dept:'Computer Science', semester:3, strength:60,
      curriculum: [
        { subjectId:s1,  facultyId:f1, periodsPerWeek:4 },
        { subjectId:s2,  facultyId:f2, periodsPerWeek:3 },
        { subjectId:s3,  facultyId:f3, periodsPerWeek:4 },
        { subjectId:s4,  facultyId:f4, periodsPerWeek:3 },
        { subjectId:s8,  facultyId:f4, periodsPerWeek:2 },
        { subjectId:s9,  facultyId:f2, periodsPerWeek:2 },
      ]
    },
    {
      id:g2, name:'CSE - B (Sem 3)', dept:'Computer Science', semester:3, strength:58,
      curriculum: [
        { subjectId:s1,  facultyId:f1, periodsPerWeek:4 },
        { subjectId:s5,  facultyId:f5, periodsPerWeek:3 },
        { subjectId:s6,  facultyId:f7, periodsPerWeek:3 },
        { subjectId:s7,  facultyId:f8, periodsPerWeek:3 },
        { subjectId:s8,  facultyId:f4, periodsPerWeek:2 },
        { subjectId:s9,  facultyId:f2, periodsPerWeek:2 },
      ]
    },
    {
      id:g3, name:'CSE - C (Sem 3)', dept:'Computer Science', semester:3, strength:55,
      curriculum: [
        { subjectId:s2,  facultyId:f2, periodsPerWeek:3 },
        { subjectId:s4,  facultyId:f4, periodsPerWeek:3 },
        { subjectId:s5,  facultyId:f5, periodsPerWeek:3 },
        { subjectId:s6,  facultyId:f7, periodsPerWeek:3 },
        { subjectId:s10, facultyId:f6, periodsPerWeek:3 },
        { subjectId:s8,  facultyId:f4, periodsPerWeek:2 },
      ]
    },
  ];

  data.config = {
    days: ['Monday','Tuesday','Wednesday','Thursday','Friday'],
    periodsPerDay: 6,
    breakAfterPeriod: 3,
    institution: 'ABC Engineering College',
    periodTimes: [
      '09:00 - 10:00',
      '10:00 - 11:00',
      '11:00 - 12:00',
      '12:00 - 13:00',
      '14:00 - 15:00',
      '15:00 - 16:00',
    ]
  };
  data.timetable = null;

  await writeDB(req.userId || 'default', data);
  res.json({ success: true, message: 'Sample data loaded' });
});


// ─── Stats ────────────────────────────────────────────────────
app.get('/api/stats', authenticateToken, async (req, res) => {
  const data = await readDB(req.userId || 'default');
  const totalSessions = data.timetable ? data.timetable.sessions.length : 0;
  const conflicts = data.timetable ? (data.timetable.violations || []).length : 0;
  res.json({
    faculty:  data.faculty.length,
    subjects: data.subjects.length,
    rooms:    data.rooms.length,
    groups:   data.groups.length,
    sessions: totalSessions,
    conflicts
  });
});

app.listen(PORT, () => {
  console.log(`✅ CRT Scheduler API running at http://localhost:${PORT}`);
});
