import { statusLabel } from '../constants.js';
import { formatDate } from '../hooks.js';
import { Avatar, EpicChip, EpicProgress, PriorityIcon, StatusPill, TypeIcon } from './Bits.jsx';

export default function IssueTable({ issues, onSelect, showProject }) {
  return (
    <table className="table">
      <thead>
        <tr>
          <th style={{ width: 40 }}>Type</th>
          <th style={{ width: 110 }}>Key</th>
          <th>Summary</th>
          <th>Epic</th>
          {showProject && <th>Project</th>}
          <th>Status</th>
          <th>Priority</th>
          <th>Assignee</th>
          <th>Due</th>
          <th>Updated</th>
        </tr>
      </thead>
      <tbody>
        {issues.map((i) => (
          <tr key={i.id} className="clickable" onClick={() => onSelect(i)}>
            <td>
              <TypeIcon type={i.type} />
            </td>
            <td className={`card-key ${i.status === 'done' ? 'done' : ''}`}>{i.key}</td>
            <td>
              {i.title}
              {i.type === 'epic' && i.child_count > 0 && (
                <EpicProgress compact total={i.child_count} done={i.child_done} active={i.child_active} />
              )}
            </td>
            <td>
              {i.epic_title ? <EpicChip title={i.epic_title} epicKey={i.epic_key} /> : <span className="muted">—</span>}
            </td>
            {showProject && <td>{i.key.split('-')[0]}</td>}
            <td>
              <StatusPill status={i.status} label={statusLabel(i.status)} />
            </td>
            <td>
              <PriorityIcon priority={i.priority} withLabel />
            </td>
            <td>
              <span className="inline-user">
                <Avatar name={i.assignee_name} size={22} /> {i.assignee_name || <span className="muted">Unassigned</span>}
              </span>
            </td>
            <td>{formatDate(i.due_date)}</td>
            <td className="muted">{formatDate(i.updated_at)}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
