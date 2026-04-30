import React, { useEffect, useState } from 'react';
import { getConfig, updateConfig } from '../api';
import { useApp } from '../context/AppContext';

const ALL_DAYS = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

export default function Config() {
  const [cfg, setCfg] = useState(null);
  const { toast } = useApp();

  useEffect(() => { getConfig().then(setCfg).catch(()=>{}); }, []);

  async function save(updated) {
    const next = { ...cfg, ...updated };
    setCfg(next);
    try { await updateConfig(next); toast('Configuration saved','success'); }
    catch(e) { toast(e.message,'error'); }
  }

  function toggleDay(day, checked) {
    const days = checked
      ? [...(cfg.days||[]), day].filter((v,i,a)=>a.indexOf(v)===i)
      : (cfg.days||[]).filter(d=>d!==day);
    const ordered = ALL_DAYS.filter(d => days.includes(d));
    save({ days: ordered });
  }

  function updatePeriodTime(i, val) {
    const times = [...(cfg.periodTimes||[])];
    times[i] = val;
    save({ periodTimes: times });
  }

  if (!cfg) return <div className="empty-state"><div className="empty-state-title">Loading...</div></div>;

  const nPer = cfg.periodsPerDay || 6;
  while ((cfg.periodTimes||[]).length < nPer) cfg.periodTimes.push('');

  return (
    <>
      <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit, minmax(400px, 1fr))',gap:20, width:'100%'}}>
        <div className="card">
          <div className="card-title">Working Days</div>
          <div className="card-subtitle">Select which days are working days</div>
          <div style={{display:'flex',flexDirection:'column',gap:12}}>
            {ALL_DAYS.map(d => (
              <div key={d} className="toggle-group">
                <label className="toggle">
                  <input type="checkbox" checked={(cfg.days||[]).includes(d)} onChange={e=>toggleDay(d,e.target.checked)} />
                  <div className="toggle-track"></div>
                </label>
                <span>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div className="card-title">Period Settings</div>
          <div className="card-subtitle">Configure number of periods and timing</div>
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            <div className="form-group">
              <label>Periods Per Day</label>
              <input type="number" className="form-control" min={3} max={10} value={cfg.periodsPerDay||6}
                onChange={e=>save({periodsPerDay:Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Lunch Break After Period</label>
              <input type="number" className="form-control" min={1} max={8} value={cfg.breakAfterPeriod||3}
                onChange={e=>save({breakAfterPeriod:Number(e.target.value)})} />
            </div>
            <div className="form-group">
              <label>Institution Name</label>
              <input type="text" className="form-control" placeholder="ABC Engineering College" value={cfg.institution||''}
                onChange={e=>save({institution:e.target.value})} />
            </div>
          </div>
        </div>
      </div>

      <div className="card" style={{marginTop:20}}>
        <div className="card-title">Period Time Slots</div>
        <div className="card-subtitle">Set start and end time for each period</div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {Array.from({length:nPer},(_,i)=>(
            <div key={i} className="flex items-center gap-3" style={{flexWrap:'nowrap'}}>
              <span className="badge badge-purple" style={{minWidth:70,justifyContent:'center', flexShrink:0}}>Period {i+1}</span>
              <input type="text" className="form-control" style={{flex:1, minWidth:'200px'}}
                value={(cfg.periodTimes||[])[i]||''} placeholder="09:00 - 10:00"
                onChange={e=>updatePeriodTime(i,e.target.value)} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
