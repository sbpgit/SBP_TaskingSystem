import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useUsers } from '../hooks.js';
import { Avatar, Modal } from '../components/Bits.jsx';

export function TeamFields({ form, setForm, users, autoFocus }) {
  const leads = users.filter((u) => u.role === 'admin' || u.role === 'team_lead');
  return (
    <>
      <label>
        Team name *
        <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} required autoFocus={autoFocus} />
      </label>
      <label>
        Description
        <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <label>
        Team lead
        <select value={form.lead_id} onChange={(e) => setForm({ ...form, lead_id: e.target.value })}>
          <option value="">No lead</option>
          {leads.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name} {u.role === 'admin' ? '(Manager)' : ''}
            </option>
          ))}
        </select>
        <span className="muted small hint">
          Only employees with the Team Lead or Manager role can lead a team. The lead is moved into this team.
        </span>
      </label>
    </>
  );
}

function CreateTeamModal({ users, onClose, onCreated }) {
  const [form, setForm] = useState({ name: '', description: '', lead_id: '' });
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      onCreated(
        await api('/teams', { method: 'POST', body: { ...form, lead_id: form.lead_id ? Number(form.lead_id) : null } })
      );
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Create team" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <TeamFields form={form} setForm={setForm} users={users} autoFocus />
        <div className="form-actions">
          <button type="button" className="btn btn-subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Create team</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Teams() {
  const { isAdmin } = useAuth();
  const users = useUsers();
  const navigate = useNavigate();
  const [teams, setTeams] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    api('/teams').then(setTeams).catch((e) => setError(e.message));
  }, []);

  return (
    <div className="page">
      <div className="page-header">
        <h1>Teams</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create team
          </button>
        )}
      </div>
      {error && <div className="alert">{error}</div>}
      {!teams ? (
        <p className="muted">Loading…</p>
      ) : teams.length === 0 ? (
        <div className="empty">
          <p>No teams yet.</p>
          {isAdmin && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Create your first team
            </button>
          )}
        </div>
      ) : (
        <div className="team-grid">
          {teams.map((t) => (
            <Link key={t.id} to={`/teams/${t.id}`} className="team-card">
              <div className="team-card-head">
                <span className="project-badge">{t.name.slice(0, 2).toUpperCase()}</span>
                <div>
                  <div className="team-name">{t.name}</div>
                  <div className="muted small">
                    {t.member_count} member{t.member_count === 1 ? '' : 's'}
                  </div>
                </div>
              </div>
              {t.description && <p className="team-desc muted">{t.description}</p>}
              <div className="team-lead">
                <span className="muted small">Lead</span>
                <span className="inline-user">
                  <Avatar name={t.lead_name} size={22} /> {t.lead_name || <span className="muted">Not assigned</span>}
                </span>
              </div>
            </Link>
          ))}
        </div>
      )}
      {creating && (
        <CreateTeamModal users={users} onClose={() => setCreating(false)} onCreated={(t) => navigate(`/teams/${t.id}`)} />
      )}
    </div>
  );
}
