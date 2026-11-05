# SBP Tasking System

Task and issue tracking for SBP Consulting Pvt Ltd.

**Branding:** app name and company name live in `client/src/branding.js`. Put the company logo at
`client/public/sbp-logo.png` (also used as the browser-tab icon); until then a plain "SBP" badge is shown.

React (Vite) frontend · Node.js/Express API · MySQL database.

## Features
- User sign-up / login (JWT, bcrypt-hashed passwords)
- Projects with keys (issues numbered `KEY-1`, `KEY-2`, …)
- Kanban board (To Do / In Progress / In Review / Done) with drag-and-drop ordering
- Backlog list with search and filters (status, type, priority, assignee)
- Issue types (Task, Bug, Story, Epic), priorities, assignee, reporter, due date
- Issue detail view with inline editing and comments
- "My issues" view across all projects
- Project settings (rename, lead, delete)

## Roles & permissions
Roles: **Manager** (`admin`, the Project Manager), **Team Lead** (`team_lead`), **Team Member** (`member`).

| Action | Manager | Team Lead — in a project they lead | Assigned employee | Everyone else |
|---|---|---|---|---|
| View projects, issues, employees, teams | ✅ | ✅ | ✅ | ✅ |
| Create / edit settings / delete projects | ✅ | ❌ | ❌ | ❌ |
| Create / delete issues, change assignee | ✅ | ✅ | ❌ | ❌ |
| Edit issue (title, description, status, type, priority, due date, board move) | ✅ | ✅ any issue | ✅ own issue | ❌ read-only |
| Comment | ✅ | ✅ | ✅ | ✅ |
| Create / edit employees, set roles, reset passwords, deactivate | ✅ | ❌ | ❌ | ❌ |
| Create / edit / delete teams, manage members | ✅ | ❌ | ❌ | ❌ |

- A Team Lead gets project-level control by being set as the **Project lead** (Project settings, Manager only). Only Managers and Team Leads can be project leads. Demoting a Team Lead removes these rights immediately.

- Only the **first** account can be self-registered (it becomes a Manager). After that, Managers create employee accounts on the **Employees** page and share the initial password.
- Only Team Leads or Managers can lead a team; each person belongs to at most one team.
- Deactivated employees cannot log in; their issues and comments are kept. At least one active Manager must remain.
- Rules are enforced by the API (`server/src/middleware/auth.js`, `routes/employees.js`, `routes/teams.js`); the UI hides/disables controls to match.

## Employees & teams
- **Employees** (`/employees`): directory with search and filters (team, role, status); Managers add employees (name, email/login, Employee ID — auto `EMP0001` if blank, phone, designation, department, team, joining date, role, initial password).
- **Employee detail** (`/employees/:id`): edit details and role, reset password, deactivate/reactivate.
- **Teams** (`/teams`): team cards with lead and member count; Managers create teams.
- **Team detail** (`/teams/:id`): members list, add/remove members, change name/description/lead, delete team.

## Epics
- Any story, task or bug can belong to one **epic** in the same project (the *Epic* field on the issue or in *Create issue*). Epics cannot be nested.
- An epic shows its **child issues** and a progress bar (done / in progress / to do). Managers and the project's Team Lead can add existing issues or create child issues from the epic.
- **Epics page** (`/projects/:id/epics`) lists all epics with progress; board and backlog show an epic chip on each issue and can be filtered by epic.
- Deleting an epic, or changing its type, keeps the child issues but unlinks them.

## Prerequisites
- Node.js 18+
- MySQL 8 (or 5.7+) running locally

## Setup
1. Edit `server/.env` and set your MySQL credentials (`DB_USER`, `DB_PASSWORD`).
   The database (`ticketing_system`) and tables are created automatically on startup.
2. Install dependencies:
   ```
   npm run install:all
   ```
3. (Optional) Seed demo data — users `admin@example.com`, `alice@example.com`, `bob@example.com` (password `password123`):
   ```
   npm run seed
   ```
4. Start both API and client:
   ```
   npm run dev
   ```
   - Client: http://localhost:5173
   - API: http://localhost:5000/api

## Structure
```
server/
  src/index.js           Express app entry
  src/db.js              MySQL pool + auto schema creation
  src/schema.sql         Tables: users, projects, issues, comments
  src/routes/            auth, users, projects, issues (+ comments)
  src/middleware/auth.js JWT auth
client/
  src/pages/             Login, Register, Projects, Board, Backlog, MyIssues, ProjectSettings
  src/components/        Layout, modals, table, shared UI bits
```

## API overview
| Method | Path | Description |
|---|---|---|
| POST | /api/auth/register, /api/auth/login | Auth |
| GET | /api/auth/me | Current user |
| GET | /api/users | List users |
| GET/POST | /api/projects | List / create projects |
| GET/PATCH/DELETE | /api/projects/:id | Project details |
| GET/POST | /api/projects/:id/issues | List (filters: search, status, type, priority, assignee) / create |
| GET/PATCH/DELETE | /api/issues/:id | Issue details (GET includes comments) |
| PATCH | /api/issues/:id/move | Board move `{ status, position }` |
| GET | /api/issues/mine | Open issues assigned to me |
| POST | /api/issues/:id/comments | Add comment |
| DELETE | /api/comments/:id | Delete own comment |
"# SBP_TaskingSystem" 
