import React from 'react';
import { NavLink } from 'react-router-dom';

/* Minimal SVG icon set — stroke-based, consistent 16×16 */
const Icon = {
  Dashboard: () => (
    <svg viewBox="0 0 16 16"><rect x="1" y="1" width="6" height="6" rx="1.5"/><rect x="9" y="1" width="6" height="6" rx="1.5"/><rect x="1" y="9" width="6" height="6" rx="1.5"/><rect x="9" y="9" width="6" height="6" rx="1.5"/></svg>
  ),
  Faculty: () => (
    <svg viewBox="0 0 16 16"><circle cx="8" cy="5" r="3"/><path d="M2 13.5c0-3.314 2.686-5 6-5s6 1.686 6 5"/></svg>
  ),
  Subjects: () => (
    <svg viewBox="0 0 16 16"><path d="M3 2h10a1 1 0 011 1v10a1 1 0 01-1 1H3a1 1 0 01-1-1V3a1 1 0 011-1z"/><path d="M5 6h6M5 9h4"/></svg>
  ),
  Rooms: () => (
    <svg viewBox="0 0 16 16"><path d="M1 14V6l7-4 7 4v8H1z"/><path d="M6 14V9h4v5"/></svg>
  ),
  Groups: () => (
    <svg viewBox="0 0 16 16"><circle cx="5" cy="5" r="2.5"/><circle cx="11" cy="5" r="2.5"/><path d="M1 13c0-2.21 1.79-3.5 4-3.5s4 1.29 4 3.5"/><path d="M10 9.7c.32-.12.65-.2 1-.2 2.21 0 4 1.29 4 3.5"/></svg>
  ),
  Config: () => (
    <svg viewBox="0 0 16 16"><circle cx="8" cy="8" r="2"/><path d="M8 1v2M8 13v2M1 8h2M13 8h2M3.22 3.22l1.42 1.42M11.36 11.36l1.42 1.42M3.22 12.78l1.42-1.42M11.36 4.64l1.42-1.42"/></svg>
  ),
  Generate: () => (
    <svg viewBox="0 0 16 16"><path d="M8 1l1.9 5.1H15l-4.5 3.3 1.7 5.1L8 11.5l-4.2 3 1.7-5.1L1 6.1h5.1z"/></svg>
  ),
  Timetable: () => (
    <svg viewBox="0 0 16 16"><rect x="1" y="3" width="14" height="12" rx="1.5"/><path d="M1 7h14M5 3V1M11 3V1"/></svg>
  ),
  Conflicts: () => (
    <svg viewBox="0 0 16 16"><path d="M8 1L1 14h14L8 1z"/><path d="M8 6v4"/><circle cx="8" cy="12" r="0.6" fill="currentColor"/></svg>
  ),
};

const navItems = [
  { section: 'Overview' },
  { to: '/',          icon: 'Dashboard', label: 'Dashboard'      },
  { section: 'Setup' },
  { to: '/faculty',   icon: 'Faculty',   label: 'Faculty'        },
  { to: '/subjects',  icon: 'Subjects',  label: 'Subjects'       },
  { to: '/rooms',     icon: 'Rooms',     label: 'Rooms'          },
  { to: '/groups',    icon: 'Groups',    label: 'Student Groups' },
  { to: '/config',    icon: 'Config',    label: 'Time Config'    },
  { section: 'Scheduling' },
  { to: '/generate',  icon: 'Generate',  label: 'Generate'       },
  { to: '/timetable', icon: 'Timetable', label: 'Timetable'      },
  { to: '/conflicts', icon: 'Conflicts', label: 'Conflicts'      },
];

export default function Sidebar() {
  const institutionName = localStorage.getItem('crt_institution') || 'Timetable Scheduler';
  const username = localStorage.getItem('crt_username') || 'User';

  function handleLogout() {
    localStorage.removeItem('crt_token');
    localStorage.removeItem('crt_institution');
    localStorage.removeItem('crt_username');
    window.location.href = '/login';
  }

  return (
    <aside className="sidebar">
      {/* Logo */}
      <div className="sidebar-logo">
        <div className="logo-icon">T</div>
        <div className="logo-text">
          {institutionName}
          <span>Scheduler</span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, paddingBottom: 8 }}>
        {navItems.map((item, i) => {
          if (item.section) {
            return <div key={i} className="sidebar-section-label">{item.section}</div>;
          }
          const IconComp = Icon[item.icon];
          return (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.to === '/'}
              className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
            >
              <span className="nav-icon">
                {IconComp && <IconComp />}
              </span>
              {item.label}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <div className="sidebar-user">
          <div className="user-avatar">{username.charAt(0).toUpperCase()}</div>
          <div className="user-info">
            <div className="user-name">{username}</div>
            <div className="user-role">Administrator</div>
          </div>
        </div>
        <button className="btn-sign-out" onClick={handleLogout}>
          Sign out
        </button>
      </div>
    </aside>
  );
}
