# React .jsx Files — Overview and Inner Functions

This document summarizes each `.jsx` file in the client app and explains the exported components and their main inner functions/behaviors.

---

**client/src/main.jsx**
- Purpose: App entry; mounts React router and root `App` component.
- Exports: default mount script (no component).
- Key behavior: calls `ReactDOM.createRoot(...).render()` with `<BrowserRouter><App/></BrowserRouter>`.

**client/src/App.jsx**
- Purpose: App routes and top-level layout.
- Exports: `App()` default component and `Layout()` helper component.
- `Layout({children, title, subtitle})`: renders the sidebar, topbar (title/subtitle), and the main content area; includes `ThemeToggle` and a Generate link.
- `App()`: sets `isAuth` from `localStorage`, wraps app in `AppProvider`, defines `pages` routes, and conditionally renders `Layout` or redirects to `/login`.

**client/src/context/AppContext.jsx**
- Purpose: Global app context (toasts, theme, timetable, institution/username helpers).
- Exports: `AppProvider` and `useApp()` hook.
- `AppProvider({children})`: maintains state: `toasts`, `timetable`, `theme`, `institutionName`, `username`. Persists theme/institution/username to `localStorage`. Provides `toast(msg,type)` to enqueue ephemeral notifications (auto-remove after ~3.2s). Also exposes `setTimetable`, `setTheme`, `updateInstitution`, `updateUsername`.
- `useApp()`: convenience hook to access context.

**client/src/components/Timetable.jsx**
- Purpose: View and export the generated timetable grid; large component with many helpers.
- Exports: default `Timetable()` component.
- Local components / inner functions:
  - `PublishModal({onClose, timetableData})`: modal UI for entering recipient email and publishing timetable via API; `handleOverlayClick`, `send()` perform overlay dismiss and API call respectively.
  - `ExportMenu({onCSV, onPDF, onPublish})`: dropdown for CSV/PDF/print/publish actions; manages open/close via `useEffect` and outside-click listener.
  - `exportCSV()`: builds CSV rows from timetable sessions and triggers file download via blob URL.
  - `exportPDF()`: captures the timetable grid using `html2canvas`, composes a PDF with `jspdf` (adds cover, footer, and a second page with faculty-subject table), and saves the PDF.
  - `SessionCard({sess})`: renders a single session tile (subject, faculty, room, lab badge, conflict styling) using `subjects`, `faculty`, `rooms`, `groups` lookups and color mapping.
  - `buildDayRow(di)`: (part of grid construction) computes spanning cells, handles multi-period labs and break periods.
  - Component-level effects: loads timetable, subjects, faculty, rooms, groups, config; manages view (group/faculty/room), selection, filtering, and derived maps like `grid` and `facultySubjectMap`.

**client/src/components/ThemeToggle.jsx**
- Purpose: Small UI to toggle app theme via context.
- Exports: `ThemeToggle()`.
- `toggleTheme()`: flips theme between `'dark'` and `'light'` using `setTheme` from `useApp()`.

**client/src/components/Subjects.jsx**
- Purpose: CRUD UI for Subjects; import/export helper usage.
- Exports: `Subjects()`.
- Inner functions:
  - `load()`: fetches subjects via `getSubjects()` and updates `list`.
  - `openAdd()`, `openEdit(s)`: prepare modal form state for add/edit.
  - `save()`: validates form, calls `addSubject` or `updateSubject`, shows toasts and reloads list.
  - `remove(id,name)`: confirm + delete via API.
  - `toggleSelect(id)`, `toggleSelectAll()`, `deleteSelected()`: multi-select batch delete helpers.
  - `filtered`: computed list based on `search`.

**client/src/components/Sidebar.jsx**
- Purpose: Application navigation and layout sidebar.
- Exports: `Sidebar()`.
- Inner pieces:
  - `Icon` collection: small inline SVG icon components used in navigation.
  - `navItems`: navigation config array.
  - `handleLogout()`: clears localStorage (token, institution, username) and redirects to `/login`.

