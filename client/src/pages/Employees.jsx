import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { ROLES } from '../constants.js';
import { Avatar, EmployeeStatus, Modal, RoleBadge } from '../components/Bits.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';

const EMPTY = { search: '', team_id: '', role: '', status: 'active' };

export default function Employees() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [filters, setFilters] = useState(EMPTY);
  const [employees, setEmployees] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api('/teams').then(setTeams).catch(() => setTeams([]));
  }, []);

  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api(`/employees${qs ? `?${qs}` : ''}`)
      .then((data) => {
        setEmployees(data);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });
  const counts = ROLES.map((r) => ({ ...r, n: (employees || []).filter((e) => e.role === r.value).length }));

  return (
    <div className="page">
      <div className="page-header">
        <h1>Employees</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Add employee
          </button>
        )}
      </div>

      {employees && (
        <div className="stat-row">
          <div className="stat">
            <div className="stat-value">{employees.length}</div>
            <div className="muted small">Shown</div>
          </div>
          {counts.map((c) => (
            <div className="stat" key={c.value}>
              <div className="stat-value">{c.n}</div>
              <div className="muted small">{c.label}s</div>
            </div>
          ))}
        </div>
      )}

      <div className="toolbar">
        <input className="search" placeholder="Search name, email, ID…" value={filters.search} onChange={set('search')} />
        <select value={filters.team_id} onChange={set('team_id')}>
          <option value="">All teams</option>
          <option value="none">No team</option>
          {teams.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
        <select value={filters.role} onChange={set('role')}>
          <option value="">All roles</option>
          {ROLES.map((r) => (
            <option key={r.value} value={r.value}>
              {r.label}
            </option>
          ))}
        </select>
        <select value={filters.status} onChange={set('status')}>
          <option value="">Any status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        {JSON.stringify(filters) !== JSON.stringify(EMPTY) && (
          <button className="link-btn" onClick={() => setFilters(EMPTY)}>
            Reset filters
          </button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}
      {!employees ? (
        <p className="muted">Loading…</p>
      ) : employees.length === 0 ? (
        <div className="empty">No employees match.</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>ID</th>
              <th>Name</th>
              <th>Designation</th>
              <th>Department</th>
              <th>Team</th>
              <th>Role</th>
              <th>Status</th>
              <th>Open issues</th>
            </tr>
          </thead>
          <tbody>
            {employees.map((e) => (
              <tr key={e.id} className={`clickable ${e.status === 'inactive' ? 'row-inactive' : ''}`} onClick={() => navigate(`/employees/${e.id}`)}>
                <td className="muted">{e.employee_code || '—'}</td>
                <td>
                  <span className="inline-user">
                    <Avatar name={e.name} size={28} />
                    <span>
                      <div>{e.name}</div>
                      <div className="muted small">{e.email}</div>
                    </span>
                  </span>
                </td>
                <td>{e.designation || <span className="muted">—</span>}</td>
                <td>{e.department || <span className="muted">—</span>}</td>
                <td>
                  {e.team_name || <span className="muted">—</span>}
                  {e.leads_teams && <div className="muted small">Leads {e.leads_teams}</div>}
                </td>
                <td>
                  <RoleBadge role={e.role} />
                </td>
                <td>
                  <EmployeeStatus status={e.status} />
                </td>
                <td>{e.open_issues}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {creating && (
        <Modal title="Add employee" onClose={() => setCreating(false)} wide>
          <EmployeeForm
            isCreate
            teams={teams}
            submitLabel="Create employee"
            onCancel={() => setCreating(false)}
            onSubmit={async (payload) => {
              const emp = await api('/employees', { method: 'POST', body: payload });
              setCreating(false);
              navigate(`/employees/${emp.id}`);
            }}
          />
        </Modal>
      )}
    </div>
  );
}
