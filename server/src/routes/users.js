const express = require('express');
const { getPool } = require('../db');

const router = express.Router();

// Lightweight list of active people, used for assignee / lead pickers.
// Full employee records live under /api/employees.
router.get('/', async (req, res) => {
  const [rows] = await getPool().query(
    "SELECT id, name, email, role, team_id FROM users WHERE status = 'active' ORDER BY name"
  );
  res.json(rows);
});

module.exports = router;