**client/src/components/Rooms.jsx**
- Purpose: CRUD UI for Rooms (classrooms/labs) similar to Subjects.
- Exports: `Rooms()` with inner helpers: `load`, `openAdd`, `openEdit`, `save`, `remove`, `toggleSelect`, `toggleSelectAll`, `deleteSelected`, and `filtered`.

**client/src/components/Modal.jsx**
- Purpose: Generic modal wrapper used across the app.
- Exports: `Modal({open,onClose,title,children,footer})`.
- Behavior: attaches Escape key listener to close modal when open; click on overlay closes modal; returns `null` when not `open`.

**client/src/components/JsonImporter.jsx**
- Purpose: Reusable JSON import UI used by many CRUD pages.
- Exports: `JsonImporter({entityType,onImport,importEndpoint})`.
- Inner functions:
  - `processJson(data)`: validates array, POSTs to server `/api/${importEndpoint}` with auth token if available; shows toast and calls `onImport()` on success.
  - `handleFileSelect(e)`: reads selected file, parses JSON, calls `processJson`.
  - `handlePasteSubmit()`: parses pasted JSON text and calls `processJson`.
  - Local state: file input ref, `importing`, paste modal state and `jsonText`.

**client/src/components/Groups.jsx**
- Purpose: Manage student groups and their curriculum assignments.
- Exports: `Groups()`.
- Inner functions:
  - `openAdd()`, `openEdit(g)`: initialize `form` and `curriculum` state for add/edit flows.
  - `save()`: validate and create/update group; builds `curr` from enabled curriculum entries.
  - `remove(id,name)`: confirm + delete group.
  - `toggleSelect`, `toggleSelectAll`, `deleteSelected`: multi-select helpers.
  - `updateCurr(subjectId, field, value)`: helper to update curriculum entries.

**client/src/components/Generate.jsx**
- Purpose: Start the scheduling (genetic algorithm) process and display progress/logs.
- Exports: `Generate()`.
- Inner functions:
  - `addLog(msg, type)`: append timestamped log to `logs` state.
  - `start()`: orchestrates generation — shows progress ticker (simulated increments), calls `generateTimetable` API with params, handles success (set timetable via context + show toast) and errors.

**client/src/components/Faculty.jsx**
- Purpose: CRUD UI for faculty members.
- Exports: `Faculty()`.
- Inner functions: `load`, `openAdd`, `openEdit`, `save`, `remove`, `toggleSelect`, `toggleSelectAll`, `deleteSelected`, and `filtered` (search filter). Similar structure to `Subjects`/`Rooms`.

**client/src/components/Dashboard.jsx**
- Purpose: Landing page showing app stats, quick actions, and setup workflow.
- Exports: `Dashboard()`.
- Inner functions:
  - `refresh()`: fetches stats via `getStats()`.
  - `handleSample()`: prompts user and calls `loadSample()` to replace data with sample dataset.
  - `done` / `firstPending` derived helpers for showing workflow steps.

**client/src/components/Conflicts.jsx**
- Purpose: Display scheduling conflicts reported by the generated timetable.
- Exports: `Conflicts()`.
- Behavior: loads timetable and supporting data; lists `tt.violations` with type labels and friendly messages; provides quick Re-generate button.

**client/src/components/Config.jsx**
- Purpose: App configuration page (working days, periods per day, period time slots, institution name).
- Exports: `Config()`.
- Inner functions:
  - `save(updated)`: merges updated config locally and sends `updateConfig` to server.
  - `toggleDay(day, checked)`: toggles inclusion of a day in `cfg.days` and persists ordered days.
  - `updatePeriodTime(i, val)`: updates `cfg.periodTimes[i]` and saves.

**client/src/components/Auth.jsx**
- Purpose: Login / registration UI.
- Exports: `Auth()`.
- Inner functions:
  - `handleSubmit(e)`: prevents default, validates fields, performs POST to `API_URL + '/auth/login'` or `'/auth/register'`, stores token/username/institution in `localStorage`, updates context and redirects to `/` on success.

---

Notes:
- This document focuses on exported components and named inner functions/behaviors. For more detailed line-by-line comments, open the corresponding files in `client/src/components/`.
