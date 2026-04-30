export const API_URL = '/api';

async function req(method, path, body) {
  const token = localStorage.getItem('crt_token');
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  
  const data = await res.json();
  if (res.status === 401 || res.status === 403) {
    localStorage.removeItem('crt_token');
    localStorage.removeItem('crt_college');
    window.location.href = '/login';
  }
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data;
}

// ─── Faculty ──────────────────────────────────────────────────
export const getFaculty   = () => req('GET', '/faculty');
export const addFaculty   = (b) => req('POST', '/faculty', b);
export const updateFaculty = (id, b) => req('PUT', `/faculty/${id}`, b);
export const deleteFaculty = (id) => req('DELETE', `/faculty/${id}`);

// ─── Subjects ─────────────────────────────────────────────────
export const getSubjects   = () => req('GET', '/subjects');
export const addSubject    = (b) => req('POST', '/subjects', b);
export const updateSubject = (id, b) => req('PUT', `/subjects/${id}`, b);
export const deleteSubject = (id) => req('DELETE', `/subjects/${id}`);

// ─── Rooms ────────────────────────────────────────────────────
export const getRooms   = () => req('GET', '/rooms');
export const addRoom    = (b) => req('POST', '/rooms', b);
export const updateRoom = (id, b) => req('PUT', `/rooms/${id}`, b);
export const deleteRoom = (id) => req('DELETE', `/rooms/${id}`);

// ─── Groups ───────────────────────────────────────────────────
export const getGroups   = () => req('GET', '/groups');
export const addGroup    = (b) => req('POST', '/groups', b);
export const updateGroup = (id, b) => req('PUT', `/groups/${id}`, b);
export const deleteGroup = (id) => req('DELETE', `/groups/${id}`);

// ─── Config ───────────────────────────────────────────────────
export const getConfig    = () => req('GET', '/config');
export const updateConfig = (b) => req('PUT', '/config', b);

// ─── Timetable ────────────────────────────────────────────────
export const getTimetable  = () => req('GET', '/timetable');
export const generateTimetable = (b) => req('POST', '/timetable/generate', b);

// ─── Stats & Sample ───────────────────────────────────────────
export const getStats    = () => req('GET', '/stats');
export const loadSample  = () => req('POST', '/sample');

// ─── Publish (Email) ──────────────────────────────────────────
export const publishTimetable = (b) => req('POST', '/publish', b);
