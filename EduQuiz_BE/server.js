require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { migrateGoogleUsers } = require('./lib/migrateGoogleUsers');

const app = express();
const PORT = process.env.PORT || 3001;

migrateGoogleUsers();

function buildAllowedOrigins() {
  const rawOrigins = [
    process.env.FRONTEND_URL,
    process.env.FRONTEND_ORIGIN,
    process.env.CORS_ORIGINS,
  ].filter(Boolean);

  return rawOrigins
    .flatMap((value) => value.split(','))
    .map((value) => value.trim())
    .map((value) => value.replace(/\/+$/, ''))
    .filter(Boolean);
}

const allowedOrigins = buildAllowedOrigins();

app.disable('x-powered-by');

app.use(cors({
  origin(origin, callback) {
    const normalizedOrigin = origin ? origin.replace(/\/+$/, '') : origin;

    if (!normalizedOrigin || allowedOrigins.length === 0 || allowedOrigins.includes(normalizedOrigin)) {
      callback(null, true);
      return;
    }

    callback(new Error('Origin is not allowed by CORS'));
  },
  credentials: true,
}));
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));

app.use((req, res, next) => {
  res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-site');
  next();
});

app.use('/api/auth', require('./routes/auth'));
app.use('/api/exams', require('./routes/exams'));
app.use('/api/attempts', require('./routes/attempts'));
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use((req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err, req, res, next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`EduQuiz Backend running on http://localhost:${PORT}`);
  console.log(`API available at http://localhost:${PORT}/api`);
});
