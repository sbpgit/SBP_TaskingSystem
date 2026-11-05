import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { Avatar, Modal } from '../components/Bits.jsx';

function suggestKey(name) {
  const words = name.toUpperCase().replace(/[^A-Z0-9 ]/g, '').split(/\s+/).filter(Boolean);
  if (!words.length) return '';
  const key = words.length > 1 ? words.map((w) => w[0]).join('') : words[0].slice(0, 4);
  return /^[A-Z]/.test(key) ? key.slice(0, 10) : '';
}

function CreateProjectModal({ onClose, onCreated }) {
  const [name, setName] = useState('');
  const [key, setKey] = useState('');
  const [keyTouched, setKeyTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      onCreated(await api('/projects', { method: 'POST', body: { name, key, description } }));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Create project" onClose={onClose}>
      <form className="form" onSubmit={submit}>
        {error && <div className="alert">{error}</div>}
        <label>
          Name *
          <input
            autoFocus
            required
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (!keyTouched) setKey(suggestKey(e.target.value));
            }}
          />
        </label>
        <label>
          Key *<span className="muted small"> (prefix for issue keys, e.g. KEY-12)</span>
          <input
            required
            value={key}
            maxLength={10}
            onChange={(e) => {
              setKeyTouched(true);
              setKey(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''));
            }}
          />
        </label>
        <label>
          Description
          <textarea rows={3} value={description} onChange={(e) => setDescription(e.target.value)} />
        </label>
        <div className="form-actions">
          <button type="button" className="btn btn-subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary">Create</button>
        </div>
      </form>
    </Modal>
  );
}

export default function Projects() {
  const { isAdmin } = useAuth();
  const [projects, setProjects] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [search, setSearch] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    api('/projects').then(setProjects).catch((e) => setError(e.message));
  }, []);

  const filtered = (projects || []).filter(
    (p) => !search || `${p.name} ${p.key}`.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="page">
      <div className="page-header">
        <h1>Projects</h1>
        {isAdmin && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create project
          </button>
        )}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search projects" value={search} onChange={(e) => setSearch(e.target.value)} />
      </div>
      {error && <div className="alert">{error}</div>}
      {!projects ? (
        <p className="muted">Loading…</p>
      ) : filtered.length === 0 ? (
        <div className="empty">
          <p>No projects yet.</p>
          {isAdmin ? (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Create your first project
            </button>
          ) : (
            <p className="small">A Project Manager needs to create a project first.</p>
          )}
        </div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Key</th>
              <th>Lead</th>
              <th>Open issues</th>
              <th>Total issues</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id} className="clickable" onClick={() => navigate(`/projects/${p.id}/board`)}>
                <td>
                  <span className="inline-user">
                    <span className="project-badge sm">{p.key.slice(0, 2)}</span>
                    <Link to={`/projects/${p.id}/board`} onClick={(e) => e.stopPropagation()}>
                      {p.name}
                    </Link>
                  </span>
                </td>
                <td>{p.key}</td>
                <td>
                  <span className="inline-user">
                    <Avatar name={p.lead_name} size={22} /> {p.lead_name || '—'}
                  </span>
                </td>
                <td>{p.open_count}</td>
                <td>{p.issue_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {creating && (
        <CreateProjectModal
          onClose={() => setCreating(false)}
          onCreated={(p) => navigate(`/projects/${p.id}/board`)}
        />
      )}
    </div>
  );
}
