const express = require('express');
const { getPool } = require('../db');
const { requireAdmin, canManageProject } = require('../middleware/auth');

const router = express.Router();

// can_manage: whether the current user may create/assign/delete issues in this project.
const withPerm = (user) => (p) => p && { ...p, can_manage: canManageProject(user, p.lead_id) };

async function checkLead(db, leadId) {
  if (!leadId) return null;
  const [rows] = await db.query('SELECT role, status FROM users WHERE id = ?', [leadId]);
  if (!rows.length) return 'Project lead not found';
  if (rows[0].status !== 'active') return 'Project lead must be an active employee';
  if (!['admin', 'team_lead'].includes(rows[0].role)) return 'Project lead must be a Manager or Team Lead';
  return null;
}

const PROJECT_SELECT = `
  SELECT p.id, p.project_key AS \`key\`, p.name, p.description, p.lead_id, p.created_at,
         u.name AS lead_name,
         (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id) AS issue_count,
         (SELECT COUNT(*) FROM issues i WHERE i.project_id = p.id AND i.status <> 'done') AS open_count
  FROM projects p
  LEFT JOIN users u ON u.id = p.lead_id`;

router.get('/', async (req, res) => {
  const [rows] = await getPool().query(`${PROJECT_SELECT} ORDER BY p.created_at DESC`);
  res.json(rows.map(withPerm(req.user)));
});

router.get('/:id', async (req, res) => {
  const [rows] = await getPool().query(`${PROJECT_SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Project not found' });
  res.json(withPerm(req.user)(rows[0]));
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, key, description } = req.body || {};
  const projectKey = String(key || '').trim().toUpperCase();
  if (!name?.trim()) return res.status(400).json({ error: 'Project name is required' });
  if (!/^[A-Z][A-Z0-9]{1,9}$/.test(projectKey)) {
    return res.status(400).json({ error: 'Key must be 2-10 letters/digits and start with a letter' });
  }
  const db = getPool();
  const [exists] = await db.query('SELECT id FROM projects WHERE project_key = ?', [projectKey]);
  if (exists.length) return res.status(409).json({ error: `Project key ${projectKey} is already in use` });

  const [result] = await db.query(
    'INSERT INTO projects (project_key, name, description, lead_id) VALUES (?, ?, ?, ?)',
    [projectKey, name.trim(), description || null, req.user.id]
  );
  const [rows] = await db.query(`${PROJECT_SELECT} WHERE p.id = ?`, [result.insertId]);
  res.status(201).json(withPerm(req.user)(rows[0]));
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, description, lead_id } = req.body || {};
  const db = getPool();
  const fields = [];
  const values = [];
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: 'Project name cannot be empty' });
    fields.push('name = ?'); values.push(String(name).trim());
  }
  if (description !== undefined) { fields.push('description = ?'); values.push(description || null); }
  if (lead_id !== undefined) {
    const leadError = await checkLead(db, lead_id);
    if (leadError) return res.status(400).json({ error: leadError });
    fields.push('lead_id = ?');
    values.push(lead_id || null);
  }
  if (fields.length) {
    const [r] = await db.query(`UPDATE projects SET ${fields.join(', ')} WHERE id = ?`, [...values, req.params.id]);
    if (!r.affectedRows) return res.status(404).json({ error: 'Project not found' });
  }
  const [rows] = await db.query(`${PROJECT_SELECT} WHERE p.id = ?`, [req.params.id]);
  if (!rows.length) return res.status(404).json({ error: 'Project not found' });
  res.json(withPerm(req.user)(rows[0]));
});

router.delete('/:id', requireAdmin, async (req, res) => {
  const [r] = await getPool().query('DELETE FROM projects WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Project not found' });
  res.status(204).end();
});

module.exports = router;
