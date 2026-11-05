export const STATUSES = [
  { value: 'todo', label: 'To Do' },
  { value: 'in_progress', label: 'In Progress' },
  { value: 'in_review', label: 'In Review' },
  { value: 'done', label: 'Done' },
];

export const TYPES = [
  { value: 'task', label: 'Task', icon: '✔', color: '#4bade8' },
  { value: 'bug', label: 'Bug', icon: '●', color: '#e5493a' },
  { value: 'story', label: 'Story', icon: '■', color: '#63ba3c' },
  { value: 'epic', label: 'Epic', icon: '⚡', color: '#904ee2' },
];

export const PRIORITIES = [
  { value: 'highest', label: 'Highest', icon: '⇈', color: '#cd1317' },
  { value: 'high', label: 'High', icon: '↑', color: '#e9494a' },
  { value: 'medium', label: 'Medium', icon: '=', color: '#e97f33' },
  { value: 'low', label: 'Low', icon: '↓', color: '#2d8738' },
  { value: 'lowest', label: 'Lowest', icon: '⇊', color: '#57a55a' },
];

export const ROLES = [
  { value: 'admin', label: 'Manager', hint: 'Creates and edits projects, issues, employees and teams' },
  { value: 'team_lead', label: 'Team Lead', hint: 'Leads a team; edits issues assigned to them' },
  { value: 'member', label: 'Team Member', hint: 'Edits issues assigned to them' },
];
export const roleLabel = (v) => ROLES.find((r) => r.value === v)?.label || v;

export const statusLabel = (v) => STATUSES.find((s) => s.value === v)?.label || v;
export const typeOf = (v) => TYPES.find((t) => t.value === v) || TYPES[0];
export const priorityOf = (v) => PRIORITIES.find((p) => p.value === v) || PRIORITIES[2];
