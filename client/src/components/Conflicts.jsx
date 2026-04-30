import React, { useEffect, useState } from 'react';
import { getTimetable, getFaculty, getRooms, getGroups } from '../api';
import { useNavigate } from 'react-router-dom';

export default function Conflicts() {
  const [tt,      setTt]      = useState(null);
  const [faculty, setFaculty] = useState([]);
  const [rooms,   setRooms]   = useState([]);
  const [groups,  setGroups]  = useState([]);
  const [config,  setConfig]  = useState(null);
  const nav = useNavigate();

  useEffect(() => {
    Promise.all([getTimetable(), getFaculty(), getRooms(), getGroups()])
      .then(([t,f,r,g]) => { setTt(t); setFaculty(f); setRooms(r); setGroups(g); })
      .catch(()=>{});
    import('../api').then(api => api.getConfig().then(setConfig).catch(()=>{}));
  }, []);

  if (!tt) return (
    <div className="empty-state">
      <div className="empty-state-icon">✅</div>
      <div className="empty-state-title">No Timetable Generated</div>
      <div className="empty-state-desc">Generate a timetable first to check for conflicts</div>
      <button className="btn btn-primary" onClick={()=>nav('/generate')}>⚡ Generate Now</button>
    </div>
  );

  const violations = tt.violations || [];
  const days = config?.days || ['Mon','Tue','Wed','Thu','Fri'];

  if (violations.length === 0) return (
    <div className="empty-state">
      <div className="empty-state-icon">🎉</div>
      <div className="empty-state-title">No Conflicts!</div>
      <div className="empty-state-desc">Your timetable is perfectly conflict-free</div>
    </div>
  );

  const typeLabels = { faculty:'👨‍🏫 Faculty Conflict', room:'🚪 Room Conflict', group:'👥 Group Conflict' };

  return (
    <div>
      <div className="card" style={{marginBottom:16}}>
        <div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}>
          <div className="card-title"><span style={{color:'var(--danger)'}}>⚠️</span> {violations.length} Conflict(s) Found</div>
          <span className="badge badge-red">{violations.length} issues</span>
        </div>
        <div className="card-subtitle">Review and re-generate to resolve</div>
        <button className="btn btn-primary btn-sm" style={{marginTop:12}} onClick={()=>nav('/generate')}>
          ⚡ Re-generate Timetable
        </button>
      </div>

      <div className="conflict-list">
        {violations.map((v,i) => {
          const dayName = days[v.day] || `Day ${v.day}`;
          const label = faculty.find(f=>f.id===v.id)?.name
                     || rooms.find(r=>r.id===v.id)?.name
                     || groups.find(g=>g.id===v.id)?.name
                     || v.id;
          return (
            <div key={i} className="conflict-item">
              <span className="conflict-icon">⚠️</span>
              <div className="conflict-info">
                <div className="conflict-title">{typeLabels[v.type]||v.type}</div>
                <div className="conflict-detail">{dayName}, Period {v.period+1} — {label}</div>
              </div>
              <span className="badge badge-red">{v.type}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
