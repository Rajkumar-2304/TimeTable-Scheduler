import React, { useRef, useState } from 'react';
import { useApp } from '../context/AppContext';

export default function JsonImporter({ entityType, onImport, importEndpoint }) {
  const fileInputRef = useRef(null);
  const [importing, setImporting] = useState(false);
  const [showPasteModal, setShowPasteModal] = useState(false);
  const [jsonText, setJsonText] = useState('');
  const { toast } = useApp();

  async function processJson(data) {
    try {
      setImporting(true);

      if (!Array.isArray(data)) {
        toast('JSON must be an array', 'error');
        return;
      }

      const token = localStorage.getItem('crt_token');
      const headers = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`/api/${importEndpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ items: data })
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const result = await response.json();
      onImport();
      toast(`Successfully imported ${data.length} ${entityType}`, 'success');
      setShowPasteModal(false);
      setJsonText('');
    } catch (err) {
      toast(`Error importing ${entityType}: ${err.message}`, 'error');
    } finally {
      setImporting(false);
    }
  }

  async function handleFileSelect(e) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith('.json')) {
      toast('Please select a valid JSON file', 'error');
      return;
    }

    try {
      const text = await file.text();
      const data = JSON.parse(text);
      await processJson(data);
    } catch (err) {
      toast(`Error parsing JSON file: ${err.message}`, 'error');
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  }

  async function handlePasteSubmit() {
    if (!jsonText.trim()) {
      toast('Please paste JSON text', 'error');
      return;
    }

    try {
      const data = JSON.parse(jsonText);
      await processJson(data);
    } catch (err) {
      toast(`Invalid JSON format: ${err.message}`, 'error');
    }
  }

  return (
    <>
      <div className="import-section" style={{display:'flex', gap:'8px', alignItems:'center'}}>
        <input
          ref={fileInputRef}
          type="file"
          accept=".json"
          onChange={handleFileSelect}
          disabled={importing}
          style={{ display: 'none' }}
        />
        <button
          className="btn btn-ghost"
          onClick={() => fileInputRef.current?.click()}
          disabled={importing}
          title="Upload JSON file"
        >
          {importing ? 'Importing...' : 'Upload JSON'}
        </button>
        <button
          className="btn btn-ghost"
          onClick={() => setShowPasteModal(true)}
          disabled={importing}
          title="Paste JSON text"
        >
          Paste JSON
        </button>
      </div>
      <p style={{ fontSize: '0.75rem', color: 'var(--text-3)', marginTop: '6px', textAlign: 'center' }}>
        Upload file or paste JSON array
      </p>

      {/* Paste Modal */}
      {showPasteModal && (
        <div style={{
          position:'fixed', top:0, left:0, right:0, bottom:0,
          background:'rgba(0,0,0,0.5)', display:'flex', justifyContent:'center', alignItems:'center',
          zIndex:1000
        }} onClick={() => setShowPasteModal(false)}>
          <div style={{
            background:'var(--bg-card)', padding:'24px', borderRadius:'12px',
            width:'95%', maxWidth:'500px', border:'1px solid var(--border)'
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{marginBottom:'12px', color:'var(--text-1)', fontSize:'1.1rem'}}>
              Paste JSON Array
            </h3>
            <p style={{color:'var(--text-2)', fontSize:'0.85rem', marginBottom:'12px'}}>
              Paste your {entityType} data as a JSON array
            </p>
            <textarea
              value={jsonText}
              onChange={e => setJsonText(e.target.value)}
              placeholder="[&#10;  { name: 'Item 1', ... },&#10;  { name: 'Item 2', ... }&#10;]"
              style={{
                width:'100%', minHeight:'200px', padding:'12px',
                background:'var(--bg-input)', border:'1px solid var(--border)',
                borderRadius:'8px', color:'var(--text-1)', fontFamily:'monospace',
                fontSize:'0.85rem', marginBottom:'12px'
              }}
            />
            <div style={{display:'flex', gap:'8px', justifyContent:'flex-end'}}>
              <button 
                className="btn btn-ghost"
                onClick={() => setShowPasteModal(false)}
                disabled={importing}
              >
                Cancel
              </button>
              <button 
                className="btn btn-primary"
                onClick={handlePasteSubmit}
                disabled={importing || !jsonText.trim()}
              >
                {importing ? 'Importing...' : 'Import'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
