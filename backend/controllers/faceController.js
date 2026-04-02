const { getDb } = require('../db/database');
const { verifyDescriptor, findBestMatch } = require('../utils/faceMatch');
const { issueAccessToken, issueRefreshToken, getRefreshExpiry } = require('../utils/jwt');
const { hashToken } = require('../utils/crypto');

function setRefreshCookie(res, token, rememberDevice) {
  const maxAge = (rememberDevice ? 30 : 7) * 24 * 60 * 60 * 1000;
  res.cookie('refreshToken', token, {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
    maxAge,
  });
}

/**
 * POST /api/face/register
 * Requires: Bearer access token (from signup)
 * Body: { descriptor: number[128] }
 */
async function registerFace(req, res) {
  const { userId } = req.user;
  const { descriptor } = req.body;

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT id FROM users WHERE id = ?', args: [userId] });
  if (result.rows.length === 0) {
    return res.status(404).json({ error: 'User not found' });
  }

  const descriptorJson = JSON.stringify(descriptor);
  await db.execute({
    sql: "UPDATE users SET face_descriptor = ?, face_registered_at = datetime('now') WHERE id = ?",
    args: [descriptorJson, userId],
  });

  return res.json({ success: true, message: 'Face registered successfully' });
}

/**
 * POST /api/face/verify
 * Requires: Bearer temp token (from password sign-in)
 * Body: { descriptor: number[128] }
 * Completes 2FA and issues full tokens
 */
async function verifyFace(req, res) {
  const { userId, rememberDevice } = req.user;
  const { descriptor } = req.body;

  const db = getDb();
  const result = await db.execute({ sql: 'SELECT id, name, email, face_descriptor FROM users WHERE id = ?', args: [userId] });
  const user = result.rows[0];
  if (!user || !user.face_descriptor) {
    return res.status(400).json({ error: 'No face registered for this user' });
  }

  let storedDescriptor;
  try {
    storedDescriptor = JSON.parse(user.face_descriptor);
  } catch {
    return res.status(500).json({ error: 'Stored face data is corrupted' });
  }

  const { matched, distance } = verifyDescriptor(descriptor, storedDescriptor);
  if (!matched) {
    return res.status(401).json({ error: 'Face verification failed', distance });
  }

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
  return res.json({
    accessToken,
    user: { id: Number(user.id), name: user.name, email: user.email },
  });
}

/**
 * POST /api/face/login
 * No auth required — identifies user by face
 * Body: { descriptor: number[128], rememberDevice?: bool }
 */
async function faceLogin(req, res) {
  const { descriptor, rememberDevice } = req.body;

  const db = getDb();
  const result = await db.execute('SELECT id, name, email, face_descriptor FROM users WHERE face_descriptor IS NOT NULL');
  const users = result.rows;

  if (users.length === 0) {
    return res.status(401).json({ matched: false, error: 'No registered faces found' });
  }

  const { matched, user, distance } = findBestMatch(descriptor, users);
  if (!matched) {
    return res.status(401).json({ matched: false, error: 'Face not recognized', distance });
  }

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
  return res.json({
    matched: true,
    accessToken,
    user: { id: Number(user.id), name: user.name, email: user.email },
  });
}

module.exports = { registerFace, verifyFace, faceLogin };
