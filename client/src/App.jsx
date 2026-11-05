import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';
import Layout from './components/Layout.jsx';
import Login from './pages/Login.jsx';
import Register from './pages/Register.jsx';
import Projects from './pages/Projects.jsx';
import Board from './pages/Board.jsx';
import Backlog from './pages/Backlog.jsx';
import Epics from './pages/Epics.jsx';
import MyIssues from './pages/MyIssues.jsx';
import ProjectSettings from './pages/ProjectSettings.jsx';
import Employees from './pages/Employees.jsx';
import EmployeeDetail from './pages/EmployeeDetail.jsx';
import Teams from './pages/Teams.jsx';
import TeamDetail from './pages/TeamDetail.jsx';

function Protected({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="center-screen">Loading…</div>;
  if (!user) return <Navigate to="/login" replace />;
  return children;
}

export default function App() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={user ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/register" element={user ? <Navigate to="/" replace /> : <Register />} />
      <Route
        element={
          <Protected>
            <Layout />
          </Protected>
        }
      >
        <Route path="/" element={<Projects />} />
        <Route path="/my-issues" element={<MyIssues />} />
        <Route path="/employees" element={<Employees />} />
        <Route path="/employees/:employeeId" element={<EmployeeDetail />} />
        <Route path="/teams" element={<Teams />} />
        <Route path="/teams/:teamId" element={<TeamDetail />} />
        <Route path="/team" element={<Navigate to="/employees" replace />} />
        <Route path="/projects/:projectId/board" element={<Board />} />
        <Route path="/projects/:projectId/backlog" element={<Backlog />} />
        <Route path="/projects/:projectId/epics" element={<Epics />} />
        <Route path="/projects/:projectId/settings" element={<ProjectSettings />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
