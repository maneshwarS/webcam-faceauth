const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const COST_FACTOR = 12;

async function hashPassword(plaintext) {
  return bcrypt.hash(plaintext, COST_FACTOR);
}

async function verifyPassword(plaintext, hash) {
  return bcrypt.compare(plaintext, hash);
}

function hashToken(token) {
  return crypto.createHash('sha256').update(token).digest('hex');
}

module.exports = { hashPassword, verifyPassword, hashToken };
