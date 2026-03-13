const express = require('express');
const { login, register, changePassword } = require('../controllers/authController');
const { asyncHandler } = require('../middleware/asyncHandler');
const { authMiddleware, requireUser } = require('../middleware/authMiddleware');
const { authRateLimit } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authRateLimit, asyncHandler(register));
router.post('/login', authRateLimit, asyncHandler(login));
router.patch('/change-password', authMiddleware, requireUser, asyncHandler(changePassword));

module.exports = router;
