const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { getPool, defaultEmployeeCode } = require('../db');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

function signToken(user) {
  return jwt.sign({ id: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

async function userCount() {
  const [[{ total }]] = await getPool().query('SELECT COUNT(*) AS total FROM users');
  return total;
}

// Tells the login page whether the initial Manager account still needs to be created.
router.get('/setup-status', async (req, res) => {
  res.json({ needsSetup: (await userCount()) === 0 });
});

// Self sign-up is only available for the very first account, which becomes a Manager.
// After that, Managers create employee accounts from the Employees page.
router.post('/register', async (req, res) => {
  const { name, email, password } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password) {
    return res.status(400).json({ error: 'Name, email and password are required' });
  }
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });
  if ((await userCount()) > 0) {
    return res.status(403).json({ error: 'Sign-up is closed. Ask a Manager to create your employee account.' });
  }

  const db = getPool();
  const hash = await bcrypt.hash(password, 10);
  const [result] = await db.query(
    "INSERT INTO users (name, email, password_hash, role, designation) VALUES (?, ?, ?, 'admin', 'Manager')",
    [name.trim(), email.trim().toLowerCase(), hash]
  );
  await db.query('UPDATE users SET employee_code = ? WHERE id = ?', [defaultEmployeeCode(result.insertId), result.insertId]);
  const user = { id: result.insertId, name: name.trim(), email: email.trim().toLowerCase(), role: 'admin' };
  res.status(201).json({ token: signToken(user), user });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  if (!email || !password) return res.status(400).json({ error: 'Email and password are required' });

  const [rows] = await getPool().query('SELECT * FROM users WHERE email = ?', [email.trim().toLowerCase()]);
  const row = rows[0];
  if (!row || !(await bcrypt.compare(password, row.password_hash))) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }
  if (row.status !== 'active') {
    return res.status(403).json({ error: 'Your account has been deactivated. Contact your Manager.' });
  }
  const user = { id: row.id, name: row.name, email: row.email, role: row.role, team_id: row.team_id };
  res.json({ token: signToken(user), user });
});

router.get('/me', requireAuth, (req, res) => res.json(req.user));

module.exports = router;
