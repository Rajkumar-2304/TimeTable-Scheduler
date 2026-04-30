import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';

const AppContext = createContext(null);

export function AppProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [timetable, setTimetable] = useState(null);
  const [theme, setThemeState] = useState(() => {
    return localStorage.getItem('theme') || 'dark';
  });
  const [institutionName, setInstitutionName] = useState(() => {
    return localStorage.getItem('crt_institution') || '';
  });
  const [username, setUsername] = useState(() => {
    return localStorage.getItem('crt_username') || '';
  });

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('theme', theme);
  }, [theme]);

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
  };

  const updateInstitution = (name) => {
    setInstitutionName(name);
    localStorage.setItem('crt_institution', name);
  };

  const updateUsername = (name) => {
    setUsername(name);
    localStorage.setItem('crt_username', name);
  };

  const toast = useCallback((msg, type = 'info') => {
    const id = Date.now();
    setToasts(t => [...t, { id, msg, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), 3200);
  }, []);

  return (
    <AppContext.Provider value={{ toast, timetable, setTimetable, theme, setTheme, institutionName, updateInstitution, username, updateUsername }}>
      {children}
      {/* Toast Container */}
      <div id="toast-container">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.type}`}>
            <span>{t.type === 'success' ? '✅' : t.type === 'error' ? '❌' : 'ℹ️'}</span>
            {t.msg}
          </div>
        ))}
      </div>
    </AppContext.Provider>
  );
}

export const useApp = () => useContext(AppContext);
