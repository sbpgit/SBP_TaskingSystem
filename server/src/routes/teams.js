const express = require('express');
const { getPool } = require('../db');
const { requireAdmin } = require('../middleware/auth');

const router = express.Router();

const TEAM_SELECT = `
  SELECT t.id, t.name, t.description, t.lead_id, l.name AS lead_name, t.created_at,
         (SELECT COUNT(*) FROM users m WHERE m.team_id = t.id AND m.status = 'active') AS member_count
  FROM teams t
  LEFT JOIN users l ON l.id = t.lead_id`;

async function fetchTeam(db, id) {
  const [rows] = await db.query(`${TEAM_SELECT} WHERE t.id = ?`, [id]);
  return rows[0] || null;
}

// Validates a proposed lead. Returns an error message or null.
async function checkLead(db, leadId) {
  if (!leadId) return null;
  const [rows] = await db.query('SELECT role, status FROM users WHERE id = ?', [leadId]);
  if (!rows.length) return 'Team lead not found';
  if (rows[0].status !== 'active') return 'Team lead must be an active employee';
  if (!['admin', 'team_lead'].includes(rows[0].role)) return 'Team lead must have the Team Lead or Manager role';
  return null;
}

// Makes leadId the lead of teamId and moves them into that team (a person leads at most one team).
async function assignLead(db, teamId, leadId) {
  await db.query('UPDATE teams SET lead_id = NULL WHERE lead_id = ? AND id <> ?', [leadId, teamId]);
  await db.query('UPDATE teams SET lead_id = ? WHERE id = ?', [leadId, teamId]);
  await db.query('UPDATE users SET team_id = ? WHERE id = ?', [teamId, leadId]);
}

router.get('/', async (req, res) => {
  const [rows] = await getPool().query(`${TEAM_SELECT} ORDER BY t.name`);
  res.json(rows);
});

router.get('/:id', async (req, res) => {
  const db = getPool();
  const team = await fetchTeam(db, req.params.id);
  if (!team) return res.status(404).json({ error: 'Team not found' });
  const [members] = await db.query(
    `SELECT id, employee_code, name, email, designation, role, status,
            (SELECT COUNT(*) FROM issues i WHERE i.assignee_id = users.id AND i.status <> 'done') AS open_issues
     FROM users WHERE team_id = ? ORDER BY FIELD(status, 'active', 'inactive'), name`,
    [req.params.id]
  );
  res.json({ ...team, members });
});

router.post('/', requireAdmin, async (req, res) => {
  const { name, description, lead_id } = req.body || {};
  if (!String(name || '').trim()) return res.status(400).json({ error: 'Team name is required' });
  const db = getPool();
  const leadError = await checkLead(db, lead_id);
  if (leadError) return res.status(400).json({ error: leadError });

  let id;
  try {
    const [r] = await db.query('INSERT INTO teams (name, description) VALUES (?, ?)', [String(name).trim(), description || null]);
    id = r.insertId;
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A team with that name already exists' });
    throw err;
  }
  if (lead_id) await assignLead(db, id, Number(lead_id));
  res.status(201).json(await fetchTeam(db, id));
});

router.patch('/:id', requireAdmin, async (req, res) => {
  const { name, description, lead_id } = req.body || {};
  const db = getPool();
  const id = Number(req.params.id);
  if (!(await fetchTeam(db, id))) return res.status(404).json({ error: 'Team not found' });

  const fields = [];
  const values = [];
  if (name !== undefined) {
    if (!String(name).trim()) return res.status(400).json({ error: 'Team name cannot be empty' });
    fields.push('name = ?');
    values.push(String(name).trim());
  }
  if (description !== undefined) {
    fields.push('description = ?');
    values.push(description || null);
  }
  if (fields.length) {
    try {
      await db.query(`UPDATE teams SET ${fields.join(', ')} WHERE id = ?`, [...values, id]);
    } catch (err) {
      if (err.code === 'ER_DUP_ENTRY') return res.status(409).json({ error: 'A team with that name already exists' });
      throw err;
    }
  }
  if (lead_id !== undefined) {
    if (lead_id) {
      const leadError = await checkLead(db, lead_id);
      if (leadError) return res.status(400).json({ error: leadError });
      await assignLead(db, id, Number(lead_id));
    } else {
      await db.query('UPDATE teams SET lead_id = NULL WHERE id = ?', [id]);
    }
  }
  res.json(await fetchTeam(db, id));
});

router.delete('/:id', requireAdmin, async (req, res) => {
  // Members' team_id is cleared by the ON DELETE SET NULL foreign key.
  const [r] = await getPool().query('DELETE FROM teams WHERE id = ?', [req.params.id]);
  if (!r.affectedRows) return res.status(404).json({ error: 'Team not found' });
  res.status(204).end();
});

// Add employees to the team (moving them out of any previous team).
router.post('/:id/members', requireAdmin, async (req, res) => {
  const ids = (req.body?.user_ids || []).map(Number).filter(Boolean);
  if (!ids.length) return res.status(400).json({ error: 'Select at least one employee' });
  const db = getPool();
  const id = Number(req.params.id);
  if (!(await fetchTeam(db, id))) return res.status(404).json({ error: 'Team not found' });

  await db.query('UPDATE users SET team_id = ? WHERE id IN (?)', [id, ids]);
  await db.query('UPDATE teams SET lead_id = NULL WHERE lead_id IN (?) AND id <> ?', [ids, id]);
  res.status(204).end();
});

router.delete('/:id/members/:userId', requireAdmin, async (req, res) => {
  const db = getPool();
  await db.query('UPDATE users SET team_id = NULL WHERE id = ? AND team_id = ?', [req.params.userId, req.params.id]);
  await db.query('UPDATE teams SET lead_id = NULL WHERE id = ? AND lead_id = ?', [req.params.id, req.params.userId]);
  res.status(204).end();
});

module.exports = router;
