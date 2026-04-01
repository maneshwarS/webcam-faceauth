const { getDb } = require('../db/database');
const { hashPassword, verifyPassword, hashToken } = require('../utils/crypto');
const { issueAccessToken, issueTempToken, issueRefreshToken, verifyRefreshToken, getRefreshExpiry } = require('../utils/jwt');

function setRefreshCookie(res, token, rememberDevice) {
  const maxAge = (rememberDevice ? 30 : 7) * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  });
}

async function signup(req, res) {
  const { name, email, password, descriptor } = req.body;

  // Basic email format check
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ error: 'Invalid email format' });
  }
  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' });
  }

  // descriptor is required — we never create a user without a face
  if (!Array.isArray(descriptor) || descriptor.length !== 128) {
    return res.status(400).json({ error: 'Face descriptor is required to complete sign-up' });
  }

  const db = getDb();
  const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email.toLowerCase());
  if (existing) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hashed = await hashPassword(password);
  const descriptorJson = JSON.stringify(descriptor);

  // Insert credentials and face descriptor atomically in one statement
  const result = db.prepare(
    "INSERT INTO users (name, email, password, face_descriptor, face_registered_at) VALUES (?, ?, ?, ?, datetime('now'))"
  ).run(name.trim(), email.toLowerCase(), hashed, descriptorJson);

  const userId = result.lastInsertRowid;
  const user = { id: userId, name: name.trim(), email: email.toLowerCase() };
  const accessToken = issueAccessToken({ userId, email: email.toLowerCase() });

  return res.status(201).json({ accessToken, user });
}

async function signin(req, res) {
  const { email, password, rememberDevice } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email.toLowerCase());
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.face_descriptor) {
    // Face not registered — issue full access token (skip 2FA for accounts without face)
    const accessToken = issueAccessToken({ userId: user.id, email: user.email });
    const refreshToken = issueRefreshToken({ userId: user.id }, rememberDevice);
    const expiry = getRefreshExpiry(rememberDevice);
    const tokenHash = hashToken(refreshToken);
    const deviceHint = req.headers['user-agent'] ? hashToken(req.headers['user-agent']).slice(0, 16) : null;

    db.prepare(
      'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)'
    ).run(user.id, tokenHash, expiry.toISOString(), deviceHint);

    setRefreshCookie(res, refreshToken, rememberDevice);
    return res.json({ accessToken, user: { id: user.id, name: user.name, email: user.email }, pendingFace: false });
  }

  // Face registered — issue temp token; client must complete face verification
  const tempToken = issueTempToken({ userId: user.id, email: user.email, rememberDevice: !!rememberDevice });
  return res.json({ tempToken, pendingFace: true, user: { id: user.id, name: user.name, email: user.email } });
}

async function refresh(req, res) {
  const token = req.cookies?.refreshToken;
  if (!token) {
    return res.status(401).json({ error: 'No refresh token' });
  }

  let payload;
  try {
    payload = verifyRefreshToken(token);
  } catch {
    return res.status(401).json({ error: 'Invalid or expired refresh token' });
  }

  const db = getDb();
  const tokenHash = hashToken(token);
  const stored = db.prepare(
    'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ?'
  ).get(tokenHash, payload.userId);

  if (!stored || new Date(stored.expires_at) < new Date()) {
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Refresh token revoked or expired' });
  }

  const user = db.prepare('SELECT id, name, email FROM users WHERE id = ?').get(payload.userId);
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate: delete old, issue new
  db.prepare('DELETE FROM refresh_tokens WHERE id = ?').run(stored.id);

  const rememberDevice = stored.expires_at && (new Date(stored.expires_at) - Date.now()) > 7 * 24 * 60 * 60 * 1000;
  const newRefresh = issueRefreshToken({ userId: user.id }, rememberDevice);
  const newExpiry = getRefreshExpiry(rememberDevice);
  const newHash = hashToken(newRefresh);
  const deviceHint = stored.device_hint;

  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)'
  ).run(user.id, newHash, newExpiry.toISOString(), deviceHint);

  setRefreshCookie(res, newRefresh, rememberDevice);
  const accessToken = issueAccessToken({ userId: user.id, email: user.email });
  return res.json({ accessToken, user });
}

function signout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    const db = getDb();
    const tokenHash = hashToken(token);
    db.prepare('DELETE FROM refresh_tokens WHERE token_hash = ?').run(tokenHash);
  }
  res.clearCookie('refreshToken');
  return res.json({ success: true });
}

module.exports = { signup, signin, refresh, signout };
