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
  const existing = await db.execute({ sql: 'SELECT id FROM users WHERE email = ?', args: [email.toLowerCase()] });
  if (existing.rows.length > 0) {
    return res.status(409).json({ error: 'An account with this email already exists' });
  }

  const hashed = await hashPassword(password);
  const descriptorJson = JSON.stringify(descriptor);

  // Insert credentials and face descriptor atomically in one statement
  const result = await db.execute({
    sql: "INSERT INTO users (name, email, password, face_descriptor, face_registered_at) VALUES (?, ?, ?, ?, datetime('now'))",
    args: [name.trim(), email.toLowerCase(), hashed, descriptorJson],
  });

  const userId = Number(result.lastInsertRowid);
  const user = { id: userId, name: name.trim(), email: email.toLowerCase() };
  const accessToken = issueAccessToken({ userId, email: email.toLowerCase() });

  return res.status(201).json({ accessToken, user });
}

async function signin(req, res) {
  const { email, password, rememberDevice } = req.body;

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT * FROM users WHERE email = ?', args: [email.toLowerCase()] });
  const user = result.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  const valid = await verifyPassword(password, user.password);
  if (!valid) {
    return res.status(401).json({ error: 'Invalid email or password' });
  }

  if (!user.face_descriptor) {
    // Face not registered — issue full access token (skip 2FA for accounts without face)
    const accessToken = issueAccessToken({ userId: Number(user.id), email: user.email });
    const refreshToken = issueRefreshToken({ userId: Number(user.id) }, rememberDevice);
    const expiry = getRefreshExpiry(rememberDevice);
    const tokenHash = hashToken(refreshToken);
    const deviceHint = req.headers['user-agent'] ? hashToken(req.headers['user-agent']).slice(0, 16) : null;

    await db.execute({
      sql: 'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)',
      args: [Number(user.id), tokenHash, expiry.toISOString(), deviceHint],
    });

    setRefreshCookie(res, refreshToken, rememberDevice);
    return res.json({ accessToken, user: { id: Number(user.id), name: user.name, email: user.email }, pendingFace: false });
  }

  // Face registered — issue temp token; client must complete face verification
  const tempToken = issueTempToken({ userId: Number(user.id), email: user.email, rememberDevice: !!rememberDevice });
  return res.json({ tempToken, pendingFace: true, user: { id: Number(user.id), name: user.name, email: user.email } });
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
  const storedResult = await db.execute({
    sql: 'SELECT * FROM refresh_tokens WHERE token_hash = ? AND user_id = ?',
    args: [tokenHash, payload.userId],
  });
  const stored = storedResult.rows[0];

  if (!stored || new Date(stored.expires_at) < new Date()) {
    res.clearCookie('refreshToken');
    return res.status(401).json({ error: 'Refresh token revoked or expired' });
  }

  const userResult = await db.execute({ sql: 'SELECT id, name, email FROM users WHERE id = ?', args: [payload.userId] });
  const user = userResult.rows[0];
  if (!user) {
    return res.status(401).json({ error: 'User not found' });
  }

  // Rotate: delete old, issue new
  await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE id = ?', args: [Number(stored.id)] });

  const rememberDevice = stored.expires_at && (new Date(stored.expires_at) - Date.now()) > 7 * 24 * 60 * 60 * 1000;
  const newRefresh = issueRefreshToken({ userId: Number(user.id) }, rememberDevice);
  const newExpiry = getRefreshExpiry(rememberDevice);
  const newHash = hashToken(newRefresh);
  const deviceHint = stored.device_hint;

  await db.execute({
    sql: 'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)',
    args: [Number(user.id), newHash, newExpiry.toISOString(), deviceHint],
  });

  setRefreshCookie(res, newRefresh, rememberDevice);
  const accessToken = issueAccessToken({ userId: Number(user.id), email: user.email });
  return res.json({ accessToken, user: { id: Number(user.id), name: user.name, email: user.email } });
}

async function signout(req, res) {
  const token = req.cookies?.refreshToken;
  if (token) {
    const db = getDb();
    const tokenHash = hashToken(token);
    await db.execute({ sql: 'DELETE FROM refresh_tokens WHERE token_hash = ?', args: [tokenHash] });
  }
  res.clearCookie('refreshToken');
  return res.json({ success: true });
}

module.exports = { signup, signin, refresh, signout };
