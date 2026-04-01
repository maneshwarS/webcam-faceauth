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
function registerFace(req, res) {
  const { userId } = req.user;
  const { descriptor } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT id FROM users WHERE id = ?').get(userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  const descriptorJson = JSON.stringify(descriptor);
  db.prepare(
    "UPDATE users SET face_descriptor = ?, face_registered_at = datetime('now') WHERE id = ?"
  ).run(descriptorJson, userId);

  return res.json({ success: true, message: 'Face registered successfully' });
}

/**
 * POST /api/face/verify
 * Requires: Bearer temp token (from password sign-in)
 * Body: { descriptor: number[128] }
 * Completes 2FA and issues full tokens
 */
function verifyFace(req, res) {
  const { userId, rememberDevice } = req.user;
  const { descriptor } = req.body;

  const db = getDb();
  const user = db.prepare('SELECT id, name, email, face_descriptor FROM users WHERE id = ?').get(userId);
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

  const accessToken = issueAccessToken({ userId: user.id, email: user.email });
  const refreshToken = issueRefreshToken({ userId: user.id }, rememberDevice);
  const expiry = getRefreshExpiry(rememberDevice);
  const tokenHash = hashToken(refreshToken);
  const deviceHint = req.headers['user-agent'] ? hashToken(req.headers['user-agent']).slice(0, 16) : null;

  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)'
  ).run(user.id, tokenHash, expiry.toISOString(), deviceHint);

  setRefreshCookie(res, refreshToken, rememberDevice);
  return res.json({
    accessToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

/**
 * POST /api/face/login
 * No auth required — identifies user by face
 * Body: { descriptor: number[128], rememberDevice?: bool }
 */
function faceLogin(req, res) {
  const { descriptor, rememberDevice } = req.body;

  const db = getDb();
  const users = db.prepare('SELECT id, name, email, face_descriptor FROM users WHERE face_descriptor IS NOT NULL').all();

  if (users.length === 0) {
    return res.status(401).json({ matched: false, error: 'No registered faces found' });
  }

  const { matched, user, distance } = findBestMatch(descriptor, users);
  if (!matched) {
    return res.status(401).json({ matched: false, error: 'Face not recognized', distance });
  }

  const accessToken = issueAccessToken({ userId: user.id, email: user.email });
  const refreshToken = issueRefreshToken({ userId: user.id }, rememberDevice);
  const expiry = getRefreshExpiry(rememberDevice);
  const tokenHash = hashToken(refreshToken);
  const deviceHint = req.headers['user-agent'] ? hashToken(req.headers['user-agent']).slice(0, 16) : null;

  db.prepare(
    'INSERT INTO refresh_tokens (user_id, token_hash, expires_at, device_hint) VALUES (?, ?, ?, ?)'
  ).run(user.id, tokenHash, expiry.toISOString(), deviceHint);

  setRefreshCookie(res, refreshToken, rememberDevice);
  return res.json({
    matched: true,
    accessToken,
    user: { id: user.id, name: user.name, email: user.email },
  });
}

module.exports = { registerFace, verifyFace, faceLogin };
