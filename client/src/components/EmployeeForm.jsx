import { useState } from 'react';
import { ROLES } from '../constants.js';

const BLANK = {
  name: '',
  email: '',
  employee_code: '',
  phone: '',
  designation: '',
  department: '',
  team_id: '',
  role: 'member',
  status: 'active',
  joined_on: '',
  password: '',
};

// Shared by the "Add employee" modal and the employee detail page.
export default function EmployeeForm({ initial, teams, isCreate, readOnly, onSubmit, onCancel, submitLabel = 'Save' }) {
  const [form, setForm] = useState(() => {
    const base = { ...BLANK };
    for (const k of Object.keys(BLANK)) if (initial?.[k] != null) base[k] = initial[k];
    return base;
  });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const set = (k) => (e) => setForm({ ...form, [k]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    const { password, ...rest } = form;
    const payload = { ...rest, team_id: form.team_id ? Number(form.team_id) : null, joined_on: form.joined_on || null };
    if (isCreate) payload.password = password;
    try {
      await onSubmit(payload);
    } catch (err) {
      setError(err.message);
    }
    setSaving(false);
  };

  return (
    <form className="form" onSubmit={submit}>
      {error && <div className="alert">{error}</div>}
      <fieldset disabled={readOnly} className="plain-fieldset form">
        <div className="form-section-title">Personal details</div>
        <div className="form-row">
          <label>
            Full name *
            <input value={form.name} onChange={set('name')} required autoFocus={isCreate} />
          </label>
          <label>
            Employee ID
            <input
              value={form.employee_code}
              onChange={(e) => setForm({ ...form, employee_code: e.target.value.toUpperCase() })}
              placeholder={isCreate ? 'Auto-generated if blank' : ''}
              maxLength={20}
            />
          </label>
        </div>
        <div className="form-row">
          <label>
            Email (login) *
            <input type="email" value={form.email} onChange={set('email')} required />
          </label>
          <label>
            Phone
            <input value={form.phone} onChange={set('phone')} maxLength={30} />
          </label>
        </div>

        <div className="form-section-title">Job details</div>
        <div className="form-row">
          <label>
            Designation
            <input value={form.designation} onChange={set('designation')} placeholder="e.g. Software Engineer" />
          </label>
          <label>
            Department
            <input value={form.department} onChange={set('department')} placeholder="e.g. Engineering" />
          </label>
        </div>
        <div className="form-row">
          <label>
            Team
            <select value={form.team_id} onChange={set('team_id')}>
              <option value="">No team</option>
              {teams.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Joining date
            <input type="date" value={form.joined_on} onChange={set('joined_on')} />
          </label>
        </div>

        <div className="form-section-title">Access</div>
        <div className="role-options">
          {ROLES.map((r) => (
            <label key={r.value} className={`role-option ${form.role === r.value ? 'selected' : ''}`}>
              <input type="radio" name="role" value={r.value} checked={form.role === r.value} onChange={set('role')} />
              <span>
                <b>{r.label}</b>
                <span className="muted small">{r.hint}</span>
              </span>
            </label>
          ))}
        </div>
        <div className="form-row">
          {isCreate ? (
            <label>
              Initial password *
              <input type="text" value={form.password} onChange={set('password')} minLength={6} required />
              <span className="muted small hint">Share this with the employee so they can log in.</span>
            </label>
          ) : (
            <label>
              Status
              <select value={form.status} onChange={set('status')}>
                <option value="active">Active</option>
                <option value="inactive">Inactive (cannot log in)</option>
              </select>
            </label>
          )}
        </div>
      </fieldset>
      {!readOnly && (
        <div className="form-actions">
          {onCancel && (
            <button type="button" className="btn btn-subtle" onClick={onCancel}>
              Cancel
            </button>
          )}
          <button className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : submitLabel}
          </button>
        </div>
      )}
    </form>
  );
}
