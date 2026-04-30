import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import JsonImporter from './JsonImporter';
import { getSubjects, addSubject, updateSubject, deleteSubject } from '../api';
import { useApp } from '../context/AppContext';

const EMPTY = { name:'', code:'', dept:'', credits:3, periodsPerWeek:3, isLab:false, labDuration:2 };

export default function Subjects() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const { toast } = useApp();

  const load = () => getSubjects().then(setList).catch(e => toast(e.message,'error'));
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(s) { setForm({...s}); setEditId(s.id); setModal(true); }

  async function save() {
    if (!form.name || !form.code || !form.dept) { toast('Name, code and department required','error'); return; }
    try {
      if (editId) await updateSubject(editId, form);
      else        await addSubject(form);
      toast(`Subject "${form.name}" saved`, 'success');
      setModal(false); load();
    } catch(e) { toast(e.message,'error'); }
  }

  async function remove(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteSubject(id); toast('Subject deleted','info'); load(); }
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
    if (selected.size === filtered.length) setSelected(new Set());
    else setSelected(new Set(filtered.map(s => s.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} subject(s)?`)) return;
    try {
      for (const id of selected) {
        await deleteSubject(id);
      }
      toast(`${selected.size} subjects deleted`, 'success');
      setSelected(new Set());
      load();
    } catch(e) { toast(e.message,'error'); }
  };

  const filtered = list.filter(s =>
    s.name.toLowerCase().includes(search.toLowerCase()) ||
    s.code.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <span style={{fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>Subjects & Courses</span>
        </div>
        <div className="flex gap-2" style={{flex:1, justifyContent:'flex-end', flexWrap:'wrap', minWidth:0}}>
          <div className="search-bar">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search subjects..." />
          </div>
          <div style={{display:'flex', gap:'6px', flexShrink:0, alignItems:'center'}}>
            {filtered.length > 0 && (
              <>
                <button 
                  className="btn btn-ghost btn-sm" 
                  onClick={toggleSelectAll}
                  title={selected.size === filtered.length ? 'Deselect All' : 'Select All'}
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
              entityType="Subjects" 
              importEndpoint="subjects/bulk-import"
              onImport={load}
            />
            <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: list.length === 0 ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px', marginBottom:'24px'}}>
        {filtered.length === 0 ? (
          <div style={{gridColumn:'1/-1'}}>
            <div className="empty-state">
              <div className="empty-state-title">{list.length===0?'No Subjects Added':'No Results'}</div>
              <div className="empty-state-desc">Add subjects and courses for scheduling</div>
              {list.length===0 && <button className="btn btn-primary" onClick={openAdd}>+ Add Subject</button>}
            </div>
          </div>
        ) : filtered.map(s => (
          <div key={s.id} className="card" style={{display:'flex', flexDirection:'column', gap:'12px', position:'relative', opacity: selected.has(s.id) ? 0.7 : 1}}>
            <input
              type="checkbox"
              checked={selected.has(s.id)}
              onChange={() => toggleSelect(s.id)}
              style={{position:'absolute', top:12, right:12, width:18, height:18, cursor:'pointer'}}
            />
            <div>
              <div style={{fontSize:'1.1rem', fontWeight:'700', color:'var(--text-1)'}}>{s.name}</div>
              <div style={{fontSize:'0.85rem', color:'var(--text-3)', marginTop:'4px'}}>{s.code}</div>
            </div>
            <div style={{fontSize:'0.8rem', color:'var(--text-2)'}}>
              <div><strong>Department:</strong> {s.dept}</div>
              <div><strong>Credits:</strong> {s.credits}</div>
              <div><strong>Periods/Week:</strong> {s.periodsPerWeek}</div>
              <div><strong>Type:</strong> {s.isLab?`Lab (${s.labDuration||2}p)`:'Theory'}</div>
            </div>
            <div style={{marginTop:'auto', display:'flex', gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(s)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>remove(s.id,s.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)}
        title={<>{editId?'Edit':'Add'} Subject</>}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Subject</button>
        </>}>
        <div className="form-grid">
          {[
            {label:'Subject Name *', id:'name',         type:'text',   ph:'Data Structures'},
            {label:'Subject Code *', id:'code',         type:'text',   ph:'CS301'},
            {label:'Department *',   id:'dept',         type:'text',   ph:'Computer Science'},
            {label:'Credits',        id:'credits',      type:'number', ph:'3'},
            {label:'Periods/Week',   id:'periodsPerWeek',type:'number',ph:'3'},
          ].map(f => (
            <div key={f.id} className="form-group">
              <label>{f.label}</label>
              <input className="form-control" type={f.type} placeholder={f.ph}
                value={form[f.id]||''} onChange={e=>setForm(p=>({...p,[f.id]:f.type==='number'?Number(e.target.value):e.target.value}))} />
            </div>
          ))}
          <div className="form-group flex gap-4">
            <div style={{flex: 1}}>
              <label>Type</label>
              <div className="toggle-group" style={{marginTop:8}}>
                <label className="toggle">
                  <input type="checkbox" checked={!!form.isLab} onChange={e=>setForm(p=>({...p,isLab:e.target.checked}))} />
                  <div className="toggle-track"></div>
                </label>
                <span style={{fontSize:'0.875rem'}}>Lab / Practical</span>
              </div>
            </div>
            {form.isLab && (
              <div style={{flex: 1}}>
                <label>Periods per Lab Session *</label>
                <input className="form-control" type="number" placeholder="2" style={{marginTop:4}}
                  value={form.labDuration || 2} onChange={e=>setForm(p=>({...p,labDuration:Number(e.target.value)}))} />
              </div>
            )}
          </div>
        </div>
      </Modal>
    </div>
  );
}
