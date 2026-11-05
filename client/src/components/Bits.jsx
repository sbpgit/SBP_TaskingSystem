import { useEffect, useRef } from 'react';
import { ROLES, priorityOf, typeOf } from '../constants.js';

const AVATAR_COLORS = ['#0052cc', '#00875a', '#de350b', '#5243aa', '#ff8b00', '#00a3bf', '#6554c0', '#36b37e'];

export function Avatar({ name, size = 24, title }) {
  if (!name) {
    return (
      <span className="avatar avatar-empty" style={{ width: size, height: size, fontSize: size * 0.45 }} title="Unassigned">
        ?
      </span>
    );
  }
  const initials = name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const color = AVATAR_COLORS[[...name].reduce((a, c) => a + c.charCodeAt(0), 0) % AVATAR_COLORS.length];
  return (
    <span
      className="avatar"
      style={{ width: size, height: size, fontSize: size * 0.42, background: color }}
      title={title || name}
    >
      {initials}
    </span>
  );
}

export function TypeIcon({ type }) {
  const t = typeOf(type);
  return (
    <span className="type-icon" style={{ background: t.color }} title={t.label}>
      {t.icon}
    </span>
  );
}

export function PriorityIcon({ priority, withLabel }) {
  const p = priorityOf(priority);
  return (
    <span className="priority" style={{ color: p.color }} title={`${p.label} priority`}>
      <b>{p.icon}</b>
      {withLabel && <span className="priority-label">{p.label}</span>}
    </span>
  );
}

// Purple label showing which epic an issue belongs to.
export function EpicChip({ title, epicKey, onClick }) {
  if (!title) return null;
  const Tag = onClick ? 'button' : 'span';
  return (
    <Tag
      className={`epic-chip ${onClick ? 'clickable' : ''}`}
      title={`Epic ${epicKey}: ${title}`}
      onClick={
        onClick
          ? (e) => {
              e.stopPropagation();
              onClick();
            }
          : undefined
      }
    >
      {title}
    </Tag>
  );
}

// Segmented progress bar for an epic: done (green), in progress/review (blue), to do (grey).
export function EpicProgress({ total, done, active, compact }) {
  const pct = (n) => (total ? (n / total) * 100 : 0);
  return (
    <div className={`epic-progress ${compact ? 'compact' : ''}`}>
      <div className="epic-bar" title={`${done} done · ${active} in progress · ${total - done - active} to do`}>
        <span className="seg-done" style={{ width: `${pct(done)}%` }} />
        <span className="seg-active" style={{ width: `${pct(active)}%` }} />
      </div>
      <span className="epic-progress-label">
        {total ? `${Math.round(pct(done))}% · ${done}/${total} done` : 'No child issues'}
      </span>
    </div>
  );
}

export function RoleBadge({ role }) {
  const r = ROLES.find((x) => x.value === role) || ROLES[2];
  return (
    <span className={`role-badge role-${r.value}`} title={r.hint}>
      {r.label}
    </span>
  );
}

export function EmployeeStatus({ status }) {
  return <span className={`emp-status emp-${status}`}>{status === 'active' ? 'Active' : 'Inactive'}</span>;
}

export function StatusPill({ status, label }) {
  return <span className={`status-pill status-${status}`}>{label}</span>;
}

export function Modal({ title, onClose, children, wide }) {
  const ref = useRef(null);
  useEffect(() => {
    // With stacked modals, Escape closes only the top-most one.
    const onKey = (e) => {
      if (e.key !== 'Escape') return;
      const all = document.querySelectorAll('.modal-backdrop');
      if (all[all.length - 1] === ref.current) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div ref={ref} className="modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div className={`modal ${wide ? 'modal-wide' : ''}`} role="dialog" aria-modal="true">
        <div className="modal-header">
          <h2>{title}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
}
