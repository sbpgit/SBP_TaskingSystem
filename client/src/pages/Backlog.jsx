import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { PRIORITIES, STATUSES, TYPES } from '../constants.js';
import { useEpics, useProject, useUsers } from '../hooks.js';
import CreateIssueModal from '../components/CreateIssueModal.jsx';
import IssueDetailModal from '../components/IssueDetailModal.jsx';
import IssueTable from '../components/IssueTable.jsx';

const EMPTY = { search: '', status: '', type: '', priority: '', assignee: '', epic: '' };

export default function Backlog() {
  const { projectId } = useParams();
  const { project } = useProject(projectId);
  const users = useUsers();
  const [epicsVersion, setEpicsVersion] = useState(0);
  const epics = useEpics(projectId, epicsVersion);
  const [filters, setFilters] = useState(EMPTY);
  const [issues, setIssues] = useState(null);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);

  const load = useCallback(() => {
    const qs = new URLSearchParams(Object.entries(filters).filter(([, v]) => v)).toString();
    api(`/projects/${projectId}/issues${qs ? `?${qs}` : ''}`)
      .then((data) => {
        setIssues(data);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [projectId, filters]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load]);

  const set = (k) => (e) => setFilters({ ...filters, [k]: e.target.value });

  return (
    <div className="page">
      <div className="breadcrumbs muted small">Projects / {project?.name}</div>
      <div className="page-header">
        <h1>Backlog</h1>
        {project?.can_manage && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create issue
          </button>
        )}
      </div>
      <div className="toolbar">
        <input className="search" placeholder="Search by key or text" value={filters.search} onChange={set('search')} />
        <select value={filters.status} onChange={set('status')}>
          <option value="">All statuses</option>
          {STATUSES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>
        <select value={filters.type} onChange={set('type')}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={filters.priority} onChange={set('priority')}>
          <option value="">All priorities</option>
          {PRIORITIES.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
        <select value={filters.assignee} onChange={set('assignee')}>
          <option value="">All assignees</option>
          <option value="me">Assigned to me</option>
          <option value="unassigned">Unassigned</option>
          {users.map((u) => (
            <option key={u.id} value={u.id}>
              {u.name}
            </option>
          ))}
        </select>
        <select value={filters.epic} onChange={set('epic')}>
          <option value="">All epics</option>
          <option value="none">Not in an epic</option>
          {epics.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.key} · {ep.title}
            </option>
          ))}
        </select>
        {Object.values(filters).some(Boolean) && (
          <button className="link-btn" onClick={() => setFilters(EMPTY)}>
            Clear filters
          </button>
        )}
      </div>
      {error && <div className="alert">{error}</div>}
      {!issues ? (
        <p className="muted">Loading…</p>
      ) : issues.length === 0 ? (
        <div className="empty">No issues match.</div>
      ) : (
        <>
          <p className="muted small">{issues.length} issue(s)</p>
          <IssueTable issues={issues} onSelect={(i) => setSelected(i.id)} />
        </>
      )}

      {creating && (
        <CreateIssueModal
          projectId={projectId}
          users={users}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false);
            setEpicsVersion((v) => v + 1);
            load();
          }}
        />
      )}
      {selected && (
        <IssueDetailModal
          issueId={selected}
          users={users}
          onClose={() => {
            setSelected(null);
            setEpicsVersion((v) => v + 1);
            load();
          }}
          onChanged={(u) => setIssues((prev) => prev.map((i) => (i.id === u.id ? { ...i, ...u } : i)))}
          onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
        />
      )}
    </div>
  );
}
