require('dotenv').config();
const express = require('express');
const path = require('path');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const rateLimit = require('express-rate-limit');

const authRoutes = require('./routes/auth');
const faceRoutes = require('./routes/face');

const app = express();
const PORT = process.env.PORT || 3001;
const isProd = process.env.NODE_ENV === 'production';

// Security headers — relaxed CSP in prod so the React app + face-api.js models work
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));

// CORS — in production the frontend is served from the same origin
app.use(cors({
  origin: isProd
    ? true  // same-origin in prod
    : ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
}));

// Body parsing
app.use(express.json({ limit: '50kb' }));
app.use(cookieParser());

// Global rate limit
app.use(rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
}));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/face', faceRoutes);

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

// Admin: list registered users (protected by a secret query param)
app.get('/api/admin/users', async (req, res) => {
  if (req.query.key !== process.env.JWT_SECRET) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const { getDb } = require('./db/database');
  const result = await getDb().execute(
    'SELECT id, name, email, face_registered_at, created_at FROM users'
  );
  res.json({ count: result.rows.length, users: result.rows });
});

// In production, serve the built React frontend from backend
if (isProd) {
  const frontendDist = path.join(__dirname, '..', 'frontend', 'dist');
  app.use(express.static(frontendDist));
  // All non-API routes fall through to React's index.html (client-side routing)
  app.get('*', (req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
}

// 404 (only hits in dev — in prod, the wildcard above catches everything)
app.use((req, res) => res.status(404).json({ error: 'Not found' }));

// Error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

// Initialize database schema, then start server
const { initSchema } = require('./db/database');
initSchema()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Backend running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Failed to initialize database:', err);
    process.exit(1);
  });
