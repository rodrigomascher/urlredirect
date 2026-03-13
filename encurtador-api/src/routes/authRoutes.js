const express = require('express');
const { login, register } = require('../controllers/authController');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authRateLimit, asyncHandler(register));
router.post('/login', authRateLimit, asyncHandler(login));

module.exports = router;
