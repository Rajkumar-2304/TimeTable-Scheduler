import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import JsonImporter from './JsonImporter';
import { getGroups, addGroup, updateGroup, deleteGroup, getFaculty, getSubjects } from '../api';
import { useApp } from '../context/AppContext';

const EMPTY_GROUP = { name:'', dept:'', semester:1, strength:60, curriculum:[] };

export default function Groups() {
  const [groups,   setGroups]   = useState([]);
  const [faculty,  setFaculty]  = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [modal,    setModal]    = useState(false);
  const [form,     setForm]     = useState(EMPTY_GROUP);
  const [editId,   setEditId]   = useState(null);
  const [curriculum, setCurriculum] = useState([]); // [{subjectId, facultyId, periodsPerWeek, enabled}]
  const [selected, setSelected] = useState(new Set());
  const { toast } = useApp();

  useEffect(() => {
    getGroups().then(setGroups).catch(()=>{});
    getFaculty().then(setFaculty).catch(()=>{});
    getSubjects().then(setSubjects).catch(()=>{});
  }, []);

  function openAdd() {
    setForm(EMPTY_GROUP); setEditId(null);
    setCurriculum(subjects.map(s => ({ subjectId: s.id, facultyId: '', periodsPerWeek: s.periodsPerWeek, enabled: false })));
    setModal(true);
  }

  function openEdit(g) {
    setForm({...g}); setEditId(g.id);
    setCurriculum(subjects.map(s => {
      const existing = (g.curriculum||[]).find(c => c.subjectId === s.id);
      return { subjectId: s.id, facultyId: existing?.facultyId||'', periodsPerWeek: existing?.periodsPerWeek||s.periodsPerWeek, enabled: !!existing };
    }));
    setModal(true);
  }

  async function save() {
    if (!form.name || !form.dept) { toast('Name and department required','error'); return; }
    const curr = curriculum.filter(c => c.enabled).map(c => ({ subjectId: c.subjectId, facultyId: c.facultyId||null, periodsPerWeek: c.periodsPerWeek }));
    try {
      const payload = { ...form, curriculum: curr };
      if (editId) await updateGroup(editId, payload);
      else        await addGroup(payload);
      toast(`Group "${form.name}" saved with ${curr.length} subjects`, 'success');
      setModal(false);
      getGroups().then(setGroups);
    } catch(e) { toast(e.message,'error'); }
  }

  async function remove(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteGroup(id); toast('Group deleted','info'); getGroups().then(setGroups); }
    catch(e) { toast(e.message,'error'); }
  }

  const toggleSelect = (id) => {
    setSelected(prev => {
      const newSet = new Set(prev);
      if (newSet.has(id)) newSet.delete(id);
      else newSet.add(id);
      return newSet;
    });
  };

  const toggleSelectAll = () => {
    if (selected.size === groups.length) setSelected(new Set());
    else setSelected(new Set(groups.map(g => g.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} group(s)?`)) return;
    try {
      for (const id of selected) {
        await deleteGroup(id);
      }
      toast(`${selected.size} groups deleted`, 'success');
      setSelected(new Set());
      getGroups().then(setGroups);
    } catch(e) { toast(e.message,'error'); }
  };

  function updateCurr(subjectId, field, value) {
    setCurriculum(c => c.map(item => item.subjectId === subjectId ? {...item, [field]: value} : item));
  }

  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <span style={{fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>Student Groups</span>
        </div>
        <div className="flex gap-2" style={{flexWrap:'wrap'}}>
          {groups.length > 0 && (
            <>
              <button 
                className="btn btn-ghost btn-sm" 
                onClick={toggleSelectAll}
                title={selected.size === groups.length ? 'Deselect All' : 'Select All'}
              >
                ☐ {selected.size > 0 ? `${selected.size} selected` : 'Select All'}
              </button>
              {selected.size > 0 && (
                <button 
                  className="btn btn-danger btn-sm" 
                  onClick={deleteSelected}
                >
                  🗑 Delete ({selected.size})
                </button>
              )}
            </>
          )}
          <JsonImporter 
            entityType="Groups" 
            importEndpoint="groups/bulk-import"
            onImport={() => getGroups().then(setGroups)}
          />
          <button className="btn btn-primary" onClick={openAdd}>+ Add Group</button>
        </div>
      </div>

      {groups.length === 0 ? (
        <div className="empty-state">
          <div className="empty-state-title">No Student Groups</div>
          <div className="empty-state-desc">Add student groups and assign their curriculum</div>
          <button className="btn btn-primary" onClick={openAdd}>+ Add Group</button>
        </div>
      ) : (
        <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(240px,1fr))',gap:16}}>
          {groups.map(g => {
            const perWeek = (g.curriculum||[]).reduce((s,c)=>s+c.periodsPerWeek,0);
            return (
              <div key={g.id} className="card" style={{position:'relative', opacity: selected.has(g.id) ? 0.7 : 1}}>
                <input
                  type="checkbox"
                  checked={selected.has(g.id)}
                  onChange={() => toggleSelect(g.id)}
                  style={{position:'absolute', top:12, right:12, width:18, height:18, cursor:'pointer'}}
                />
                <div className="flex justify-between items-center" style={{marginBottom:12}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:'1rem'}}>{g.name}</div>
                    <div className="text-muted text-sm">{g.dept} · Sem {g.semester} · {g.strength} students</div>
                  </div>
                  <div className="flex gap-2">
                    <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(g)}>Edit</button>
                    <button className="btn btn-danger btn-sm" onClick={()=>remove(g.id,g.name)}>Del</button>
                  </div>
                </div>
                <div className="flex gap-2" style={{marginBottom:12}}>
                  <span className="badge badge-purple">{g.curriculum?.length||0} Subjects</span>
                  <span className="badge badge-teal">{perWeek} Periods/Week</span>
                </div>
                <div style={{display:'flex',flexDirection:'column',gap:4}}>
                  {(g.curriculum||[]).slice(0,4).map(c => {
                    const sub = subjects.find(s=>s.id===c.subjectId);
                    const fac = faculty.find(f=>f.id===c.facultyId);
                    if (!sub) return null;
                    return (
                      <div key={c.subjectId} style={{fontSize:'0.78rem',color:'var(--text-secondary)',display:'flex',justifyContent:'space-between'}}>
                        <span>{sub.name}</span>
                        <span style={{color:'var(--text-muted)'}}>{fac?fac.name:'No faculty assigned'} · {c.periodsPerWeek}p/w</span>
                      </div>
                    );
                  })}
                  {(g.curriculum?.length||0)>4 && <div className="text-muted text-xs">+{g.curriculum.length-4} more...</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal open={modal} onClose={()=>setModal(false)}
        title={<>{editId?'Edit':'Add'} Student Group</>}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Group</button>
        </>}>
        <div className="form-grid" style={{marginBottom:20}}>
          {[
            {label:'Group Name *',  id:'name',     type:'text',   ph:'CSE - A (Sem 3)'},
            {label:'Department *',  id:'dept',     type:'text',   ph:'Computer Science'},
            {label:'Semester',      id:'semester', type:'number', ph:'1'},
            {label:'Strength',      id:'strength', type:'number', ph:'60'},
          ].map(f => (
            <div key={f.id} className="form-group">
              <label>{f.label}</label>
              <input className="form-control" type={f.type} placeholder={f.ph}
                value={form[f.id]||''} onChange={e=>setForm(p=>({...p,[f.id]:f.type==='number'?Number(e.target.value):e.target.value}))} />
            </div>
          ))}
        </div>

        <div style={{fontWeight:700,fontSize:'0.9rem',marginBottom:12}}>Curriculum Assignment</div>
        {subjects.length === 0 ? (
          <div className="empty-state" style={{padding:20}}>
            <div className="empty-state-title">No Subjects Available</div>
            <div className="empty-state-desc">Add subjects first</div>
          </div>
        ) : (
          <div style={{display:'flex',flexDirection:'column',gap:8,maxHeight:320,overflowY:'auto'}}>
            {curriculum.map(ci => {
              const sub = subjects.find(s=>s.id===ci.subjectId);
              if (!sub) return null;
              return (
                <div key={ci.subjectId} className="curriculum-item">
                  <div className="curriculum-item-info">
                    <div className="curriculum-item-name">{sub.name}</div>
                      <div className="curriculum-item-meta">
                      <span className={`badge ${sub.isLab?'badge-yellow':'badge-purple'}`} style={{fontSize:'0.65rem'}}>{sub.isLab?'Lab':'Theory'}</span>
                      {' '}{sub.code}
                    </div>
                  </div>
                  <div className="curriculum-item-controls">
                    <select className="form-select" style={{minWidth:150,fontSize:'0.8rem',padding:'6px 10px'}}
                      value={ci.facultyId} onChange={e=>updateCurr(ci.subjectId,'facultyId',e.target.value)}>
                      <option value="">— No Faculty —</option>
                      {faculty.map(f => <option key={f.id} value={f.id}>{f.name}</option>)}
                    </select>
                    <input type="number" className="period-input" value={ci.periodsPerWeek} min={1} max={10}
                      onChange={e=>updateCurr(ci.subjectId,'periodsPerWeek',Number(e.target.value))} title="Periods/week" />
                    <label className="toggle" title="Include in curriculum">
                      <input type="checkbox" checked={ci.enabled} onChange={e=>updateCurr(ci.subjectId,'enabled',e.target.checked)} />
                      <div className="toggle-track"></div>
                    </label>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Modal>
    </div>
  );
}
