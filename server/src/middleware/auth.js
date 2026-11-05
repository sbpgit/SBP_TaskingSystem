const jwt = require('jsonwebtoken');
const { getPool } = require('../db');

// Verifies the JWT and loads the user (including the current role) from the database,
// so role changes take effect immediately without needing a new token.
async function requireAuth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'Not authenticated' });

  let payload;
  try {
    payload = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
  const [rows] = await getPool().query(
    'SELECT id, name, email, role, status, team_id, employee_code, designation FROM users WHERE id = ?',
    [payload.id]
  );
  if (!rows.length) return res.status(401).json({ error: 'User no longer exists' });
  if (rows[0].status !== 'active') return res.status(401).json({ error: 'Your account has been deactivated' });
  req.user = rows[0];
  next();
}

const isAdmin = (user) => user?.role === 'admin';

function requireAdmin(req, res, next) {
  if (!isAdmin(req.user)) {
    return res.status(403).json({ error: 'Only Managers can do this' });
  }
  next();
}

// Full control over a project's issues (create, edit any field, assign, move, delete):
// Managers everywhere, and a Team Lead in the projects they lead.
const canManageProject = (user, projectLeadId) =>
  isAdmin(user) || (user.role === 'team_lead' && projectLeadId != null && projectLeadId === user.id);

// Edit an issue: anyone who can manage its project, plus the assigned employee.
// `issue.project_lead_id` must be loaded alongside the issue.
const canEditIssue = (user, issue) =>
  canManageProject(user, issue.project_lead_id) || (issue.assignee_id != null && issue.assignee_id === user.id);

module.exports = { requireAuth, requireAdmin, isAdmin, canManageProject, canEditIssue };
