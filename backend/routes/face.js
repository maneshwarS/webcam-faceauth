const express = require('express');
const router = express.Router();
const rateLimit = require('express-rate-limit');
const { registerFace, verifyFace, faceLogin } = require('../controllers/faceController');
const { authenticate, authenticateTemp } = require('../middleware/authenticate');
const { validateDescriptor } = require('../middleware/validateRequest');

const faceLoginLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many face login attempts. Please wait a minute.' },
});

router.post('/register', authenticate, validateDescriptor, registerFace);
router.post('/verify', authenticateTemp, validateDescriptor, verifyFace);
router.post('/login', faceLoginLimiter, validateDescriptor, faceLogin);

module.exports = router;
