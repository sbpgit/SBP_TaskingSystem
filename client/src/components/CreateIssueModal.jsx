import { useState } from 'react';
import { api } from '../api.js';
import { PRIORITIES, STATUSES, TYPES } from '../constants.js';
import { useEpics } from '../hooks.js';
import { Modal } from './Bits.jsx';

export default function CreateIssueModal({
  projectId,
  users,
  defaultStatus = 'todo',
  defaultType = 'task',
  defaultEpicId = '',
  onClose,
  onCreated,
}) {
  const epics = useEpics(projectId);
  const [form, setForm] = useState({
    title: '',
    description: '',
    type: defaultType,
    priority: 'medium',
    status: defaultStatus,
    assignee_id: '',
    due_date: '',
    epic_id: defaultEpicId ? String(defaultEpicId) : '',
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });
  const isEpic = form.type === 'epic';

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const issue = await api(`/projects/${projectId}/issues`, {
        method: 'POST',
        body: {
          ...form,
          assignee_id: form.assignee_id ? Number(form.assignee_id) : null,
          epic_id: !isEpic && form.epic_id ? Number(form.epic_id) : null,
        },
      });
      onCreated(issue);
    } catch (err) {
      setError(err.message);
      setSaving(false);
    }
  };

  return (
    <Modal title={isEpic ? 'Create epic' : 'Create issue'} onClose={onClose}>
      <form onSubmit={submit} className="form">
        {error && <div className="alert">{error}</div>}
        <div className="form-row">
          <label>
            Issue type
            <select value={form.type} onChange={set('type')}>
              {TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Status
            <select value={form.status} onChange={set('status')}>
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </label>
          {!isEpic && (
            <label>
              Epic
              <select value={form.epic_id} onChange={set('epic_id')}>
                <option value="">None</option>
                {epics.map((ep) => (
                  <option key={ep.id} value={ep.id}>
                    {ep.key} · {ep.title}
                  </option>
                ))}
              </select>
            </label>
          )}
        </div>
        {isEpic && (
          <p className="muted small hint">
            An epic is a large piece of work. After creating it, add stories, tasks and bugs to it to track progress.
          </p>
        )}
        <label>
          Summary *
          <input
            autoFocus
            value={form.title}
            onChange={set('title')}
            placeholder={isEpic ? 'e.g. Customer portal v2' : 'What needs to be done?'}
            required
          />
        </label>
        <label>
          Description
          <textarea rows={5} value={form.description} onChange={set('description')} />
        </label>
        <div className="form-row">
          <label>
            Assignee
            <select value={form.assignee_id} onChange={set('assignee_id')}>
              <option value="">Unassigned</option>
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select value={form.priority} onChange={set('priority')}>
              {PRIORITIES.map((p) => (
                <option key={p.value} value={p.value}>
                  {p.label}
                </option>
              ))}
            </select>
          </label>
          <label>
            Due date
            <input type="date" value={form.due_date} onChange={set('due_date')} />
          </label>
        </div>
        <div className="form-actions">
          <button type="button" className="btn btn-subtle" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Creating…' : 'Create'}
          </button>
        </div>
      </form>
    </Modal>
  );
}
