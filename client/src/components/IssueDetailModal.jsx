import { useCallback, useEffect, useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../AuthContext.jsx';
import { PRIORITIES, STATUSES, TYPES, statusLabel } from '../constants.js';
import { formatDate, formatDateTime, useEpics } from '../hooks.js';
import { Avatar, EpicChip, EpicProgress, Modal, PriorityIcon, StatusPill, TypeIcon } from './Bits.jsx';
import CreateIssueModal from './CreateIssueModal.jsx';

export default function IssueDetailModal({ issueId, users, onClose, onChanged, onDeleted }) {
  const { user } = useAuth();
  // The modal can navigate between an epic and its child issues; `history` powers the Back button.
  const [currentId, setCurrentId] = useState(issueId);
  const [history, setHistory] = useState([]);
  const [issue, setIssue] = useState(null);
  const [error, setError] = useState('');
  const [title, setTitle] = useState('');
  const [editingDesc, setEditingDesc] = useState(false);
  const [desc, setDesc] = useState('');
  const [comment, setComment] = useState('');
  const [linkCandidates, setLinkCandidates] = useState(null);
  const [creatingChild, setCreatingChild] = useState(false);
  const [epicsVersion, setEpicsVersion] = useState(0);
  const epics = useEpics(issue?.project_id, epicsVersion);

  const reload = useCallback(() => {
    return api(`/issues/${currentId}`)
      .then((data) => {
        setIssue(data);
        setTitle(data.title);
        setDesc(data.description || '');
        setError('');
      })
      .catch((e) => setError(e.message));
  }, [currentId]);

  useEffect(() => {
    setIssue(null);
    setEditingDesc(false);
    setLinkCandidates(null);
    reload();
  }, [reload]);

  const openIssue = (id) => {
    setHistory((h) => [...h, currentId]);
    setCurrentId(id);
  };
  const goBack = () => {
    setHistory((h) => {
      const prev = h[h.length - 1];
      if (prev) setCurrentId(prev);
      return h.slice(0, -1);
    });
  };

  const update = async (changes) => {
    setError('');
    try {
      const updated = await api(`/issues/${currentId}`, { method: 'PATCH', body: changes });
      setIssue((prev) => ({ ...prev, ...updated }));
      onChanged?.(updated);
      if (changes.type !== undefined) {
        setEpicsVersion((v) => v + 1);
        reload(); // child list appears/disappears when the type changes to/from epic
      }
      return true;
    } catch (e) {
      setError(e.message);
      return false;
    }
  };

  const saveTitle = () => {
    if (title.trim() && title.trim() !== issue.title) update({ title: title.trim() });
    else setTitle(issue.title);
  };

  const saveDesc = async () => {
    if (await update({ description: desc })) setEditingDesc(false);
  };

  const addComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    try {
      const c = await api(`/issues/${currentId}/comments`, { method: 'POST', body: { body: comment } });
      setIssue((prev) => ({ ...prev, comments: [...prev.comments, c], comment_count: prev.comment_count + 1 }));
      onChanged?.({ ...issue, comment_count: issue.comment_count + 1 });
      setComment('');
    } catch (e) {
      setError(e.message);
    }
  };

  const deleteComment = async (id) => {
    try {
      await api(`/comments/${id}`, { method: 'DELETE' });
      setIssue((prev) => ({
        ...prev,
        comments: prev.comments.filter((c) => c.id !== id),
        comment_count: prev.comment_count - 1,
      }));
    } catch (e) {
      setError(e.message);
    }
  };

  // ---- Epic children ----
  const setChildEpic = async (childId, epicId) => {
    setError('');
    try {
      await api(`/issues/${childId}`, { method: 'PATCH', body: { epic_id: epicId } });
      setLinkCandidates(null);
      await reload();
      onChanged?.({ id: childId });
    } catch (e) {
      setError(e.message);
    }
  };

  const showLinkPicker = async () => {
    try {
      const all = await api(`/projects/${issue.project_id}/issues`);
      setLinkCandidates(all.filter((i) => i.type !== 'epic' && i.epic_id !== issue.id));
    } catch (e) {
      setError(e.message);
    }
  };

  const canEdit = !!issue?.can_edit;
  const canManage = !!issue?.can_manage; // Manager, or Team Lead of this project
  const isEpic = issue?.type === 'epic';

  const remove = async () => {
    const extra = isEpic && issue.child_count ? ` Its ${issue.child_count} child issue(s) will be kept but unlinked.` : '';
    if (!window.confirm(`Delete ${issue.key}? This cannot be undone.${extra}`)) return;
    try {
      await api(`/issues/${currentId}`, { method: 'DELETE' });
      onDeleted?.(issue.id);
      if (history.length) {
        goBack();
      } else {
        onClose();
      }
    } catch (e) {
      setError(e.message);
    }
  };

  return (
    <Modal
      wide
      onClose={onClose}
      title={
        issue ? (
          <span className="issue-modal-key">
            {history.length > 0 && (
              <button className="link-btn back-btn" onClick={goBack}>
                ← Back
              </button>
            )}
            {issue.epic_id && (
              <>
                <EpicChip title={issue.epic_title} epicKey={issue.epic_key} onClick={() => openIssue(issue.epic_id)} />
                <span className="muted">/</span>
              </>
            )}
            <TypeIcon type={issue.type} /> {issue.key}
          </span>
        ) : (
          'Loading…'
        )
      }
    >
      {error && <div className="alert">{error}</div>}
      {issue && !canEdit && (
        <div className="alert alert-info">
          🔒 View only — only a Manager, the project's Team Lead or the assigned employee can edit this issue. You can still comment.
        </div>
      )}
      {issue && (
        <div className="issue-detail">
          <div className="issue-main">
            <input
              className="title-input"
              readOnly={!canEdit}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={saveTitle}
              onKeyDown={(e) => e.key === 'Enter' && e.currentTarget.blur()}
            />

            <h4>Description</h4>
            {editingDesc ? (
              <div>
                <textarea rows={7} value={desc} onChange={(e) => setDesc(e.target.value)} autoFocus />
                <div className="form-actions left">
                  <button className="btn btn-primary" onClick={saveDesc}>
                    Save
                  </button>
                  <button
                    className="btn btn-subtle"
                    onClick={() => {
                      setDesc(issue.description || '');
                      setEditingDesc(false);
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <div className={`description ${canEdit ? '' : 'readonly'}`} onClick={() => canEdit && setEditingDesc(true)}>
                {issue.description || <span className="muted">{canEdit ? 'Add a description…' : 'No description'}</span>}
              </div>
            )}

            {isEpic && (
              <section className="child-issues">
                <div className="child-head">
                  <h4>Child issues ({issue.children.length})</h4>
                  {canManage && (
                    <div className="child-actions">
                      <button className="btn btn-subtle small" onClick={showLinkPicker}>
                        Add existing
                      </button>
                      <button className="btn btn-subtle small" onClick={() => setCreatingChild(true)}>
                        + Create child issue
                      </button>
                    </div>
                  )}
                </div>
                <EpicProgress total={issue.child_count} done={issue.child_done} active={issue.child_active} />

                {linkCandidates && (
                  <div className="link-picker">
                    <select
                      autoFocus
                      defaultValue=""
                      onChange={(e) => e.target.value && setChildEpic(Number(e.target.value), issue.id)}
                    >
                      <option value="">Select an issue to add to this epic…</option>
                      {linkCandidates.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.key} · {c.title}
                          {c.epic_key ? ` (currently in ${c.epic_key})` : ''}
                        </option>
                      ))}
                    </select>
                    <button className="link-btn small" onClick={() => setLinkCandidates(null)}>
                      Cancel
                    </button>
                  </div>
                )}

                {issue.children.length === 0 ? (
                  <p className="muted small">No issues in this epic yet.</p>
                ) : (
                  <ul className="child-list">
                    {issue.children.map((c) => (
                      <li key={c.id} onClick={() => openIssue(c.id)}>
                        <TypeIcon type={c.type} />
                        <span className={`card-key ${c.status === 'done' ? 'done' : ''}`}>{c.key}</span>
                        <span className="child-title">{c.title}</span>
                        <PriorityIcon priority={c.priority} />
                        <Avatar name={c.assignee_name} size={22} />
                        <StatusPill status={c.status} label={statusLabel(c.status)} />
                        {c.can_edit && (
                          <button
                            className="icon-btn small"
                            title="Remove from epic"
                            onClick={(e) => {
                              e.stopPropagation();
                              setChildEpic(c.id, null);
                            }}
                          >
                            ✕
                          </button>
                        )}
                      </li>
                    ))}
                  </ul>
                )}
              </section>
            )}

            <h4>Comments ({issue.comments.length})</h4>
            <form onSubmit={addComment} className="comment-form">
              <Avatar name={user.name} size={32} />
              <div className="grow">
                <textarea rows={2} placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} />
                {comment.trim() && (
                  <div className="form-actions left">
                    <button className="btn btn-primary">Save</button>
                  </div>
                )}
              </div>
            </form>
            <ul className="comments">
              {[...issue.comments].reverse().map((c) => (
                <li key={c.id}>
                  <Avatar name={c.user_name || 'Deleted user'} size={32} />
                  <div className="grow">
                    <div className="comment-head">
                      <b>{c.user_name || 'Deleted user'}</b>
                      <span className="muted small">{formatDateTime(c.created_at)}</span>
                      {c.user_id === user.id && (
                        <button className="link-btn small" onClick={() => deleteComment(c.id)}>
                          Delete
                        </button>
                      )}
                    </div>
                    <div className="comment-body">{c.body}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="issue-side">
            <select
              className={`status-select status-${issue.status}`}
              value={issue.status}
              disabled={!canEdit}
              onChange={(e) => update({ status: e.target.value })}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>

            <div className="details-box">
              <div className="details-title">Details</div>
              <label>
                Assignee
                <select
                  value={issue.assignee_id || ''}
                  disabled={!canManage}
                  title={canManage ? '' : 'Only a Manager or the project lead can assign issues'}
                  onChange={(e) => update({ assignee_id: e.target.value ? Number(e.target.value) : null })}
                >
                  <option value="">Unassigned</option>
                  {users.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>
              </label>
              {canManage && issue.assignee_id !== user.id && (
                <button className="link-btn small" onClick={() => update({ assignee_id: user.id })}>
                  Assign to me
                </button>
              )}
              <label>
                Type
                <select value={issue.type} disabled={!canEdit} onChange={(e) => update({ type: e.target.value })}>
                  {TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
              {!isEpic && (
                <label>
                  Epic
                  <select
                    value={issue.epic_id || ''}
                    disabled={!canEdit}
                    onChange={(e) => update({ epic_id: e.target.value ? Number(e.target.value) : null })}
                  >
                    <option value="">None</option>
                    {epics.map((ep) => (
                      <option key={ep.id} value={ep.id}>
                        {ep.key} · {ep.title}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label>
                Priority
                <select value={issue.priority} disabled={!canEdit} onChange={(e) => update({ priority: e.target.value })}>
                  {PRIORITIES.map((p) => (
                    <option key={p.value} value={p.value}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Due date
                <input
                  type="date"
                  value={issue.due_date || ''}
                  disabled={!canEdit}
                  onChange={(e) => update({ due_date: e.target.value || null })}
                />
              </label>
              <div className="detail-line">
                <span className="muted">Reporter</span>
                <span className="inline-user">
                  <Avatar name={issue.reporter_name} size={20} /> {issue.reporter_name || '—'}
                </span>
              </div>
            </div>
            <div className="muted small meta">
              Created {formatDate(issue.created_at)}
              <br />
              Updated {formatDateTime(issue.updated_at)}
            </div>
            {canManage && (
              <button className="btn btn-danger-subtle" onClick={remove}>
                Delete {isEpic ? 'epic' : 'issue'}
              </button>
            )}
          </div>
        </div>
      )}

      {creatingChild && issue && (
        <CreateIssueModal
          projectId={issue.project_id}
          users={users}
          defaultType="story"
          defaultEpicId={issue.id}
          onClose={() => setCreatingChild(false)}
          onCreated={(child) => {
            setCreatingChild(false);
            reload();
            onChanged?.(child);
          }}
        />
      )}
    </Modal>
  );
}
