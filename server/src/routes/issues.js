const express = require('express');
const { getPool } = require('../db');
const { canManageProject, canEditIssue } = require('../middleware/auth');

const router = express.Router();

const withPerm = (user) => (issue) =>
  issue && { ...issue, can_edit: canEditIssue(user, issue), can_manage: canManageProject(user, issue.project_lead_id) };
const NO_EDIT = 'Only a Manager, the project lead or the assigned employee can edit this issue';
const NO_MANAGE = 'Only a Manager or the Team Lead leading this project can do this';

const TYPES = ['task', 'bug', 'story', 'epic'];
const STATUSES = ['todo', 'in_progress', 'in_review', 'done'];
const PRIORITIES = ['lowest', 'low', 'medium', 'high', 'highest'];

const ISSUE_SELECT = `
  SELECT i.id, i.project_id, p.lead_id AS project_lead_id, i.number, CONCAT(p.project_key, '-', i.number) AS \`key\`,
         i.title, i.description, i.type, i.status, i.priority, i.position, i.due_date,
         i.assignee_id, a.name AS assignee_name,
         i.reporter_id, r.name AS reporter_name,
         i.created_at, i.updated_at,
         (SELECT COUNT(*) FROM comments c WHERE c.issue_id = i.id) AS comment_count,
         i.epic_id, CONCAT(p.project_key, '-', e.number) AS epic_key, e.title AS epic_title,
         (SELECT COUNT(*) FROM issues ch WHERE ch.epic_id = i.id) AS child_count,
         (SELECT COUNT(*) FROM issues ch WHERE ch.epic_id = i.id AND ch.status = 'done') AS child_done,
         (SELECT COUNT(*) FROM issues ch WHERE ch.epic_id = i.id AND ch.status IN ('in_progress', 'in_review')) AS child_active
  FROM issues i
  JOIN projects p ON p.id = i.project_id
  LEFT JOIN issues e ON e.id = i.epic_id
  LEFT JOIN users a ON a.id = i.assignee_id
  LEFT JOIN users r ON r.id = i.reporter_id`;

async function fetchIssue(db, id) {
  const [rows] = await db.query(`${ISSUE_SELECT} WHERE i.id = ?`, [id]);
  return rows[0] || null;
}

function validate(body, { partial }) {
  const errors = [];
  if (!partial || body.title !== undefined) {
    if (!String(body.title || '').trim()) errors.push('Title is required');
  }
  if (body.type !== undefined && !TYPES.includes(body.type)) errors.push('Invalid type');
  if (body.status !== undefined && !STATUSES.includes(body.status)) errors.push('Invalid status');
  if (body.priority !== undefined && !PRIORITIES.includes(body.priority)) errors.push('Invalid priority');
  if (body.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(body.due_date)) errors.push('Invalid due date');
  return errors;
}

// Returns an error message if `epicId` cannot be used as the epic of an issue in `projectId`.
async function checkEpic(db, epicId, projectId, selfId) {
  if (!epicId) return null;
  if (selfId && Number(epicId) === Number(selfId)) return 'An issue cannot be its own epic';
  const [rows] = await db.query('SELECT type, project_id FROM issues WHERE id = ?', [epicId]);
  if (!rows.length) return 'Epic not found';
  if (rows[0].type !== 'epic') return 'The selected issue is not an epic';
  if (Number(rows[0].project_id) !== Number(projectId)) return 'The epic must be in the same project';
  return null;
}

// List issues of a project, with optional filters.
router.get('/projects/:projectId/issues', async (req, res) => {
  const { search, status, type, priority, assignee, epic } = req.query;
  const where = ['i.project_id = ?'];
  const values = [req.params.projectId];

  if (search) {
    where.push("(i.title LIKE ? OR i.description LIKE ? OR CONCAT(p.project_key, '-', i.number) = ?)");
    values.push(`%${search}%`, `%${search}%`, String(search).toUpperCase());
  }
  if (status) { where.push('i.status = ?'); values.push(status); }
  if (type) { where.push('i.type = ?'); values.push(type); }
  if (priority) { where.push('i.priority = ?'); values.push(priority); }
  if (assignee === 'unassigned') where.push('i.assignee_id IS NULL');
  else if (assignee === 'me') { where.push('i.assignee_id = ?'); values.push(req.user.id); }
  else if (assignee) { where.push('i.assignee_id = ?'); values.push(assignee); }
  if (epic === 'none') where.push("i.epic_id IS NULL AND i.type <> 'epic'");
  else if (epic) { where.push('i.epic_id = ?'); values.push(epic); }

  const [rows] = await getPool().query(
    `${ISSUE_SELECT} WHERE ${where.join(' AND ')} ORDER BY i.position ASC, i.id DESC`,
    values
  );
  res.json(rows.map(withPerm(req.user)));
});

