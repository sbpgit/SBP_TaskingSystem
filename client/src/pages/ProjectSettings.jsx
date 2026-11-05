import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { useProject, useUsers } from '../hooks.js';

export default function ProjectSettings() {
  const { projectId } = useParams();
  const { isAdmin } = useAuth();
  const { project, setProject } = useProject(projectId);
  const users = useUsers();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', description: '', lead_id: '' });
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (project) setForm({ name: project.name, description: project.description || '', lead_id: project.lead_id || '' });
  }, [project]);

  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const save = async (e) => {
    e.preventDefault();
    setMsg('');
    setError('');
    try {
      const p = await api(`/projects/${projectId}`, {
        method: 'PATCH',
        body: { ...form, lead_id: form.lead_id ? Number(form.lead_id) : null },
      });
      setProject(p);
      setMsg('Saved.');
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async () => {
    if (!window.confirm(`Delete project ${project.key} and all its issues? This cannot be undone.`)) return;
    try {
      await api(`/projects/${projectId}`, { method: 'DELETE' });
      navigate('/');
    } catch (err) {
      setError(err.message);
    }
  };

  if (!project) return <div className="page muted">Loading…</div>;

  return (
    <div className="page narrow">
      <div className="breadcrumbs muted small">Projects / {project.name}</div>
      <h1>Project settings</h1>
      {!isAdmin && <p className="muted">Only Managers can change project settings.</p>}
      <form className="form" onSubmit={save}>
        <fieldset disabled={!isAdmin} className="plain-fieldset form">
        {error && <div className="alert">{error}</div>}
        {msg && <div className="alert alert-ok">{msg}</div>}
        <label>
          Name
          <input value={form.name} onChange={set('name')} required />
        </label>
        <label>
          Key
          <input value={project.key} disabled />
        </label>
        <label>
          Description
          <textarea rows={4} value={form.description} onChange={set('description')} />
        </label>
        <label>
          Project lead
          <select value={form.lead_id} onChange={set('lead_id')}>
            <option value="">No lead</option>
            {users
              .filter((u) => u.role === 'admin' || u.role === 'team_lead' || u.id === project.lead_id)
              .map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role === 'admin' ? 'Manager' : u.role === 'team_lead' ? 'Team Lead' : 'Team Member'})
                </option>
              ))}
          </select>
          <span className="muted small hint">
            A Team Lead set as project lead can create, edit, assign and delete all issues in this project.
          </span>
        </label>
        {isAdmin && (
          <div className="form-actions left">
            <button className="btn btn-primary">Save changes</button>
          </div>
        )}
        </fieldset>
      </form>

      {isAdmin && (
        <div className="danger-zone">
          <h3>Delete project</h3>
          <p className="muted small">Permanently removes the project, its issues and comments.</p>
          <button className="btn btn-danger" onClick={remove}>
            Delete project
          </button>
        </div>
      )}
    </div>
  );
}
