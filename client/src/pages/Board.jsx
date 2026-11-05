import { useCallback, useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { STATUSES, TYPES } from '../constants.js';
import { useProject, useUsers } from '../hooks.js';
import { Avatar, EpicChip, EpicProgress, PriorityIcon, TypeIcon } from '../components/Bits.jsx';
import CreateIssueModal from '../components/CreateIssueModal.jsx';
import IssueDetailModal from '../components/IssueDetailModal.jsx';

export default function Board() {
  const { projectId } = useParams();
  const { user, isAdmin } = useAuth();
  const { project } = useProject(projectId);
  const canManage = !!project?.can_manage;
  const users = useUsers();
  const [issues, setIssues] = useState([]);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [assignee, setAssignee] = useState('');
  const [type, setType] = useState('');
  const [epicFilter, setEpicFilter] = useState('');
  const [selected, setSelected] = useState(null);
  const [creatingIn, setCreatingIn] = useState(null);
  const [dragId, setDragId] = useState(null);
  const [dropTarget, setDropTarget] = useState(null); // { status, index }

  const load = useCallback(() => {
    api(`/projects/${projectId}/issues`)
      .then((data) => {
        setIssues(data);
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [projectId]);

  useEffect(load, [load]);

  const visible = issues.filter((i) => {
    if (search && !`${i.key} ${i.title}`.toLowerCase().includes(search.toLowerCase())) return false;
    if (assignee === 'unassigned' && i.assignee_id) return false;
    if (assignee && assignee !== 'unassigned' && String(i.assignee_id) !== assignee) return false;
    if (type && i.type !== type) return false;
    if (epicFilter === 'none' && (i.epic_id || i.type === 'epic')) return false;
    if (epicFilter && epicFilter !== 'none' && String(i.epic_id) !== epicFilter && String(i.id) !== epicFilter) return false;
    return true;
  });
  const epics = issues.filter((i) => i.type === 'epic');

  const column = (status) =>
    visible.filter((i) => i.status === status).sort((a, b) => a.position - b.position || b.id - a.id);

  const onDrop = async (status) => {
    const id = dragId;
    const target = dropTarget;
    setDragId(null);
    setDropTarget(null);
    if (!id || !target) return;

    // Translate the index within the (possibly filtered) column to an index within the full column.
    const fullCol = issues
      .filter((i) => i.status === status && i.id !== id)
      .sort((a, b) => a.position - b.position || b.id - a.id);
    const visibleCol = column(status).filter((i) => i.id !== id);
    const anchor = visibleCol[target.index];
    const position = anchor ? fullCol.findIndex((i) => i.id === anchor.id) : fullCol.length;

    // Optimistic update
    const moved = issues.find((i) => i.id === id);
    const reordered = [...fullCol];
    reordered.splice(position, 0, { ...moved, status });
    const positions = new Map(reordered.map((i, idx) => [i.id, idx]));
    setIssues((prev) =>
      prev.map((i) => (positions.has(i.id) ? { ...i, status: i.id === id ? status : i.status, position: positions.get(i.id) } : i))
    );

    try {
      await api(`/issues/${id}/move`, { method: 'PATCH', body: { status, position } });
    } catch (e) {
      setError(e.message);
    }
    load();
  };

  const onDragOverCard = (e, status, index) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const after = e.clientY > rect.top + rect.height / 2;
    const visibleCol = column(status).filter((i) => i.id !== dragId);
    const cardId = Number(e.currentTarget.dataset.id);
    let idx = visibleCol.findIndex((i) => i.id === cardId);
    if (idx === -1) idx = index;
    const next = { status, index: after ? idx + 1 : idx };
    if (dropTarget?.status !== next.status || dropTarget?.index !== next.index) setDropTarget(next);
  };

  return (
    <div className="page board-page">
      <div className="breadcrumbs muted small">Projects / {project?.name}</div>
      <div className="page-header">
        <h1>{project?.key} board</h1>
        {canManage && (
          <button className="btn btn-primary" onClick={() => setCreatingIn('todo')}>
            Create issue
          </button>
        )}
      </div>
      {project && !canManage && (
        <p className="muted small">You can move and edit only the issues assigned to you. Other issues are read-only (🔒).</p>
      )}
      {canManage && !isAdmin && (
        <p className="muted small">You lead this project, so you can create, edit, assign and delete all of its issues.</p>
      )}

      <div className="toolbar">
        <input className="search" placeholder="Search this board" value={search} onChange={(e) => setSearch(e.target.value)} />
        <div className="avatar-filter">
          {users.slice(0, 8).map((u) => (
            <button
              key={u.id}
              className={`avatar-btn ${assignee === String(u.id) ? 'active' : ''}`}
              onClick={() => setAssignee(assignee === String(u.id) ? '' : String(u.id))}
              title={u.name}
            >
              <Avatar name={u.name} size={30} />
            </button>
          ))}
        </div>
        <button
          className={`btn btn-subtle ${assignee === String(user.id) ? 'btn-selected' : ''}`}
          onClick={() => setAssignee(assignee === String(user.id) ? '' : String(user.id))}
        >
          Only my issues
        </button>
        <select value={type} onChange={(e) => setType(e.target.value)}>
          <option value="">All types</option>
          {TYPES.map((t) => (
            <option key={t.value} value={t.value}>
              {t.label}
            </option>
          ))}
        </select>
        <select value={epicFilter} onChange={(e) => setEpicFilter(e.target.value)}>
          <option value="">All epics</option>
          <option value="none">Not in an epic</option>
          {epics.map((ep) => (
            <option key={ep.id} value={ep.id}>
              {ep.key} · {ep.title}
            </option>
          ))}
        </select>
        {(search || assignee || type || epicFilter) && (
          <button
            className="link-btn"
            onClick={() => {
              setSearch('');
              setAssignee('');
              setType('');
              setEpicFilter('');
            }}
          >
            Clear filters
          </button>
        )}
      </div>

      {error && <div className="alert">{error}</div>}

      <div className="board">
        {STATUSES.map((s) => {
          const items = column(s.value);
          return (
            <div
              key={s.value}
              className={`column ${dropTarget?.status === s.value ? 'drop-active' : ''}`}
              onDragOver={(e) => {
                e.preventDefault();
                if (e.target === e.currentTarget || e.target.classList.contains('column-cards')) {
                  const count = items.filter((i) => i.id !== dragId).length;
                  if (dropTarget?.status !== s.value || dropTarget?.index !== count) setDropTarget({ status: s.value, index: count });
                }
              }}
              onDrop={(e) => {
                e.preventDefault();
                onDrop(s.value);
              }}
            >
              <div className="column-header">
                {s.label} <span className="count">{items.length}</span>
              </div>
              <div className="column-cards">
                {items.map((issue, index) => (
                  <div
                    key={issue.id}
                    data-id={issue.id}
                    className={`card ${dragId === issue.id ? 'dragging' : ''} ${
                      dropTarget?.status === s.value &&
                      items.filter((i) => i.id !== dragId)[dropTarget.index]?.id === issue.id
                        ? 'drop-before'
                        : ''
                    }`}
                    draggable={issue.can_edit}
                    onDragStart={(e) => {
                      e.dataTransfer.effectAllowed = 'move';
                      e.dataTransfer.setData('text/plain', String(issue.id));
                      setDragId(issue.id);
                    }}
                    onDragEnd={() => {
                      setDragId(null);
                      setDropTarget(null);
                    }}
                    onDragOver={(e) => onDragOverCard(e, s.value, index)}
                    onClick={() => setSelected(issue.id)}
                  >
                    <div className="card-title">{issue.title}</div>
                    {issue.epic_id && (
                      <div className="card-epic">
                        <EpicChip title={issue.epic_title} epicKey={issue.epic_key} onClick={() => setEpicFilter(String(issue.epic_id))} />
                      </div>
                    )}
                    {issue.type === 'epic' && (
                      <EpicProgress compact total={issue.child_count} done={issue.child_done} active={issue.child_active} />
                    )}
                    <div className="card-footer">
                      <span className="inline-user">
                        <TypeIcon type={issue.type} />
                        <span className={`card-key ${issue.status === 'done' ? 'done' : ''}`}>{issue.key}</span>
                      </span>
                      <span className="inline-user">
                        {!issue.can_edit && (
                          <span className="muted small" title="Read-only: not assigned to you">
                            🔒
                          </span>
                        )}
                        {issue.comment_count > 0 && <span className="muted small">💬 {issue.comment_count}</span>}
                        <PriorityIcon priority={issue.priority} />
                        <Avatar name={issue.assignee_name} size={24} />
                      </span>
                    </div>
                  </div>
                ))}
                {dropTarget?.status === s.value &&
                  dropTarget.index >= items.filter((i) => i.id !== dragId).length && <div className="drop-indicator" />}
              </div>
              {canManage && (
                <button className="add-card" onClick={() => setCreatingIn(s.value)}>
                  + Create issue
                </button>
              )}
            </div>
          );
        })}
      </div>

      {creatingIn && (
        <CreateIssueModal
          projectId={projectId}
          users={users}
          defaultStatus={creatingIn}
          onClose={() => setCreatingIn(null)}
          defaultEpicId={epicFilter && epicFilter !== 'none' ? epicFilter : ''}
          onCreated={() => {
            setCreatingIn(null);
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
            load();
          }}
          onChanged={(u) => setIssues((prev) => prev.map((i) => (i.id === u.id ? { ...i, ...u } : i)))}
          onDeleted={(id) => setIssues((prev) => prev.filter((i) => i.id !== id))}
        />
      )}
    </div>
  );
}
