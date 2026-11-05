import { NavLink, Outlet, useMatch } from 'react-router-dom';
import { useAuth } from '../AuthContext.jsx';
import { useProject } from '../hooks.js';
import { Avatar, RoleBadge } from './Bits.jsx';
import Brand from './Brand.jsx';

function ProjectSidebar({ projectId }) {
  const { project } = useProject(projectId);
  return (
    <aside className="sidebar">
      <div className="sidebar-project">
        <div className="project-badge">{project?.key?.slice(0, 2) || '…'}</div>
        <div>
          <div className="sidebar-project-name">{project?.name || 'Loading…'}</div>
          <div className="muted small">Software project</div>
        </div>
      </div>
      <nav className="sidebar-nav">
        <NavLink to={`/projects/${projectId}/board`}>▦ Board</NavLink>
        <NavLink to={`/projects/${projectId}/backlog`}>☰ Backlog</NavLink>
        <NavLink to={`/projects/${projectId}/epics`}>⚡ Epics</NavLink>
        <NavLink to={`/projects/${projectId}/settings`}>⚙ Project settings</NavLink>
      </nav>
    </aside>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const match = useMatch('/projects/:projectId/*');
  const projectId = match?.params.projectId;

  return (
    <div className="app">
      <header className="topbar">
        <NavLink to="/" className="logo">
          <Brand />
        </NavLink>
        <nav className="topnav">
          <NavLink to="/" end>
            Projects
          </NavLink>
          <NavLink to="/my-issues">My issues</NavLink>
          <NavLink to="/employees">Employees</NavLink>
          <NavLink to="/teams">Teams</NavLink>
        </nav>
        <div className="topbar-right">
          <Avatar name={user.name} size={28} />
          <span className="user-name">{user.name}</span>
          <RoleBadge role={user.role} />
          <button className="btn btn-subtle" onClick={logout}>
            Log out
          </button>
        </div>
      </header>
      <div className="app-body">
        {projectId && <ProjectSidebar projectId={projectId} key={projectId} />}
        <main className="content">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
