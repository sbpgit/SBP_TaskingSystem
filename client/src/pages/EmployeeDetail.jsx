import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { formatDate } from '../hooks.js';
import { Avatar, EmployeeStatus, RoleBadge } from '../components/Bits.jsx';
import EmployeeForm from '../components/EmployeeForm.jsx';

export default function EmployeeDetail() {
  const { employeeId } = useParams();
  const { user, isAdmin } = useAuth();
  const [emp, setEmp] = useState(null);
  const [teams, setTeams] = useState([]);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [formKey, setFormKey] = useState(0);
  const [newPassword, setNewPassword] = useState('');

  useEffect(() => {
    api(`/employees/${employeeId}`).then(setEmp).catch((e) => setError(e.message));
    api('/teams').then(setTeams).catch(() => setTeams([]));
  }, [employeeId]);

  const save = async (payload) => {
    setMsg('');
    const updated = await api(`/employees/${employeeId}`, { method: 'PATCH', body: payload });
    setEmp(updated);
    setFormKey((k) => k + 1);
    setMsg('Employee saved.');
    if (updated.id === user.id) window.location.reload(); // own role/details changed
  };

  const toggleStatus = async () => {
    const next = emp.status === 'active' ? 'inactive' : 'active';
    if (next === 'inactive' && !window.confirm(`Deactivate ${emp.name}? They will no longer be able to log in.`)) return;
    setError('');
    try {
      await save({ status: next });
      setMsg(next === 'active' ? 'Employee reactivated.' : 'Employee deactivated.');
    } catch (e) {
      setError(e.message);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api(`/employees/${employeeId}/password`, { method: 'POST', body: { password: newPassword } });
      setNewPassword('');
      setMsg('Password updated. Share the new password with the employee.');
    } catch (err) {
      setError(err.message);
    }
  };

  if (error && !emp) return <div className="page"><div className="alert">{error}</div></div>;
  if (!emp) return <div className="page muted">Loading…</div>;

  return (
    <div className="page">
      <div className="breadcrumbs muted small">
        <Link to="/employees">Employees</Link> / {emp.name}
      </div>
      <div className="profile-header">
        <Avatar name={emp.name} size={56} />
        <div>
          <h1>{emp.name}</h1>
          <div className="profile-meta">
            <span className="muted">{emp.employee_code}</span>
            {emp.designation && <span>{emp.designation}</span>}
            <RoleBadge role={emp.role} />
            <EmployeeStatus status={emp.status} />
          </div>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="two-col">
        <div className="panel grow">
          {!isAdmin && <p className="muted small">Only Managers can edit employee records.</p>}
          <EmployeeForm key={formKey} initial={emp} teams={teams} readOnly={!isAdmin} onSubmit={save} submitLabel="Save changes" />
        </div>

        <div className="side-col">
          <div className="panel">
            <div className="details-title">Summary</div>
            <dl className="facts">
              <dt>Team</dt>
              <dd>{emp.team_id ? <Link to={`/teams/${emp.team_id}`}>{emp.team_name}</Link> : '—'}</dd>
              {emp.leads_teams && (
                <>
                  <dt>Leads</dt>
                  <dd>{emp.leads_teams}</dd>
                </>
              )}
              <dt>Open issues</dt>
              <dd>{emp.open_issues}</dd>
              <dt>Joined</dt>
              <dd>{formatDate(emp.joined_on) || '—'}</dd>
              <dt>Account created</dt>
              <dd>{formatDate(emp.created_at)}</dd>
            </dl>
          </div>

          {isAdmin && (
            <>
              <form className="panel form" onSubmit={resetPassword}>
                <div className="details-title">Reset password</div>
                <input
                  type="text"
                  placeholder="New password (min 6 chars)"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  required
                />
                <button className="btn">Set password</button>
              </form>

              {emp.id !== user.id && (
                <div className="panel">
                  <div className="details-title">{emp.status === 'active' ? 'Deactivate' : 'Reactivate'}</div>
                  <p className="muted small">
                    {emp.status === 'active'
                      ? 'Blocks login. Their issues and comments are kept.'
                      : 'Allows this employee to log in again.'}
                  </p>
                  <button className={emp.status === 'active' ? 'btn btn-danger' : 'btn btn-primary'} onClick={toggleStatus}>
                    {emp.status === 'active' ? 'Deactivate employee' : 'Reactivate employee'}
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
