const express = require('express');
const { listUsers, createUser } = require('../controllers/adminController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/users', asyncHandler(listUsers));
router.post('/users', asyncHandler(createUser));

module.exports = router;
