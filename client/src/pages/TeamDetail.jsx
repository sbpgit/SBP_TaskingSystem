import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useUsers } from '../hooks.js';
import { Avatar, EmployeeStatus, Modal, RoleBadge } from '../components/Bits.jsx';
import { TeamFields } from './Teams.jsx';

function AddMembersModal({ teamId, onClose, onAdded }) {
  const [candidates, setCandidates] = useState(null);
  const [selected, setSelected] = useState(new Set());
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    api('/employees?status=active')
      .then((all) => setCandidates(all.filter((e) => e.team_id !== Number(teamId))))
      .catch((e) => setError(e.message));
  }, [teamId]);

  const toggle = (id) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  const submit = async () => {
    try {
      await api(`/teams/${teamId}/members`, { method: 'POST', body: { user_ids: [...selected] } });
      onAdded();
    } catch (e) {
      setError(e.message);
    }
  };

  const shown = (candidates || []).filter(
    (c) => !search || `${c.name} ${c.email} ${c.employee_code}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <Modal title="Add members" onClose={onClose}>
      {error && <div className="alert">{error}</div>}
      <input className="search full" placeholder="Search employees" value={search} onChange={(e) => setSearch(e.target.value)} autoFocus />
      <div className="pick-list">
        {!candidates ? (
          <p className="muted">Loading…</p>
        ) : shown.length === 0 ? (
          <p className="muted">No other active employees.</p>
        ) : (
          shown.map((c) => (
            <label key={c.id} className="pick-item">
              <input type="checkbox" checked={selected.has(c.id)} onChange={() => toggle(c.id)} />
              <Avatar name={c.name} size={28} />
              <span className="grow">
                <div>{c.name}</div>
                <div className="muted small">
                  {c.designation || c.email}
                  {c.team_name && ` · currently in ${c.team_name}`}
                </div>
              </span>
              <RoleBadge role={c.role} />
            </label>
          ))
        )}
      </div>
      <p className="muted small">Employees already in another team will be moved to this team.</p>
      <div className="form-actions">
        <button className="btn btn-subtle" onClick={onClose}>
          Cancel
        </button>
        <button className="btn btn-primary" disabled={!selected.size} onClick={submit}>
          Add {selected.size || ''} member{selected.size === 1 ? '' : 's'}
        </button>
      </div>
    </Modal>
  );
}

export default function TeamDetail() {
  const { teamId } = useParams();
  const { isAdmin } = useAuth();
  const users = useUsers();
  const navigate = useNavigate();
  const [team, setTeam] = useState(null);
  const [form, setForm] = useState(null);
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');
  const [adding, setAdding] = useState(false);

  const load = useCallback(() => {
    api(`/teams/${teamId}`)
      .then((t) => {
        setTeam(t);
        setForm({ name: t.name, description: t.description || '', lead_id: t.lead_id || '' });
      })
      .catch((e) => setError(e.message));
  }, [teamId]);
  useEffect(load, [load]);

  const save = async (e) => {
    e.preventDefault();
    setError('');
    setMsg('');
    try {
      await api(`/teams/${teamId}`, {
        method: 'PATCH',
        body: { ...form, lead_id: form.lead_id ? Number(form.lead_id) : null },
      });
      setMsg('Team saved.');
      load();
    } catch (err) {
      setError(err.message);
    }
  };

  const removeMember = async (m) => {
    if (!window.confirm(`Remove ${m.name} from ${team.name}?`)) return;
    try {
      await api(`/teams/${teamId}/members/${m.id}`, { method: 'DELETE' });
      load();
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteTeam = async () => {
    if (!window.confirm(`Delete team ${team.name}? Members will be left without a team.`)) return;
    try {
      await api(`/teams/${teamId}`, { method: 'DELETE' });
      navigate('/teams');
    } catch (e) {
      setError(e.message);
    }
  };

  if (error && !team) return <div className="page"><div className="alert">{error}</div></div>;
  if (!team) return <div className="page muted">Loading…</div>;

  return (
    <div className="page">
      <div className="breadcrumbs muted small">
        <Link to="/teams">Teams</Link> / {team.name}
      </div>
      <div className="page-header">
        <h1>{team.name}</h1>
      </div>
      {error && <div className="alert">{error}</div>}
      {msg && <div className="alert alert-ok">{msg}</div>}

      <div className="two-col">
        <div className="panel grow">
          <div className="panel-head">
            <div className="details-title flat">Members ({team.members.length})</div>
            {isAdmin && (
              <button className="btn btn-primary" onClick={() => setAdding(true)}>
                Add members
              </button>
            )}
          </div>
          {team.members.length === 0 ? (
            <p className="muted">No members yet.</p>
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Designation</th>
                  <th>Role</th>
                  <th>Status</th>
                  <th>Open issues</th>
                  {isAdmin && <th />}
                </tr>
              </thead>
              <tbody>
                {team.members.map((m) => (
                  <tr key={m.id} className={m.status === 'inactive' ? 'row-inactive' : ''}>
                    <td>
                      <Link to={`/employees/${m.id}`} className="inline-user">
                        <Avatar name={m.name} size={26} /> {m.name}
                      </Link>
                      {m.id === team.lead_id && <span className="lead-tag">Lead</span>}
                    </td>
                    <td>{m.designation || <span className="muted">—</span>}</td>
                    <td>
                      <RoleBadge role={m.role} />
                    </td>
                    <td>
                      <EmployeeStatus status={m.status} />
                    </td>
                    <td>{m.open_issues}</td>
                    {isAdmin && (
                      <td>
                        <button className="link-btn small danger-text" onClick={() => removeMember(m)}>
                          Remove
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="side-col">
          <form className="panel form" onSubmit={save}>
            <div className="details-title">Team details</div>
            <fieldset disabled={!isAdmin} className="plain-fieldset form">
              <TeamFields form={form} setForm={setForm} users={users} />
            </fieldset>
            {isAdmin && <button className="btn btn-primary">Save team</button>}
          </form>
          {isAdmin && (
            <div className="panel">
              <div className="details-title">Delete team</div>
              <p className="muted small">Employees stay in the system without a team.</p>
              <button className="btn btn-danger" onClick={deleteTeam}>
                Delete team
              </button>
            </div>
          )}
        </div>
      </div>

      {adding && (
        <AddMembersModal
          teamId={teamId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            load();
          }}
        />
      )}
    </div>
  );
}
