import React, { useEffect, useRef, useState } from 'react';
import { getTimetable, getSubjects, getFaculty, getRooms, getGroups, getConfig, publishTimetable } from '../api';
import { useNavigate } from 'react-router-dom';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

const COLORS = 12;

// ─── Publish Modal ────────────────────────────────────────────────────────────
function PublishModal({ onClose, timetableData }) {
  const [email,   setEmail]   = useState('');
  const [subject, setSubject] = useState('Weekly Timetable');
  const [loading, setLoading] = useState(false);
  const [result,  setResult]  = useState(null); // { ok, msg }
  const overlayRef = useRef(null);

  function handleOverlayClick(e) {
    if (e.target === overlayRef.current) onClose();
  }

  async function send() {
    if (!email.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await publishTimetable({ to: email.trim(), subject: subject.trim() });
      setResult({ ok: true, msg: data.message + (data.devMode ? ' ⚙ (Dev mode — configure SMTP to send real emails)' : '') });
    } catch (err) {
      setResult({ ok: false, msg: err.message });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      ref={overlayRef}
      onClick={handleOverlayClick}
      style={{
        position:'fixed', inset:0, background:'rgba(0,0,0,0.7)', backdropFilter:'blur(6px)',
        zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center',
      }}
    >
      <div style={{
        background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-lg)',
        padding:'32px 36px', width:'100%', maxWidth:460,
        boxShadow:'0 24px 60px rgba(0,0,0,0.5)',
        animation:'slideUp 0.25s ease',
      }}>
        {/* Header */}
        <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:24 }}>
          <div style={{
            width:40, height:40, borderRadius:'var(--r-md)',
            background:'rgba(16,185,129,0.15)', border:'1px solid rgba(16,185,129,0.2)',
            display:'flex', alignItems:'center', justifyContent:'center', fontSize:'1.2rem',
          }}>📤</div>
          <div>
            <div style={{ fontWeight:700, fontSize:'1.05rem', color:'var(--text-1)' }}>Publish Timetable</div>
            <div style={{ fontSize:'0.78rem', color:'var(--text-3)', marginTop:2 }}>Send via email as HTML + CSV attachment</div>
          </div>
          <button onClick={onClose} style={{
            marginLeft:'auto', background:'none', border:'none', cursor:'pointer',
            color:'var(--text-3)', fontSize:'1.3rem', lineHeight:1, padding:4,
          }}>✕</button>
        </div>

        {/* Fields */}
        <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
          <div>
            <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>
              Recipient Email *
            </label>
            <input
              type="email"
              className="form-input"
              placeholder="e.g. principal@college.edu"
              value={email}
              onChange={e => setEmail(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && send()}
              disabled={loading}
              style={{ width:'100%', boxSizing:'border-box' }}
            />
          </div>
          <div>
            <label style={{ display:'block', fontSize:'0.78rem', fontWeight:600, color:'var(--text-2)', marginBottom:6 }}>
              Email Subject
            </label>
            <input
              type="text"
              className="form-input"
              placeholder="Weekly Timetable"
              value={subject}
              onChange={e => setSubject(e.target.value)}
              disabled={loading}
              style={{ width:'100%', boxSizing:'border-box' }}
            />
          </div>
        </div>

        {/* Info banner */}
        <div style={{
          marginTop:16, background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.2)',
          borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:'0.76rem', color:'#93c5fd',
          display:'flex', gap:8, alignItems:'flex-start',
        }}>
          <span style={{ fontSize:'1rem', marginTop:1 }}>ℹ</span>
          <span>The recipient will receive a formatted HTML email with the full timetable and a <strong>CSV attachment</strong>. Configure <code>SMTP_USER</code> &amp; <code>SMTP_PASS</code> env vars on the server for real delivery.</span>
        </div>

        {/* Result */}
        {result && (
          <div style={{
            marginTop:14, borderRadius:'var(--r-sm)', padding:'10px 14px', fontSize:'0.83rem',
            background: result.ok ? 'rgba(16,185,129,0.1)' : 'rgba(248,113,113,0.1)',
            border: `1px solid ${result.ok ? 'rgba(16,185,129,0.3)' : 'rgba(248,113,113,0.3)'}`,
            color: result.ok ? '#6ee7b7' : '#fca5a5',
            display:'flex', alignItems:'flex-start', gap:8,
          }}>
            <span>{result.ok ? '✅' : '❌'}</span>
            <span>{result.msg}</span>
          </div>
        )}

        {/* Actions */}
        <div style={{ display:'flex', gap:10, marginTop:22, justifyContent:'flex-end' }}>
          <button className="btn btn-ghost btn-sm" onClick={onClose} disabled={loading}>Cancel</button>
          <button
            className="btn btn-primary btn-sm"
            onClick={send}
            disabled={loading || !email.trim()}
            style={{ minWidth:110 }}
          >
            {loading ? '⏳ Sending…' : '📤 Send Email'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Export Dropdown ─────────────────────────────────────────────────────────
function ExportMenu({ onCSV, onPDF, onPublish }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    function close(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, []);

  const items = [
    { icon:'📄', label:'Export as CSV',  action: onCSV  },
    { icon:'📑', label:'Export as PDF',  action: onPDF  },
    { icon:'🖨', label:'Print',           action: () => window.print() },
    { icon:'📤', label:'Publish (Email)', action: onPublish, accent: true },
  ];

  return (
    <div ref={ref} style={{ position:'relative' }}>
      <button
        className="btn btn-ghost btn-sm"
        onClick={() => setOpen(o => !o)}
        style={{ display:'flex', alignItems:'center', gap:6 }}
      >
        ⬇ Export &amp; Publish <span style={{ fontSize:'0.65rem', opacity:0.7 }}>▼</span>
      </button>
      {open && (
        <div style={{
          position:'absolute', top:'calc(100% + 6px)', right:0,
          background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-md)',
          boxShadow:'0 12px 32px rgba(0,0,0,0.4)', minWidth:200, zIndex:200,
          overflow:'hidden', animation:'slideDown 0.15s ease',
        }}>
          {items.map(item => (
            <button
              key={item.label}
              onClick={() => { item.action(); setOpen(false); }}
              style={{
                width:'100%', display:'flex', alignItems:'center', gap:10,
                padding:'11px 16px', background:'none', border:'none', cursor:'pointer',
                color: item.accent ? 'var(--emerald)' : 'var(--text-1)',
                fontSize:'0.84rem', textAlign:'left',
                borderTop: item.accent ? '1px solid var(--border)' : 'none',
                transition:'background 0.15s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
              onMouseLeave={e => e.currentTarget.style.background = 'none'}
            >
              <span style={{ width:20, textAlign:'center' }}>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function Timetable() {
  const [tt,        setTt]        = useState(null);
  const [subjects,  setSubjects]  = useState([]);
  const [faculty,   setFaculty]   = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [groups,    setGroups]    = useState([]);
  const [config,    setConfig]    = useState(null);
  const [view,      setView]      = useState('group');
  const [selId,     setSelId]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [showPublish, setShowPublish] = useState(false);
  const [pdfLoading,  setPdfLoading] = useState(false);

  const gridRef = useRef(null);
  const nav = useNavigate();

  useEffect(() => {
    setLoading(true);
    Promise.all([getTimetable(), getSubjects(), getFaculty(), getRooms(), getGroups(), getConfig()])
      .then(([t, s, f, r, g, c]) => {
        setTt(t); setSubjects(s); setFaculty(f); setRooms(r); setGroups(g); setConfig(c);
        if (g.length) setSelId(g[0].id);
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (view === 'group'   && groups.length)  setSelId(groups[0].id);
    if (view === 'faculty' && faculty.length) setSelId(faculty[0].id);
    if (view === 'room'    && rooms.length)   setSelId(rooms[0].id);
  }, [view, groups, faculty, rooms]);

  // ─── Export CSV ────────────────────────────────────────────────
  function exportCSV() {
    if (!tt || !config) return;
    const days  = config.days    || [];
    const times = config.periodTimes || [];
    const rows  = [['Group','Subject','Faculty','Room','Day','Period(s)','Time','Type']];
    (tt.sessions || []).forEach(s => {
      const p2 = s.duration > 1 ? ` - P${s.period + s.duration}` : '';
      rows.push([
        groups.find(g => g.id === s.groupId)?.name   || '',
        subjects.find(x => x.id === s.subjectId)?.name || '',
        faculty.find(f => f.id === s.facultyId)?.name  || '',
        rooms.find(r => r.id === s.roomId)?.name       || '',
        days[s.day]   || '',
        `P${s.period + 1}${p2}`,
        times[s.period] || '',
        s.isLab ? `Lab (${s.duration} periods)` : 'Theory',
      ]);
    });
    const csv = rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv' }));
    a.download = 'timetable.csv'; a.click();
  }

  // ─── Export PDF ────────────────────────────────────────────────
  async function exportPDF() {
    if (!gridRef.current) return;
    setPdfLoading(true);
    try {
      const target = gridRef.current;
      const canvas = await html2canvas(target, {
        scale: 2,
        backgroundColor: '#0f172a',
        useCORS: true,
        logging: false,
      });
      const imgData = canvas.toDataURL('image/png');
      const pdf  = new jsPDF({ orientation: 'landscape', unit: 'pt', format: 'a4' });
      const pW   = pdf.internal.pageSize.getWidth();
      const pH   = pdf.internal.pageSize.getHeight();
      const ratio = Math.min(pW / canvas.width, pH / canvas.height);
      const imgW  = canvas.width  * ratio;
      const imgH  = canvas.height * ratio;
      const x = (pW - imgW) / 2;
      const y = (pH - imgH) / 2;

      // Header bar
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pW, pH, 'F');
      pdf.addImage(imgData, 'PNG', x, y, imgW, imgH);

      // Footer text
      pdf.setFontSize(8);
      pdf.setTextColor(71, 85, 105);
      pdf.text(
        `Generated by CRT Scheduler — ${new Date().toLocaleString()}`,
        pW / 2, pH - 12, { align: 'center' }
      );

      // ─── Add Faculty-Subject Table on 2nd Page ───────────
      pdf.addPage('a4', 'portrait');
      pdf.setFillColor(15, 23, 42);
      pdf.rect(0, 0, pW, pH, 'F');

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 20;

      // Title
      pdf.setFontSize(16);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Faculty & Subject Assignments', margin, margin + 15);

      // Selection info
      pdf.setFontSize(10);
      pdf.setTextColor(200, 200, 200);
      const selName = selectedItem?.name || 'Unknown';
      const viewLabel = view === 'group' ? 'Group' : view === 'faculty' ? 'Faculty' : 'Room';
      pdf.text(`${viewLabel}: ${selName}`, margin, margin + 35);

      // Table header
      const tableTop = margin + 50;
      const colWidth = (pageWidth - 2 * margin) / 3;

      // Draw header row
      pdf.setFillColor(59, 130, 246);
      pdf.rect(margin, tableTop, colWidth, 25, 'F');
      pdf.rect(margin + colWidth, tableTop, colWidth, 25, 'F');
      pdf.rect(margin + 2 * colWidth, tableTop, colWidth, 25, 'F');

      pdf.setFontSize(11);
      pdf.setTextColor(255, 255, 255);
      pdf.text('Faculty', margin + 8, tableTop + 17);
      pdf.text('Subject(s) Handled', margin + colWidth + 8, tableTop + 17);
      pdf.text('Dept', margin + 2 * colWidth + 8, tableTop + 17);

      // Table rows
      let rowY = tableTop + 25;
      const rowHeight = 20;
      let rowBg = false;

      // Build faculty list from filtered sessions
      const facultyList = [];
      Object.keys(facultySubjectMap).forEach(facId => {
        const fac = faculty.find(f => f.id === facId);
        if (fac) {
          const subIds = Array.from(facultySubjectMap[facId]);
          const subs = subIds.map(sId => subjects.find(s => s.id === sId)?.name || '?').join(', ');
          facultyList.push({ fac, subs });
        }
      });

      facultyList.forEach((item, idx) => {
        // Alternate row background
        if (rowBg) {
          pdf.setFillColor(30, 41, 59);
          pdf.rect(margin, rowY - 4, pageWidth - 2 * margin, rowHeight, 'F');
        }

        pdf.setFontSize(10);
        pdf.setTextColor(220, 220, 220);
        pdf.text(item.fac.name, margin + 8, rowY + 12);
        pdf.text(item.subs, margin + colWidth + 8, rowY + 12);
        pdf.text(item.fac.dept, margin + 2 * colWidth + 8, rowY + 12);

        rowY += rowHeight;
        rowBg = !rowBg;

        // Check if we need a new page
        if (rowY > pageHeight - margin - 20) {
          pdf.addPage('a4', 'portrait');
          pdf.setFillColor(15, 23, 42);
          pdf.rect(0, 0, pageWidth, pageHeight, 'F');
          rowY = margin + 20;
          rowBg = false;
        }
      });

      pdf.save(`timetable_${view}_${selId}.pdf`);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF export failed: ' + err.message);
    } finally {
      setPdfLoading(false);
    }
  }

  // ─── Loading / Empty states ────────────────────────────────────
  if (loading) return (
    <div className="empty-state">
      <div className="empty-state-icon" style={{ opacity:1 }}>⏳</div>
      <div className="empty-state-title">Loading timetable...</div>
    </div>
  );

  if (!tt) return (
    <div className="empty-state">
      <div className="empty-state-icon">📋</div>
      <div className="empty-state-title">No Timetable Generated</div>
      <div className="empty-state-desc">Run the scheduling algorithm to generate a timetable</div>
      <button className="btn btn-primary" onClick={() => nav('/generate')}>⚡ Generate Now</button>
    </div>
  );

  const days   = config?.days || [];
  const nPer   = config?.periodsPerDay || 6;
  const breakP = config?.breakAfterPeriod || 3; // 1-indexed
  const breakIdx = breakP - 1;                  // 0-indexed
  const times  = config?.periodTimes || [];

  const colorMap = {};
  subjects.forEach((s, i) => { colorMap[s.id] = (i * 47) % 360; });

  const filtered = (tt.sessions || []).filter(s => {
    if (view === 'group')   return s.groupId   === selId;
    if (view === 'faculty') return s.facultyId === selId;
    if (view === 'room')    return s.roomId    === selId;
    return false;
  });

  // Get enrolled subjects for current view
  const enrolledSubjectIds = new Set();
  filtered.forEach(s => enrolledSubjectIds.add(s.subjectId));

  // Get selected group/faculty/room details
  const selectedItem = view === 'group' ? groups.find(g => g.id === selId) : 
                       view === 'faculty' ? faculty.find(f => f.id === selId) : 
                       rooms.find(r => r.id === selId);

  // Get faculty-subject mapping for PDF
  const facultySubjectMap = {};
  filtered.forEach(s => {
    if (!facultySubjectMap[s.facultyId]) facultySubjectMap[s.facultyId] = new Set();
    facultySubjectMap[s.facultyId].add(s.subjectId);
  });

  const grid = {};
  filtered.forEach(s => {
    const k = `${s.day}-${s.period}`;
    (grid[k] = grid[k] || []).push(s);
  });

  const conflictKeys = new Set((tt.violations || []).map(v => `${v.day}-${v.period}`));
  const selectorItems = view === 'group' ? groups : view === 'faculty' ? faculty : rooms;

  const totalSlots    = days.length * nPer;
  const occupiedSlots = filtered.reduce((n, s) => n + (s.duration || 1), 0);
  const labSessions   = filtered.filter(s => s.isLab).length;

  // ─── Session card ──────────────────────────────────────────────
  function SessionCard({ sess }) {
    const sub  = subjects.find(s => s.id === sess.subjectId);
    const fac  = faculty.find(f => f.id === sess.facultyId);
    const room = rooms.find(r => r.id === sess.roomId);
    const grp  = groups.find(g => g.id === sess.groupId);
    const hue  = colorMap[sess.subjectId] ?? 220;
    const isConflict = conflictKeys.has(`${sess.day}-${sess.period}`);

    const bg = `hsl(${hue} 80% 95%)`;
    const borderCol = `hsl(${hue} 70% 85%)`;
    const textCol = `hsl(${hue} 30% 18%)`;

    return (
      <div
        className={`cell-session${isConflict ? ' cell-conflict' : ''}`}
        style={{
          height:'100%', background: bg, borderLeft: `3px solid ${isConflict ? 'var(--rose)' : borderCol}`,
          borderRadius:8, padding:8, boxSizing:'border-box', color:textCol,
          fontFamily:'Inter, system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial',
        }}
      >
        {sess.isLab && (
          <div style={{
            position:'absolute', top:6, right:8,
            background:'rgba(245,158,11,0.18)', border:`1px solid rgba(245,158,11,0.28)`,
            borderRadius:6, fontSize:'0.66rem', fontWeight:700,
            color:'#92400e', padding:'3px 7px', letterSpacing:'0.2px',
          }}>🔬 LAB · {sess.duration} periods</div>
        )}
        <div className="cell-subject" style={{ paddingRight: sess.isLab ? 72 : 0, fontWeight:700 }}>
          {sub?.name || '?'}
        </div>
        {fac && <div className="cell-faculty">👨‍🏫 {fac.name}</div>}
        {view !== 'group'   && grp  && <div className="cell-faculty">👥 {grp.name}</div>}
        {view !== 'room'    && room && <div className="cell-room">🚪 {room.name}</div>}
      </div>
    );
  }

  // ─── Build day row cells ───────────────────────────────────────
  function buildDayRow(di) {
    const skipPeriods = new Set();
    for (let p = 0; p < nPer; p++) {
      if (skipPeriods.has(p)) continue;
      const sessions = grid[`${di}-${p}`] || [];
      const lab = sessions.find(s => s.duration > 1);
      if (lab && p + lab.duration - 1 < nPer) {
        let maxSpan = 1;
        for (let i = 1; i < lab.duration; i++) {
          if (p + i >= nPer) break;
          // if moving to next period hits the break column, we stop spanning
          if (p + i - 1 === breakIdx) break;
          maxSpan++;
          skipPeriods.add(p + i);
        }
      }
    }

    const cells = [];
    for (let p = 0; p < nPer; p++) {
      if (p === breakP) {
        cells.push(
          <td key={`break-${di}`} className="break-td">
            <div className="break-td-inner">☕ BREAK</div>
          </td>
        );
      }
      if (skipPeriods.has(p)) continue;

      const k            = `${di}-${p}`;
      const slotSessions = grid[k] || [];
      const labSess      = slotSessions.find(s => s.duration > 1);
      
      let spansNext = false;
      let colSpan = 1;
      if (labSess) {
        let maxSpan = 1;
        for (let i = 1; i < labSess.duration; i++) {
          if (p + i >= nPer) break;
          if (p + i - 1 === breakIdx) break; // crosses the break column
          maxSpan++;
        }
        if (maxSpan > 1) {
          spansNext = true;
          colSpan = maxSpan;
        }
      }

      cells.push(
        <td key={p} colSpan={colSpan}
          style={{ ...(spansNext ? { background:'rgba(245,158,11,0.04)', borderLeft:'2px solid rgba(245,158,11,0.25)' } : {}) }}>
          {slotSessions.length === 0
            ? <div className="cell-empty">—</div>
            : slotSessions.map(sess => <SessionCard key={sess.id} sess={sess} />)
          }
        </td>
      );
    }
    return cells;
  }

  return (
    <div>
      {/* Publish Modal */}
      {showPublish && (
        <PublishModal
          onClose={() => setShowPublish(false)}
          timetableData={tt}
        />
      )}

      {/* PDF loading overlay */}
      {pdfLoading && (
        <div style={{
          position:'fixed', inset:0, background:'rgba(0,0,0,0.5)', backdropFilter:'blur(4px)',
          zIndex:999, display:'flex', alignItems:'center', justifyContent:'center', flexDirection:'column', gap:12,
        }}>
          <div style={{ fontSize:'2rem', animation:'spin 1s linear infinite' }}>⏳</div>
          <div style={{ color:'var(--text-1)', fontWeight:600 }}>Generating PDF…</div>
          <div style={{ color:'var(--text-3)', fontSize:'0.8rem' }}>Please wait, capturing the timetable</div>
        </div>
      )}

      {/* Header */}
      <div className="section-header no-print">
        <div className="section-title" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <span style={{fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>Weekly Timetable</span>
          <span className="badge badge-teal" style={{ marginLeft:4 }}>Labs: per-subject session durations (continuous periods)</span>
        </div>
        <div className="flex gap-2">
          <ExportMenu
            onCSV={exportCSV}
            onPDF={exportPDF}
            onPublish={() => setShowPublish(true)}
          />
        </div>
      </div>

      {/* Quick stats */}
      <div className="flex gap-3 mb-4 no-print" style={{ flexWrap:'wrap' }}>
        {[
          { label:'Total Slots',    val: totalSlots,                         col:'var(--text-2)' },
          { label:'Occupied',       val: occupiedSlots,                      col:'var(--emerald)' },
          { label:'Free Slots',     val: totalSlots - occupiedSlots,         col:'var(--amber)' },
          { label:'Lab Sessions',   val: labSessions,                        col:'var(--amber)' },
          { label:'Conflicts',      val: (tt.violations || []).length,       col:(tt.violations||[]).length>0?'var(--rose)':'var(--emerald)' },
          { label:'Total Sessions', val: (tt.sessions || []).length,         col:'var(--primary-hover)' },
        ].map(s => (
          <div key={s.label} style={{
            background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:'var(--r-md)',
            padding:'8px 14px', display:'flex', alignItems:'center', gap:8,
          }}>
            <span style={{ fontFamily:'JetBrains Mono, monospace', fontWeight:800, fontSize:'1rem', color:s.col }}>{s.val}</span>
            <span style={{ fontSize:'0.73rem', color:'var(--text-3)' }}>{s.label}</span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div className="timetable-controls no-print">
        <div className="view-tabs">
          {[
            { id:'group',   label:'👥 By Group'   },
            { id:'faculty', label:'👨‍🏫 By Faculty' },
            { id:'room',    label:'🚪 By Room'     },
          ].map(v => (
            <div key={v.id} className={`view-tab${view===v.id?' active':''}`} onClick={() => setView(v.id)}>
              {v.label}
            </div>
          ))}
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:'0.78rem', color:'var(--text-3)', whiteSpace:'nowrap' }}>View:</span>
          <select className="form-select" style={{ minWidth:220, padding:'7px 12px', fontSize:'0.83rem' }}
            value={selId} onChange={e => setSelId(e.target.value)}>
            {selectorItems.map(i => <option key={i.id} value={i.id}>{i.name}</option>)}
          </select>
        </div>
        <div style={{
          marginLeft:'auto',
          background:'rgba(245,158,11,0.08)', border:'1px solid rgba(245,158,11,0.25)',
          borderRadius:'var(--r-md)', padding:'5px 12px',
          fontSize:'0.72rem', color:'#fbbf24', display:'flex', alignItems:'center', gap:6,
        }}>
          🔬 <strong>Lab sessions use subject-defined durations</strong> (continuous periods)
        </div>
      </div>

      {/* ── TIMETABLE GRID ── */}
      <div className="timetable-outer" ref={gridRef}>
        <table className="timetable-grid">
          <thead>
            <tr>
              <th style={{ textAlign:'left', paddingLeft:16, borderRight:'1px solid var(--border)', minWidth:100 }}>
                Day / Period
              </th>
              {Array.from({ length: nPer }, (_, p) => (
                <React.Fragment key={p}>
                  {p === breakP && (
                    <th className="break-col-header">☕<br/>Break</th>
                  )}
                  <th className="period-col-header">
                    <div className="period-num">P{p + 1}</div>
                    <div className="period-time">{times[p] || `P${p + 1}`}</div>
                  </th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {days.map((dayName, di) => (
              <tr key={dayName}>
                <td className="day-label-cell">
                  <div className="day-name">{dayName}</div>
                  <div className="day-short">{dayName.slice(0, 3).toUpperCase()}</div>
                </td>
                {buildDayRow(di)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Subject Legend */}
      {subjects.length > 0 && (
        <div className="legend-strip no-print" style={{ marginTop:14 }}>
          {subjects.filter(s => enrolledSubjectIds.has(s.id)).map(s => (
            <div key={s.id} className={`legend-item`} style={{ display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8, marginRight:8, background:`hsl(${colorMap[s.id]} 80% 96%)` }}>
              <div style={{ fontSize:'0.95rem' }}>{s.isLab ? '🔬' : '📖'}</div>
              <div style={{ fontSize:'0.92rem', fontWeight:600, color:`hsl(${colorMap[s.id]} 30% 18%)` }}>{s.name}</div>
              {s.isLab && <span style={{ opacity:0.65, fontSize:'0.72rem', marginLeft:3 }}>{s.labDuration || 2}-periods</span>}
              <span style={{ opacity:0.5, fontSize:'0.65rem', marginLeft:4 }}>{s.code}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
