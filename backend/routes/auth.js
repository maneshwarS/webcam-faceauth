const express = require('express');
const router = express.Router();
const { signup, signin, refresh, signout } = require('../controllers/authController');
const { requireFields } = require('../middleware/validateRequest');
const { authenticate } = require('../middleware/authenticate');

router.post('/signup', requireFields('name', 'email', 'password'), signup);
router.post('/signin', requireFields('email', 'password'), signin);
router.post('/refresh', refresh);
router.post('/signout', authenticate, signout);

module.exports = router;
