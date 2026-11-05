require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initDb } = require('./db');
const { requireAuth } = require('./middleware/auth');

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ ok: true }));
app.use('/api/auth', require('./routes/auth'));
app.use('/api/users', requireAuth, require('./routes/users'));
app.use('/api/employees', requireAuth, require('./routes/employees'));
app.use('/api/teams', requireAuth, require('./routes/teams'));
app.use('/api/projects', requireAuth, require('./routes/projects'));
app.use('/api', requireAuth, require('./routes/issues'));

app.use('/api', (req, res) => res.status(404).json({ error: 'Not found' }));

// Express 5 forwards rejected async handlers here automatically.
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

const PORT = Number(process.env.PORT || 5000);

if (!process.env.JWT_SECRET) {
  console.error('JWT_SECRET is not set. Copy .env.example to .env and fill it in.');
  process.exit(1);
}

initDb()
  .then(() => {
    app.listen(PORT, () => console.log(`API server running on http://localhost:${PORT}`));
  })
  .catch((err) => {
    console.error('Failed to connect to MySQL. Check DB_* values in server/.env');
    console.error(err.message);
    process.exit(1);
  });
