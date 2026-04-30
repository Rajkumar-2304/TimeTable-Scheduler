import React, { useEffect, useState } from 'react';
import Modal from './Modal';
import JsonImporter from './JsonImporter';
import { getRooms, addRoom, updateRoom, deleteRoom } from '../api';
import { useApp } from '../context/AppContext';

const EMPTY = { name:'', capacity:60, floor:'', isLab:false };

export default function Rooms() {
  const [list, setList] = useState([]);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [form, setForm] = useState(EMPTY);
  const [editId, setEditId] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const { toast } = useApp();

  const load = () => getRooms().then(setList).catch(e => toast(e.message,'error'));
  useEffect(() => { load(); }, []);

  function openAdd() { setForm(EMPTY); setEditId(null); setModal(true); }
  function openEdit(r) { setForm({...r}); setEditId(r.id); setModal(true); }

  async function save() {
    if (!form.name) { toast('Room name required','error'); return; }
    try {
      if (editId) await updateRoom(editId, form);
      else        await addRoom(form);
      toast(`Room "${form.name}" saved`, 'success');
      setModal(false); load();
    } catch(e) { toast(e.message,'error'); }
  }

  async function remove(id, name) {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await deleteRoom(id); toast('Room deleted','info'); load(); }
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
    else setSelected(new Set(filtered.map(r => r.id)));
  };

  const deleteSelected = async () => {
    if (selected.size === 0) return;
    if (!confirm(`Delete ${selected.size} room(s)?`)) return;
    try {
      for (const id of selected) {
        await deleteRoom(id);
      }
      toast(`${selected.size} rooms deleted`, 'success');
      setSelected(new Set());
      load();
    } catch(e) { toast(e.message,'error'); }
  };

  const filtered = list.filter(r => r.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div>
      <div className="section-header">
        <div className="section-title" style={{display:'flex', alignItems:'center', gap:'12px'}}>
          <span style={{fontSize:'1.3rem', fontWeight:700, color:'var(--text-1)'}}>Rooms & Venues</span>
        </div>
        <div className="flex gap-2" style={{flex:1, justifyContent:'flex-end', flexWrap:'wrap', minWidth:0}}>
          <div className="search-bar">
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search rooms..." />
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
              entityType="Rooms" 
              importEndpoint="rooms/bulk-import"
              onImport={load}
            />
            <button className="btn btn-primary" onClick={openAdd}>+ Add Room</button>
          </div>
        </div>
      </div>

      <div style={{display:'grid', gridTemplateColumns: list.length === 0 ? '1fr' : 'repeat(auto-fill, minmax(220px, 1fr))', gap:'16px', marginBottom:'24px'}}>
        {filtered.length === 0 ? (
          <div style={{gridColumn:'1/-1'}}>
            <div className="empty-state">
              <div className="empty-state-title">{list.length===0?'No Rooms Added':'No Results'}</div>
              <div className="empty-state-desc">Add classrooms and lab spaces</div>
              {list.length===0 && <button className="btn btn-primary" onClick={openAdd}>+ Add Room</button>}
            </div>
          </div>
        ) : filtered.map(r => (
          <div key={r.id} className="card" style={{display:'flex', flexDirection:'column', gap:'12px', position:'relative', opacity: selected.has(r.id) ? 0.7 : 1}}>
            <input
              type="checkbox"
              checked={selected.has(r.id)}
              onChange={() => toggleSelect(r.id)}
              style={{position:'absolute', top:12, right:12, width:18, height:18, cursor:'pointer'}}
            />
            <div>
              <div style={{fontSize:'1.1rem', fontWeight:'700', color:'var(--text-1)'}}>▣ {r.name}</div>
              <span className={`badge ${r.isLab?'badge-yellow':'badge-teal'}`}>{r.isLab?'Lab':'Classroom'}</span>
            </div>
            <div style={{fontSize:'0.8rem', color:'var(--text-2)'}}>
              <div><strong>Capacity:</strong> {r.capacity} seats</div>
              <div><strong>Location:</strong> {r.floor||'—'}</div>
            </div>
            <div style={{marginTop:'auto', display:'flex', gap:'8px'}}>
              <button className="btn btn-ghost btn-sm" onClick={()=>openEdit(r)}>Edit</button>
              <button className="btn btn-danger btn-sm" onClick={()=>remove(r.id,r.name)}>Delete</button>
            </div>
          </div>
        ))}
      </div>

      <Modal open={modal} onClose={()=>setModal(false)}
        title={<>{editId?'Edit':'Add'} Room</>}
        footer={<>
          <button className="btn btn-ghost" onClick={()=>setModal(false)}>Cancel</button>
          <button className="btn btn-primary" onClick={save}>Save Room</button>
        </>}>
        <div className="form-grid">
          <div className="form-group">
            <label>Room Name *</label>
            <input className="form-control" placeholder="Room 101" value={form.name}
              onChange={e=>setForm(p=>({...p,name:e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Capacity</label>
            <input className="form-control" type="number" value={form.capacity}
              onChange={e=>setForm(p=>({...p,capacity:Number(e.target.value)}))} />
          </div>
          <div className="form-group">
            <label>Floor / Block</label>
            <input className="form-control" placeholder="Block A, Floor 2" value={form.floor}
              onChange={e=>setForm(p=>({...p,floor:e.target.value}))} />
          </div>
          <div className="form-group">
            <label>Type</label>
            <div className="toggle-group" style={{marginTop:8}}>
              <label className="toggle">
                <input type="checkbox" checked={!!form.isLab} onChange={e=>setForm(p=>({...p,isLab:e.target.checked}))} />
                <div className="toggle-track"></div>
              </label>
              <span style={{fontSize:'0.875rem'}}>Lab / Special Room</span>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
}
