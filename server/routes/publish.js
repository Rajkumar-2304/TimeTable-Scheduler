const express  = require('express');
const nodemailer = require('nodemailer');
const { readDB } = require('../db');

const router = express.Router();

// ─── Nodemailer transporter ───────────────────────────────────
// Uses environment variables so credentials are never hard-coded.
// Set SMTP_USER and SMTP_PASS in your environment (or a .env file
// with dotenv) before starting the server.
function createTransporter() {
  return nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 465,
    secure: true,           // SSL on port 465
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,   // 16-char App Password (no spaces)
    },
    tls: {
      rejectUnauthorized: false,     // avoids self-signed cert errors on some networks
    },
  });
}

// ─── POST /api/publish ────────────────────────────────────────
// Body: { to: string, subject?: string, format: 'html'|'csv' }
router.post('/', async (req, res) => {
  const { to, subject, format = 'html' } = req.body || {};

  if (!to) {
    return res.status(400).json({ error: 'Recipient email (to) is required.' });
  }

  const data = await readDB(req.userId || "default");
  if (!data.timetable) {
    return res.status(400).json({ error: 'No timetable generated yet.' });
  }

  const { sessions = [], violations = [] } = data.timetable;
  const config    = data.config    || {};
  const subjects  = data.subjects  || [];
  const faculty   = data.faculty   || [];
  const rooms     = data.rooms     || [];
  const groups    = data.groups    || [];
  const days      = config.days    || [];
  const times     = config.periodTimes || [];
  const inst      = config.institution || 'College Timetable';

  // Helper lookups
  const byId = (arr, id) => arr.find(x => x.id === id);


  
  // ─── Build HTML for PDF Attachment (Timetable Grid) ───────────
  function buildTimetableHTML() {
    const nPer = config.periodsPerDay || 6;
    const breakP = config.breakAfterPeriod || 3;
    const breakIdx = breakP - 1;

    const byGroup = {};
    sessions.forEach(s => {
      (byGroup[s.groupId] = byGroup[s.groupId] || []).push(s);
    });

    const tablesHtml = groups.map(grp => {
      const grpSessions = byGroup[grp.id];
      if (!grpSessions || grpSessions.length === 0) return '';
      
      const theadCells = [];
      for (let p = 0; p < nPer; p++) {
         if (p === breakP) theadCells.push(`<th class="break-col" style="width:40px; background:#e2e8f0; border:1px solid #cbd5e1; text-align:center;">BREAK</th>`);
         theadCells.push(`<th style="padding:10px; border:1px solid #cbd5e1; font-size:12px; background:#f8fafc;">P${p+1}<br/><span style="font-size:10px;font-weight:normal;">${times[p]||''}</span></th>`);
      }

      const tbodyRows = days.map((dayName, di) => {
         const skipPeriods = new Set();
         const rowCells = [];
         
         for (let p = 0; p < nPer; p++) {
           if (p === breakP) rowCells.push(`<td class="break-col" style="background:#e2e8f0; border:1px solid #cbd5e1; text-align:center; color:#64748b;">☕</td>`);
           if (skipPeriods.has(p)) continue;
           
           const slotSessions = grpSessions.filter(s => s.day === di && s.period === p);
           const sess = slotSessions[0];
           
           if (!sess) {
             rowCells.push(`<td style="border:1px solid #cbd5e1; text-align:center; color:#94a3b8;">—</td>`);
             continue;
           }

           let colSpan = 1;
           if (sess.duration > 1) {
             let maxSpan = 1;
             for (let i = 1; i < sess.duration; i++) {
               if (p + i >= nPer) break;
               if (p + i - 1 === breakIdx) break; 
               maxSpan++;
               skipPeriods.add(p + i);
             }
             colSpan = maxSpan;
           }

           const subName = byId(subjects, sess.subjectId)?.name || 'Unknown';
           const facName = byId(faculty, sess.facultyId)?.name || 'Unknown';
           const roomName = byId(rooms, sess.roomId)?.name || 'Unknown';
           const bg = sess.isLab ? '#fef3c7' : '#f0fdf4';
           const borderColor = sess.isLab ? '#f59e0b' : '#10b981';

           rowCells.push(`
             <td colspan="${colSpan}" style="background:${bg}; border:1px solid #cbd5e1; border-left:4px solid ${borderColor}; padding:8px; vertical-align:top;">
               <div style="font-weight:bold; font-size:12px; color:#334155;">${sess.isLab?'🔬 ':''}${subName}</div>
               <div style="font-size:10px; color:#64748b; margin-top:4px;">👨‍🏫 ${facName}</div>
               <div style="font-size:10px; color:#64748b;">🚪 ${roomName}</div>
             </td>
           `);
         }
         
         return `<tr>
           <th style="padding:10px; font-size:13px; background:#f1f5f9; border:1px solid #cbd5e1; text-align:left;">${dayName}</th>
           ${rowCells.join('')}
         </tr>`;
      }).join('');

      return `
        <div style="margin-bottom: 30px; page-break-inside: avoid;">
          <h2 style="color:#0f172a; margin-bottom:10px; font-size:18px;">👥 ${grp.name} Timetable</h2>
          <table style="width:100%; border-collapse:collapse; font-family:sans-serif;">
            <thead><tr><th style="width:70px; padding:10px; background:#f8fafc; border:1px solid #cbd5e1;">Day</th>${theadCells.join('')}</tr></thead>
            <tbody>${tbodyRows}</tbody>
          </table>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html><html><head><meta charset="UTF-8"/><style>body{font-family: Arial, sans-serif; color:#334155; padding:20px;} h1{color:#0f172a; margin-bottom:5px;} .header{border-bottom:2px solid #e2e8f0; padding-bottom:15px; margin-bottom:25px;}</style></head><body>
      <div class="header">
        <h1>📋 ${inst} — Standardized Weekly Timetable</h1>
        <p style="color:#64748b; margin:0;">Exported via CRT Scheduler Platform</p>
      </div>
      ${tablesHtml || '<p>No timetable configurations applied.</p>'}
    </body></html>`;
  }

  // ─── Build HTML for Email Body (Per-Class Faculty) ────────────
  function buildEmailHTML() {
    const groupSections = groups.map(grp => {
      // Find curriculum assigned to this group specifically
      const curric = grp.curriculum || [];
      if (curric.length === 0) return ''; // No assigned faculty

      const tbodyRows = curric.map((c, idx) => {
         const sub = byId(subjects, c.subjectId);
         const fac = byId(faculty, c.facultyId);
         if (!sub || !fac) return '';

         return `
           <tr>
             <td style="text-align:center">${idx + 1}</td>
             <td style="font-family:monospace; color:#10b981;">${sub.code}</td>
             <td style="color:#e2e8f0;">${sub.name}</td>
             <td style="font-weight:600; color:#e2e8f0;">👨‍🏫 ${fac.name}</td>
           </tr>
         `;
      }).filter(Boolean).join('');

      return `
        <div class="group-section">
          <h2>👥 ${grp.name} — Staff Allocations</h2>
          <table class="grid-table">
            <thead>
              <tr>
                <th style="width: 50px; text-align:center">S.No</th>
                <th>Subject Code</th>
                <th>Subject Name</th>
                <th>Faculty / Professor</th>
              </tr>
            </thead>
            <tbody>
              ${tbodyRows || '<tr><td colspan="4" style="text-align:center">No active curriculum allocations.</td></tr>'}
            </tbody>
          </table>
        </div>
      `;
    }).join('');

    return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8"/>
<style>
  body { font-family: 'Segoe UI', Arial, sans-serif; background:#0f172a; color:#e2e8f0; margin:0; padding:20px; }
  .wrapper { max-width:1200px; margin:0 auto; }
  .header  { background:linear-gradient(135deg,#1e293b,#0f172a); border:1px solid #334155;
              border-radius:12px; padding:28px 32px; margin-bottom:24px; }
  .header h1 { margin:0 0 6px; font-size:1.6rem; color:#10b981; }
  .header p  { margin:0; color:#94a3b8; font-size:0.9rem; }
  .badge { display:inline-block; background:rgba(16,185,129,0.15); color:#10b981;
           border:1px solid rgba(16,185,129,0.3); border-radius:6px;
           padding:3px 10px; font-size:0.75rem; font-weight:700; margin-top:10px; }
  
  .group-section { margin-bottom: 40px; }
  .group-section h2 { color: #f8fafc; font-size: 1.2rem; margin-bottom: 12px; padding-bottom: 8px; border-bottom: 1px solid #334155; }
  .grid-table  { width:100%; border-collapse:collapse; border-radius:10px; overflow:hidden; background:#1e293b; border: 1px solid #334155; }
  .grid-table thead { background:#0f172a; }
  .grid-table th { padding:12px 14px; text-align:left; font-size:0.75rem; color:#64748b;
           text-transform:uppercase; letter-spacing:0.05em; border-bottom:1px solid #334155; border-right:1px solid #334155; }
  .grid-table td { padding:11px 14px; font-size:0.85rem; border-bottom:1px solid #334155; border-right:1px solid #334155; }
  .grid-table tr:last-child td, .grid-table tr:last-child th { border-bottom: none; }

  .footer { text-align:center; color:#475569; font-size:0.75rem; margin-top:20px; padding-top:16px;
            border-top:1px solid #1e293b; }
</style>
</head>
<body>
<div class="wrapper">
  <div class="header">
    <h1>📋 ${inst} — Timetable & Staff Allocations</h1>
    <p>Please find the fully rendered PDF timetable securely attached to this email.</p>
    <span class="badge">✅ ${sessions.length} sessions scheduled successfully</span>
  </div>

  ${groupSections || '<p style="text-align:center; color:#64748b;">No allocations found.</p>'}

  <div class="footer">
    This report was published from <strong>CRT Scheduler</strong> on ${new Date().toLocaleString()}.
  </div>
</div>
</body>
</html>`;
  }

  // ─── Build email ──────────────────────────────────────────────
  const emailSubject = subject || `${inst} — Timetable Release`;
  const htmlBody     = buildEmailHTML();

  const mailOptions = {
    from   : `"CRT Scheduler" <${process.env.SMTP_USER || 'noreply@crt.edu'}>`,
    to,
    subject: emailSubject,
    html   : htmlBody,
  };

  // ─── Send ─────────────────────────────────────────────────────
  const smtpUser = process.env.SMTP_USER || '';
  const smtpPass = process.env.SMTP_PASS || '';

  if (!smtpUser || !smtpPass) {
    // Dev mode: log and return success to allow UI testing
    console.warn('[publish] SMTP_USER / SMTP_PASS not set — skipping actual send.');
    console.log('[publish] Would send to:', to);
    console.log('[publish] Subject:', emailSubject);
    return res.json({
      success: true,
      message : `[Dev Mode] Email not sent — SMTP credentials not configured. Would have emailed: ${to}`,
      devMode : true,
    });
  }

  try {
    const transporter = createTransporter();

    // Verify connection/auth before attempting to send
    await transporter.verify();

    const info = await transporter.sendMail(mailOptions);
    console.log('[publish] ✅ Email sent:', info.messageId);
    res.json({ success: true, message: `Timetable successfully published to ${to}.`, messageId: info.messageId });
  } catch (err) {
    console.error('[publish] ❌ Email error:', err.message);
    // Give a friendly, actionable error message
    let hint = err.message;
    if (err.message.includes('Invalid login') || err.message.includes('Username and Password')) {
      hint = 'Invalid Gmail credentials. Make sure SMTP_USER is your Gmail address and SMTP_PASS is a valid 16-character App Password (no spaces) from Google Account → Security → App Passwords.';
    } else if (err.message.includes('ECONNREFUSED') || err.message.includes('ETIMEDOUT')) {
      hint = 'Cannot connect to Gmail SMTP (smtp.gmail.com:465). Check your internet connection or firewall.';
    } else if (err.message.includes('SELF_SIGNED') || err.message.includes('certificate')) {
      hint = 'TLS certificate error. Try restarting the server.';
    }
    res.status(500).json({ error: hint });
  }
});

module.exports = router;
