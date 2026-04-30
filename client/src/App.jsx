import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AppProvider } from './context/AppContext';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Faculty from './components/Faculty';
import Subjects from './components/Subjects';
import Rooms from './components/Rooms';
import Groups from './components/Groups';
import Config from './components/Config';
import Generate from './components/Generate';
import Timetable from './components/Timetable';
import Conflicts from './components/Conflicts';
import Auth from './components/Auth';
import ThemeToggle from './components/ThemeToggle';

function Layout({ children, title, subtitle }) {
  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <Sidebar />
      <div className="main-content">
        {/* Topbar */}
        <header className="topbar">
          <div style={{ flex: 1, minWidth: 0 }}>
            <div className="topbar-title">{title}</div>
            {subtitle && <div className="topbar-subtitle">{subtitle}</div>}
          </div>
          <div className="topbar-actions">
            <a href="/generate" className="btn btn-primary btn-sm">
              Generate
            </a>
            <ThemeToggle />
          </div>
        </header>

        {/* Page */}
        <div className="page-content">{children}</div>
      </div>
    </div>
  );
}

const pages = [
  { path: '/',          title: 'Dashboard',          subtitle: 'Overview & quick actions',                     component: Dashboard  },
  { path: '/faculty',   title: 'Faculty',             subtitle: 'Manage teaching staff and availability',       component: Faculty    },
  { path: '/subjects',  title: 'Subjects',            subtitle: 'Configure courses and lab sessions',          component: Subjects   },
  { path: '/rooms',     title: 'Rooms',               subtitle: 'Manage classrooms and lab spaces',            component: Rooms      },
  { path: '/groups',    title: 'Student Groups',      subtitle: 'Define student classes and assign curriculum', component: Groups     },
  { path: '/config',    title: 'Time Configuration',  subtitle: 'Set working days and period timings',         component: Config     },
  { path: '/generate',  title: 'Generate',            subtitle: 'Run the scheduling algorithm',                component: Generate   },
  { path: '/timetable', title: 'Timetable',           subtitle: 'View and explore the generated schedule',     component: Timetable  },
  { path: '/conflicts', title: 'Conflicts',           subtitle: 'Review and resolve scheduling conflicts',     component: Conflicts  },
];

export default function App() {
  const isAuth = !!localStorage.getItem('crt_token');

  return (
    <AppProvider>
      <Routes>
        <Route path="/login" element={isAuth ? <Navigate to="/" /> : <Auth />} />
        {pages.map(({ path, title, subtitle, component: Component }) => (
          <Route
            key={path}
            path={path}
            element={
              isAuth ? (
                <Layout title={title} subtitle={subtitle}>
                  <Component />
                </Layout>
              ) : (
                <Navigate to="/login" />
              )
            }
          />
        ))}
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>
    </AppProvider>
  );
}
