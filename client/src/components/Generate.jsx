import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { generateTimetable } from '../api';
import { useApp } from '../context/AppContext';

export default function Generate() {
  const [running, setRunning]   = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs]         = useState([]);
  const [result, setResult]     = useState(null);
  const { toast, setTimetable } = useApp();
  const nav = useNavigate();

  function addLog(msg, type='') {
    const t = new Date().toLocaleTimeString();
    setLogs(l => [...l, { msg: `[${t}] ${msg}`, type }]);
  }

  async function start() {
    setRunning(true); setProgress(0); setLogs([]); setResult(null);
    addLog(`Starting Genetic Algorithm scheduler`);
    addLog(`Optimizing timetable with evolutionary approach...`);

    let p = 0;
    const ticker = setInterval(() => {
      p = Math.min(p + Math.random() * 8, 90);
      setProgress(Math.round(p));
    }, 300);

    try {
      const tt = await generateTimetable({
        populationSize: 60,
        maxGenerations: 400,
        mutationRate: 0.15
      });
      clearInterval(ticker);
      setProgress(100);
      setTimetable(tt);
      setResult(tt);
      const v = tt.violations?.length || 0;
      addLog(`Complete! ${tt.sessions.length} sessions scheduled. Violations: ${v}`, v > 0 ? 'warn' : '');
      toast(`Timetable generated! ${tt.sessions.length} sessions, ${v} conflicts`, v===0?'success':'info');
    } catch(e) {
      clearInterval(ticker);
      addLog(`Error: ${e.message}`, 'error');
      toast(e.message, 'error');
    }
    setRunning(false);
  }

  return (
    <div>
      <div className="section-title mb-4" style={{marginBottom:20, fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>
        Generate Timetable
      </div>

      <div className="generator-layout">
        {/* ── Left: Config ── */}
        <div className="gen-config">
          {/* Generate button placed here so it appears under the page title on the left */}
          <div style={{marginTop: 6}}>
            <button
              className="btn btn-accent btn-lg full-width"
              onClick={start}
              disabled={running}
              style={{justifyContent: 'center'}}
            >
              {running ? 'Generating Schedule...' : 'Generate Timetable'}
            </button>
          </div>
        </div>

        {/* ── Right: Progress ── */}
        <div className="progress-area">
          <div className="progress-card">
            <div className="progress-header">
              <div className="progress-label">Generation Progress</div>
              <div className="progress-pct">{progress}%</div>
            </div>
            <div className="progress-bar-bg">
              <div className="progress-bar-fill" style={{width:`${progress}%`}}></div>
            </div>
            {result && (
              <div className="gen-stats-row">
                <div className="gen-stat">
                  <div className="gen-stat-val">{result.sessions?.length||0}</div>
                  <div className="gen-stat-lbl">Sessions</div>
                </div>
                <div className="gen-stat">
                  <div className="gen-stat-val">{result.fitness?.toFixed(3)||'—'}</div>
                  <div className="gen-stat-lbl">Fitness</div>
                </div>
                <div className="gen-stat">
                  <div className="gen-stat-val">{result.violations?.length||0}</div>
                  <div className="gen-stat-lbl">Violations</div>
                </div>
              </div>
            )}
            
          </div>

          <div className="card">
            <div className="card-title">Algorithm Log</div>
            <div className="log-area">
              {logs.length === 0
                ? <div style={{color:'var(--text-3)'}}>Awaiting generation start...</div>
                : logs.map((l,i) => <div key={i} className={`log-entry ${l.type}`}>{l.msg}</div>)
              }
            </div>
          </div>

          {result && (
            <div className="card">
              <div className="card-title">Generation Complete</div>
              <div style={{display:'flex',gap:12,flexWrap:'wrap',marginTop:12}}>
                <button className="btn btn-primary" onClick={()=>nav('/timetable')}>View Timetable</button>
                <button className="btn btn-ghost"   onClick={()=>nav('/conflicts')}>Check Conflicts</button>
                <button className="btn btn-ghost"   onClick={()=>window.print()}>Print</button>
              </div>
            </div>
          )}

          {/* right column actions live here (button moved to left) */}
        </div>
      </div>
    </div>
  );
}
