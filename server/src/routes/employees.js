const express = require('express');
const bcrypt = require('bcryptjs');
const { getPool, defaultEmployeeCode } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const ROLES = ['admin', 'team_lead', 'member'];
const STATUSES = ['active', 'inactive'];
const LEAD_ROLES = ['admin', 'team_lead'];

const EMPLOYEE_SELECT = `
  SELECT u.id, u.employee_code, u.name, u.email, u.phone, u.designation, u.department,
         u.role, u.status, u.joined_on, u.team_id, t.name AS team_name, u.created_at,
         (SELECT COUNT(*) FROM issues i WHERE i.assignee_id = u.id AND i.status <> 'done') AS open_issues,
         (SELECT GROUP_CONCAT(lt.name ORDER BY lt.name SEPARATOR ', ') FROM teams lt WHERE lt.lead_id = u.id) AS leads_teams
  FROM users u
  LEFT JOIN teams t ON t.id = u.team_id`;

async function fetchEmployee(db, id) {
  const [rows] = await db.query(`${EMPLOYEE_SELECT} WHERE u.id = ?`, [id]);
  return rows[0] || null;
}

// Validates and normalises employee fields. Returns { errors, fields }.
function parseEmployee(body, { partial }) {
  const errors = [];
  const fields = {};
  const has = (k) => body[k] !== undefined;
  const text = (k, label, max) => {
    if (!has(k)) return;
    const v = String(body[k] ?? '').trim();
    if (v.length > max) errors.push(`${label} must be at most ${max} characters`);
    fields[k] = v || null;
  };

  if (!partial || has('name')) {
    const v = String(body.name || '').trim();
    if (!v) errors.push('Name is required');
    else if (v.length > 100) errors.push('Name must be at most 100 characters');
    fields.name = v;
  }
  if (!partial || has('email')) {
    const v = String(body.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) errors.push('A valid email is required');
    fields.email = v;
  }
  text('employee_code', 'Employee ID', 20);
  if (fields.employee_code) fields.employee_code = fields.employee_code.toUpperCase();
  text('phone', 'Phone', 30);
  text('designation', 'Designation', 100);
  text('department', 'Department', 100);
  if (has('team_id')) fields.team_id = body.team_id ? Number(body.team_id) : null;
  if (has('role')) {
    if (!ROLES.includes(body.role)) errors.push('Invalid role');
    fields.role = body.role;
  }
  if (has('status')) {
    if (!STATUSES.includes(body.status)) errors.push('Invalid status');
    fields.status = body.status;
  }
  if (has('joined_on')) {
    const v = body.joined_on || null;
    if (v && !/^\d{4}-\d{2}-\d{2}$/.test(v)) errors.push('Invalid joining date');
    fields.joined_on = v;
  }
  return { errors, fields };
}

function duplicateMessage(err) {
  if (err.code !== 'ER_DUP_ENTRY') return null;
  if (/employee_code/.test(err.message)) return 'That Employee ID is already in use';
  if (/email/.test(err.message)) return 'An employee with that email already exists';
  return 'Duplicate value';
}

async function teamExists(db, teamId) {
  const [rows] = await db.query('SELECT id FROM teams WHERE id = ?', [teamId]);
  return rows.length > 0;
}

router.get('/', async (req, res) => {
  const { search, team_id, role, status } = req.query;
  const where = [];
  const values = [];
  if (search) {
    where.push('(u.name LIKE ? OR u.email LIKE ? OR u.employee_code LIKE ? OR u.designation LIKE ? OR u.department LIKE ?)');
    values.push(...Array(5).fill(`%${search}%`));
  }
  if (team_id === 'none') where.push('u.team_id IS NULL');
  else if (team_id) { where.push('u.team_id = ?'); values.push(team_id); }
  if (role) { where.push('u.role = ?'); values.push(role); }
  if (status) { where.push('u.status = ?'); values.push(status); }

  const [rows] = await getPool().query(
    `${EMPLOYEE_SELECT} ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
     ORDER BY FIELD(u.status, 'active', 'inactive'), u.name`,
    values
  );
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const emp = await fetchEmployee(getPool(), req.params.id);
  if (!emp) return res.status(404).json({ error: 'Employee not found' });
  res.json(emp);
});

router.post('/', requireAdmin, async (req, res) => {
  const body = req.body || {};
  const { errors, fields } = parseEmployee(body, { partial: false });
  if (!body.password || String(body.password).length < 6) errors.push('Initial password must be at least 6 characters');
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const db = getPool();
  if (fields.team_id && !(await teamExists(db, fields.team_id))) return res.status(400).json({ error: 'Team not found' });

  fields.role = fields.role || 'member';
  fields.status = fields.status || 'active';
  fields.password_hash = await bcrypt.hash(String(body.password), 10);

  const cols = Object.keys(fields);
  let id;
  try {
    const [result] = await db.query(
      `INSERT INTO users (${cols.join(', ')}) VALUES (${cols.map(() => '?').join(', ')})`,
      cols.map((c) => fields[c])
    );
    id = result.insertId;
    if (!fields.employee_code) {
      await db.query('UPDATE users SET employee_code = ? WHERE id = ?', [defaultEmployeeCode(id), id]).catch(() => {});
    }
  } catch (err) {
    const msg = duplicateMessage(err);
    if (msg) return res.status(409).json({ error: msg });
    throw err;
  }
  res.status(201).json(await fetchEmployee(db, id));
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { errors, fields } = parseEmployee(req.body || {}, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const db = getPool();
  const id = Number(req.params.id);
  const current = await fetchEmployee(db, id);
  if (!current) return res.status(404).json({ error: 'Employee not found' });

  if (id === req.user.id && fields.status === 'inactive') {
    return res.status(400).json({ error: 'You cannot deactivate your own account' });
  }
  const losesManager =
    current.role === 'admin' && current.status === 'active' &&
    ((fields.role && fields.role !== 'admin') || fields.status === 'inactive');
  if (losesManager) {
    const [[{ n }]] = await db.query("SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'");
    if (n <= 1) return res.status(400).json({ error: 'There must be at least one active Manager' });
  }
  if (fields.team_id && !(await teamExists(db, fields.team_id))) return res.status(400).json({ error: 'Team not found' });

  const cols = Object.keys(fields);
  if (cols.length) {
    try {
      await db.query(`UPDATE users SET ${cols.map((c) => `${c} = ?`).join(', ')} WHERE id = ?`, [...cols.map((c) => fields[c]), id]);
    } catch (err) {
      const msg = duplicateMessage(err);
      if (msg) return res.status(409).json({ error: msg });
      throw err;
    }
  }

  // Keep team leadership consistent: a lead must hold a lead role, be active, and belong to the team they lead.
  const updated = await fetchEmployee(db, id);
  if (!LEAD_ROLES.includes(updated.role) || updated.status !== 'active') {
    await db.query('UPDATE teams SET lead_id = NULL WHERE lead_id = ?', [id]);
  } else if (fields.team_id !== undefined) {
    await db.query('UPDATE teams SET lead_id = NULL WHERE lead_id = ? AND id <> ?', [id, updated.team_id || 0]);
  }
  res.json(await fetchEmployee(db, id));
});

router.post('/:id/password', requireAdmin, async (req, res) => {
  const password = String(req.body?.password || '');
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  const hash = await bcrypt.hash(password, 10);
  const [r] = await getPool().query('UPDATE users SET password_hash = ? WHERE id = ?', [hash, req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Employee not found' });
  res.status(204).end();
});

module.exports = router;