// Issues assigned to the current user across all projects.
router.get('/issues/mine', async (req, res) => {
  const [rows] = await getPool().query(
    `${ISSUE_SELECT} WHERE i.assignee_id = ? AND i.status <> 'done' ORDER BY FIELD(i.priority,'highest','high','medium','low','lowest'), i.updated_at DESC`,
    [req.user.id]
  );
  res.json(rows.map(withPerm(req.user)));
});

// Managers, and the Team Lead leading this project, create (and assign) issues.
router.post('/projects/:projectId/issues', async (req, res) => {
  const body = req.body || {};
  const errors = validate(body, { partial: false });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const db = getPool();
  const epicId = body.type === 'epic' ? null : body.epic_id || null;
  const epicError = await checkEpic(db, epicId, req.params.projectId);
  if (epicError) return res.status(400).json({ error: epicError });

  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [proj] = await conn.query('SELECT id, lead_id FROM projects WHERE id = ? FOR UPDATE', [req.params.projectId]);
    if (!proj.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Project not found' });
    }
    if (!canManageProject(req.user, proj[0].lead_id)) {
      await conn.rollback();
      return res.status(403).json({ error: NO_MANAGE });
    }
    await conn.query('UPDATE projects SET issue_counter = issue_counter + 1 WHERE id = ?', [req.params.projectId]);
    const [[{ issue_counter: number }]] = await conn.query('SELECT issue_counter FROM projects WHERE id = ?', [req.params.projectId]);
    const status = body.status || 'todo';
    const [[{ maxPos }]] = await conn.query(
      'SELECT COALESCE(MAX(position), -1) AS maxPos FROM issues WHERE project_id = ? AND status = ?',
      [req.params.projectId, status]
    );
    const [result] = await conn.query(
      `INSERT INTO issues (project_id, epic_id, number, title, description, type, status, priority, assignee_id, reporter_id, position, due_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        req.params.projectId, epicId, number, body.title.trim(), body.description || null,
        body.type || 'task', status, body.priority || 'medium',
        body.assignee_id || null, req.user.id, maxPos + 1, body.due_date || null,
      ]
    );
    await conn.commit();
    res.status(201).json(withPerm(req.user)(await fetchIssue(db, result.insertId)));
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
});

router.get('/issues/:id', async (req, res) => {
  const db = getPool();
  const issue = await fetchIssue(db, req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  const [comments] = await db.query(
    `SELECT c.id, c.body, c.created_at, c.user_id, u.name AS user_name
     FROM comments c LEFT JOIN users u ON u.id = c.user_id
     WHERE c.issue_id = ? ORDER BY c.created_at ASC, c.id ASC`,
    [req.params.id]
  );
  let children = [];
  if (issue.type === 'epic') {
    const [rows] = await db.query(
      `${ISSUE_SELECT} WHERE i.epic_id = ?
       ORDER BY FIELD(i.status, 'in_progress', 'in_review', 'todo', 'done'), i.number`,
      [issue.id]
    );
    children = rows.map(withPerm(req.user));
  }
  res.json({ ...withPerm(req.user)(issue), comments, children });
});

router.patch('/issues/:id', async (req, res) => {
  const body = req.body || {};
  const errors = validate(body, { partial: true });
  if (errors.length) return res.status(400).json({ error: errors.join(', ') });

  const db = getPool();
  const existing = await fetchIssue(db, req.params.id);
  if (!existing) return res.status(404).json({ error: 'Issue not found' });
  if (!canEditIssue(req.user, existing)) return res.status(403).json({ error: NO_EDIT });

  // Assigning work is reserved for Managers and the project's Team Lead.
  const newAssignee = body.assignee_id === undefined ? undefined : body.assignee_id || null;
  if (newAssignee !== undefined && newAssignee !== existing.assignee_id && !canManageProject(req.user, existing.project_lead_id)) {
    return res.status(403).json({ error: 'Only a Manager or the project lead can change the assignee' });
  }

  // Epics cannot be nested: an epic never has an epic of its own.
  const newType = body.type ?? existing.type;
  if (newType === 'epic') {
    if (existing.epic_id || body.epic_id) body.epic_id = null;
  } else if (body.epic_id) {
    const epicError = await checkEpic(db, body.epic_id, existing.project_id, existing.id);
    if (epicError) return res.status(400).json({ error: epicError });
  }

  const allowed = ['title', 'description', 'type', 'status', 'priority', 'assignee_id', 'due_date', 'epic_id'];
  const fields = [];
  const values = [];
  for (const f of allowed) {
    if (body[f] === undefined) continue;
    let v = body[f];
    if (f === 'title') v = String(v).trim();
    if (['assignee_id', 'due_date', 'description', 'epic_id'].includes(f) && !v) v = null;
    fields.push(`${f} = ?`);
    values.push(v);
  }
  if (fields.length) {
    await db.query(`UPDATE issues SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
  }
  // An epic changed into another type no longer groups issues.
  if (existing.type === 'epic' && newType !== 'epic') {
    await db.query('UPDATE issues SET epic_id = NULL WHERE epic_id = ?', [existing.id]);
  }
  const issue = await fetchIssue(db, req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  res.json(withPerm(req.user)(issue));
});

// Move an issue on the board: change status and/or position within a column.
router.patch('/issues/:id/move', async (req, res) => {
  const { status, position } = req.body || {};
  if (!STATUSES.includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const db = getPool();
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const [rows] = await conn.query(
      `SELECT i.id, i.project_id, i.assignee_id, p.lead_id AS project_lead_id
       FROM issues i JOIN projects p ON p.id = i.project_id WHERE i.id = ? FOR UPDATE`,
      [req.params.id]
    );
    if (!rows.length) {
      await conn.rollback();
      return res.status(404).json({ error: 'Issue not found' });
    }
    if (!canEditIssue(req.user, rows[0])) {
      await conn.rollback();
      return res.status(403).json({ error: NO_EDIT });
    }
    const { project_id } = rows[0];
    const [column] = await conn.query(
      'SELECT id FROM issues WHERE project_id = ? AND status = ? AND id <> ? ORDER BY position ASC, id DESC',
      [project_id, status, req.params.id]
    );
    const ids = column.map((r) => r.id);
    const idx = Math.max(0, Math.min(Number.isInteger(position) ? position : ids.length, ids.length));
    ids.splice(idx, 0, Number(req.params.id));

    await conn.query('UPDATE issues SET status = ? WHERE id = ?', [status, req.params.id]);
    for (let i = 0; i < ids.length; i++) {
      await conn.query('UPDATE issues SET position = ? WHERE id = ?', [i, ids[i]]);
    }
    await conn.commit();
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
  res.json(withPerm(req.user)(await fetchIssue(db, req.params.id)));
});

router.delete('/issues/:id', async (req, res) => {
  const db = getPool();
  const issue = await fetchIssue(db, req.params.id);
  if (!issue) return res.status(404).json({ error: 'Issue not found' });
  if (!canManageProject(req.user, issue.project_lead_id)) return res.status(403).json({ error: NO_MANAGE });
  await db.query('DELETE FROM issues WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

router.post('/issues/:id/comments', async (req, res) => {
  const text = String(req.body?.body || '').trim();
  if (!text) return res.status(400).json({ error: 'Comment cannot be empty' });
  const db = getPool();
  const [issue] = await db.query('SELECT id FROM issues WHERE id = ?', [req.params.id]);
  if (!issue.length) return res.status(404).json({ error: 'Issue not found' });
  const [result] = await db.query(
    'INSERT INTO comments (issue_id, user_id, body) VALUES (?, ?, ?)',
    [req.params.id, req.user.id, text]
  );
  const [rows] = await db.query(
    `SELECT c.id, c.body, c.created_at, c.user_id, u.name AS user_name
     FROM comments c LEFT JOIN users u ON u.id = c.user_id WHERE c.id = ?`,
    [result.insertId]
  );
  res.status(201).json(rows[0]);
});

router.delete('/comments/:id', async (req, res) => {
  const db = getPool();
  const [rows] = await db.query('SELECT user_id FROM comments WHERE id = ?', [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Comment not found' });
  if (rows[0].user_id !== req.user.id) return res.status(403).json({ error: 'You can only delete your own comments' });
  await db.query('DELETE FROM comments WHERE id = ?', [req.params.id]);
  res.status(204).end();
});

module.exports = router;
