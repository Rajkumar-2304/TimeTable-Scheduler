import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { getStats, loadSample } from '../api';
import { useApp } from '../context/AppContext';

const STEPS = [
  { key:'faculty',   label:'Add Faculty',     desc:'Teachers & lecturers'  },
  { key:'subjects',  label:'Add Subjects',    desc:'Theory & lab courses'  },
  { key:'rooms',     label:'Add Rooms',       desc:'Classrooms & labs'     },
  { key:'groups',    label:'Student Groups',  desc:'Classes + curriculum'  },
  { key:'timetable', label:'Generate',        desc:'Run the GA algorithm'  },
];

const NAV_MAP = { faculty:'/faculty', subjects:'/subjects', rooms:'/rooms', groups:'/groups', timetable:'/generate' };

export default function Dashboard() {
  const [stats, setStats] = useState({ faculty:0, subjects:0, rooms:0, groups:0, sessions:0, conflicts:0 });
  const [loading, setLoading] = useState(false);
  const { toast, institutionName, username } = useApp();
  const nav = useNavigate();

  const refresh = () => getStats().then(setStats).catch(() => {});
  useEffect(() => { refresh(); }, []);

  async function handleSample() {
    if (!confirm('This will replace all existing data with sample data. Continue?')) return;
    setLoading(true);
    try {
      await loadSample();
      await refresh();
      toast('Sample data loaded! 8 faculty, 10 subjects, 3 groups. Now generate the timetable.', 'success');
    } catch(e) { toast(e.message, 'error'); }
    setLoading(false);
  }

  const done = {
    faculty: stats.faculty > 0, subjects: stats.subjects > 0,
    rooms: stats.rooms > 0, groups: stats.groups > 0, timetable: stats.sessions > 0
  };
  const firstPending = STEPS.findIndex(s => !done[s.key]);

  const statCards = [
    { val:stats.faculty,   label:'Faculty Members',   color:'#6366f1', to:'/faculty'   },
    { val:stats.subjects,  label:'Subjects',           color:'#10b981', to:'/subjects'  },
    { val:stats.rooms,     label:'Rooms',              color:'#f59e0b', to:'/rooms'     },
    { val:stats.groups,    label:'Student Groups',     color:'#ec4899', to:'/groups'    },
    { val:stats.sessions,  label:'Scheduled Sessions', color:'#38bdf8', to:'/timetable' },
    { val:stats.conflicts, label:'Conflicts',          color: stats.conflicts>0?'#f43f5e':'#10b981', to:'/conflicts' },
  ];

  return (
    <div>
      {/* ── Welcome Banner ── */}
      <div className="welcome-banner">
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16 }}>
          <div>
            <div style={{ fontSize:'0.7rem', fontWeight:700, letterSpacing:'1.5px', textTransform:'uppercase', color:'var(--primary-hover)', marginBottom:6 }}>
              {institutionName || 'Your Institution'}
            </div>
            <div className="welcome-title">
              Timetable <span>Scheduler</span>
            </div>
            <div className="welcome-subtitle">
              Powered by <strong>Genetic Algorithm</strong> — automatically optimizes faculty constraints, room allocation,
              and period distribution across the entire week.
            </div>
            <div className="welcome-actions">
              <button className="btn btn-primary" onClick={() => nav('/generate')}>Generate Timetable</button>
              <button className="btn btn-ghost" onClick={handleSample} disabled={loading}>
                {loading ? 'Loading...' : 'Load Sample Data'}
              </button>
            </div>
          </div>
          {stats.sessions > 0 && (
            <div style={{
              background:'rgba(16,185,129,0.1)', border:'1px solid rgba(16,185,129,0.25)',
              borderRadius:'var(--r-lg)', padding:'16px 20px', textAlign:'center', minWidth:130
            }}>
              <div style={{ fontSize:'2rem', fontWeight:900, fontFamily:'JetBrains Mono, monospace', color:'var(--emerald)' }}>{stats.sessions}</div>
              <div style={{ fontSize:'0.72rem', color:'var(--text-3)', marginTop:2 }}>Sessions Scheduled</div>
              <div style={{ marginTop:8 }}>
                <span className={`badge ${stats.conflicts===0?'badge-teal':'badge-red'}`}>
                  {stats.conflicts === 0 ? '✅ Conflict-free' : `⚠ ${stats.conflicts} conflicts`}
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ── Stats Grid ── */}
      <div className="stats-grid">
        {statCards.map(s => (
          <div key={s.label} className="stat-card" style={{'--accent-bar': s.color, cursor:'pointer'}} onClick={() => nav(s.to)}>
            <div className="stat-value" style={{ color: s.color }}>{s.val}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      {/* ── Setup Workflow ── */}
      <div className="card mb-6">
        <div className="card-title">Setup Workflow</div>
        <div className="card-subtitle">Complete all steps to generate your timetable</div>
        <div className="workflow-steps">
          {STEPS.map((step, i) => {
            const isDone   = done[step.key];
            const isActive = !isDone && i === firstPending;
            return (
              <div key={step.key}
                className={`workflow-step ${isDone ? 'done' : isActive ? 'active' : ''}`}
                style={{ cursor:'pointer' }}
                onClick={() => nav(NAV_MAP[step.key])}>
                <div className="step-num">{isDone ? '✓' : i + 1}</div>
                <div>
                  <div className="step-label">{step.label}</div>
                  <div className="step-desc">{step.desc}</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ── Quick Actions Section Label ── */}
      <div style={{ fontSize:'0.67rem', fontWeight:700, textTransform:'uppercase', letterSpacing:'1.2px', color:'var(--text-3)', marginBottom:12 }}>
        Quick Actions
      </div>
      <div className="quick-actions-grid">
        {[
          { label:'Faculty',         desc:'Add & manage staff',        to:'/faculty',   color: 'var(--primary)'    },
          { label:'Subjects',        desc:'Theory & lab courses',      to:'/subjects',  color: 'var(--emerald)'    },
          { label:'Rooms',           desc:'Classrooms & labs',         to:'/rooms',     color: 'var(--amber)'      },
          { label:'Groups',          desc:'Classes + curriculum',      to:'/groups',    color: '#ec4899'           },
          { label:'Generate',        desc:'Run scheduling algorithm',  to:'/generate',  color: 'var(--primary)'    },
          { label:'View Timetable',  desc:'Full weekly grid view',     to:'/timetable', color: 'var(--emerald)'    },
        ].map(qa => (
          <div key={qa.to} className="quick-action-card" onClick={() => nav(qa.to)} 
            style={{borderLeft: `4px solid ${qa.color}`}}>
            <div className="qa-label">{qa.label}</div>
            <div className="qa-desc">{qa.desc}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
