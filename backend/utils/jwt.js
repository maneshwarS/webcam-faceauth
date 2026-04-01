const jwt = require('jsonwebtoken');
require('dotenv').config();

const ACCESS_SECRET = process.env.JWT_SECRET;
const REFRESH_SECRET = process.env.JWT_REFRESH_SECRET;

function issueAccessToken(payload) {
  return jwt.sign(payload, ACCESS_SECRET, { expiresIn: '15m' });
}

function issueTempToken(payload) {
  // Short-lived token used to gate the face-verification step after password success
  return jwt.sign({ ...payload, type: 'temp_face_verify' }, ACCESS_SECRET, { expiresIn: '60s' });
}

function issueRefreshToken(payload, rememberDevice = false) {
  const expiresIn = rememberDevice ? '30d' : '7d';
  return jwt.sign({ ...payload, type: 'refresh' }, REFRESH_SECRET, { expiresIn });
}

function verifyAccessToken(token) {
  return jwt.verify(token, ACCESS_SECRET);
}

function verifyRefreshToken(token) {
  return jwt.verify(token, REFRESH_SECRET);
}

function getRefreshExpiry(rememberDevice = false) {
  const days = rememberDevice ? 30 : 7;
  return new Date(Date.now() + days * 24 * 60 * 60 * 1000);
}

module.exports = {
  issueAccessToken,
  issueTempToken,
  issueRefreshToken,
  verifyAccessToken,
  verifyRefreshToken,
  getRefreshExpiry,
};
