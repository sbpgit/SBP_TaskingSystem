import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { statusLabel } from '../constants.js';
import { formatDate, useProject, useUsers } from '../hooks.js';
import { Avatar, EpicProgress, PriorityIcon, StatusPill } from '../components/Bits.jsx';
import CreateIssueModal from '../components/CreateIssueModal.jsx';
import IssueDetailModal from '../components/IssueDetailModal.jsx';

export default function Epics() {
  const { projectId } = useParams();
  const { project } = useProject(projectId);
  const users = useUsers();
  const [epics, setEpics] = useState(null);
  const [unassignedCount, setUnassignedCount] = useState(0);
  const [error, setError] = useState('');
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState(null);
  const [showDone, setShowDone] = useState(true);

  const load = useCallback(() => {
    Promise.all([api(`/projects/${projectId}/issues?type=epic`), api(`/projects/${projectId}/issues?epic=none`)])
      .then(([eps, loose]) => {
        setEpics(eps);
        setUnassignedCount(loose.filter((i) => i.status !== 'done').length);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [projectId]);
  useEffect(load, [load]);

  const shown = (epics || []).filter((e) => showDone || e.status !== 'done');
  const today = new Date().toISOString().slice(0, 10);

  return (
    <div className="page">
      <div className="breadcrumbs muted small">Projects / {project?.name}</div>
      <div className="page-header">
        <h1>Epics</h1>
        {project?.can_manage && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            Create epic
          </button>
        )}
      </div>
      <p className="muted">
        Epics group related stories, tasks and bugs into a larger goal. Progress is based on how many child issues are done.
        {unassignedCount > 0 && ` ${unassignedCount} open issue(s) in this project are not in any epic.`}
      </p>
      <div className="toolbar">
        <label className="inline-check">
          <input type="checkbox" checked={showDone} onChange={(e) => setShowDone(e.target.checked)} /> Show completed epics
        </label>
      </div>
      {error && <div className="alert">{error}</div>}
      {!epics ? (
        <p className="muted">Loading…</p>
      ) : shown.length === 0 ? (
        <div className="empty">
          <p>No epics yet.</p>
          {project?.can_manage && (
            <button className="btn btn-primary" onClick={() => setCreating(true)}>
              Create the first epic
            </button>
          )}
        </div>
      ) : (
        <div className="epic-list">
          {shown.map((e) => (
            <button key={e.id} className="epic-row" onClick={() => setSelected(e.id)}>
              <div className="epic-row-main">
                <div className="epic-row-title">
                  <span className="epic-dot">⚡</span>
                  <span className="card-key">{e.key}</span>
                  <b>{e.title}</b>
                </div>
                <EpicProgress total={e.child_count} done={e.child_done} active={e.child_active} />
              </div>
              <div className="epic-row-meta">
                <StatusPill status={e.status} label={statusLabel(e.status)} />
                <PriorityIcon priority={e.priority} />
                {e.due_date && (
                  <span className={`small ${e.due_date < today && e.status !== 'done' ? 'overdue' : 'muted'}`}>
                    Due {formatDate(e.due_date)}
                  </span>
                )}
                <Avatar name={e.assignee_name} size={26} />
              </div>
            </button>
          ))}
        </div>
      )}

      {creating && (
        <CreateIssueModal
          projectId={projectId}
          users={users}
          defaultType="epic"
          onClose={() => setCreating(false)}
          onCreated={(epic) => {
            setCreating(false);
            load();
            setSelected(epic.id);
          }}
        />
      )}
      {selected && (
        <IssueDetailModal
          issueId={selected}
          users={users}
          onClose={() => {
            setSelected(null);
            load();
          }}
        />
      )}
    </div>
  );
}
