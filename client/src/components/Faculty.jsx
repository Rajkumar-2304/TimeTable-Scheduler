import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import JsonImporter from './JsonImporter';
import { getFaculty, addFaculty, updateFaculty, deleteFaculty } from '../api';
import { useApp } from '../context/AppContext';

const EMPTY = { name:'', dept:'', email:'', maxPeriodsPerDay:4, maxPeriodsPerWeek:12, specialization:'' };

export default function Faculty() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const { toast } = useApp();

  const load = () => getFaculty().then(setList).catch(e => toast(e.message,'error'));
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(f) { setForm({...f}); setEditId(f.id); setModal(true); }

  async function save() {
    if (!form.name || !form.dept) { toast('Name and department required','error'); return; }
    try {
      if (editId) await updateFaculty(editId, form);
      else        await addFaculty(form);
      toast(`Faculty "${form.name}" saved`, 'success');
      setModal(false); load();
    } catch(e) { toast(e.message,'error'); }
  }

  async function remove(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteFaculty(id); toast('Faculty deleted','info'); load(); }
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
    else setSelected(new Set(filtered.map(f => f.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} faculty member(s)?`)) return;
    try {
      for (const id of selected) {
        await deleteFaculty(id);
      }
      toast(`${selected.size} faculty members deleted`, 'success');
      setSelected(new Set());
      load();
    } catch(e) { toast(e.message,'error'); }
  };

  const filtered = list.filter(f =>
    f.name.toLowerCase().includes(search.toLowerCase()) ||
    f.dept.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <span style={{fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>Faculty Members</span>
        </div>
        <div className="flex gap-2" style={{flex:1, justifyContent:'flex-end', flexWrap:'wrap', minWidth:0}}>
          <div className="search-bar">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search faculty..." />
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
              entityType="Faculty" 
              importEndpoint="faculty/bulk-import"
              onImport={load}
            />
            <button className="btn btn-primary" onClick={openAdd}>+ Add Faculty</button>
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: list.length === 0 ? '1fr' : 'repeat(auto-fill, minmax(240px, 1fr))', gap:'16px', marginBottom:'24px'}}>
        {filtered.length === 0 ? (
          <div style={{gridColumn:'1/-1'}}>
            <div className="empty-state">
              <div className="empty-state-title">{list.length===0?'No Faculty Added':'No Results'}</div>
              <div className="empty-state-desc">Add your first faculty member to get started</div>
              {list.length===0 && <button className="btn btn-primary" onClick={openAdd}>+ Add Faculty</button>}
            </div>
          </div>
        ) : filtered.map(f => (
          <div key={f.id} className="card" style={{display:'flex', flexDirection:'column', gap:'12px', position:'relative', opacity: selected.has(f.id) ? 0.7 : 1}}>
            <input
              type="checkbox"
              checked={selected.has(f.id)}
              onChange={() => toggleSelect(f.id)}
              style={{position:'absolute', top:12, right:12, width:18, height:18, cursor:'pointer'}}
            />
            <div>
              <div style={{fontSize:'1.1rem', fontWeight:'700', color:'var(--text-1)'}}>{f.name}</div>
              <div style={{fontSize:'0.85rem', color:'var(--text-3)', marginTop:'4px'}}>{f.dept}</div>
            </div>
            <div style={{fontSize:'0.8rem', color:'var(--text-2)'}}>
              <div><strong>Email:</strong> {f.email || 'Not provided'}</div>
              <div><strong>Max Periods/Day:</strong> {f.maxPeriodsPerDay}</div>
              <div><strong>Max Periods/Week:</strong> {f.maxPeriodsPerWeek || 12}</div>
              <div><strong>Specialization:</strong> {f.specialization || '—'}</div>
            </div>
            <div style={{marginTop:'auto', display:'flex', gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(f)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>remove(f.id,f.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)}
        title={<>【】 {editId?'Edit':'Add'} Faculty</>}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Faculty</button>
        </>}>
        <div className="form-grid">
          {[
            {label:'Full Name *',  id:'name',            type:'text',   placeholder:'Dr. John Smith'},
            {label:'Department *', id:'dept',            type:'text',   placeholder:'Computer Science'},
            {label:'Email',        id:'email',           type:'email',  placeholder:'faculty@college.edu'},
            {label:'Max Periods/Day', id:'maxPeriodsPerDay', type:'number', placeholder:'4'},
            {label:'Max Periods/Week', id:'maxPeriodsPerWeek', type:'number', placeholder:'12'},
            {label:'Specialization',  id:'specialization',  type:'text',   placeholder:'Data Structures...', full:true},
          ].map(f => (
            <div key={f.id} className="form-group" style={f.full?{gridColumn:'1/-1'}:{}}>
              <label>{f.label}</label>
              <input className="form-control" type={f.type} placeholder={f.placeholder}
                value={form[f.id]||''} onChange={e=>setForm(p=>({...p,[f.id]:e.target.value}))} />
            </div>
          ))}
        </div>
      </Modal>
    </div>
  );
}
