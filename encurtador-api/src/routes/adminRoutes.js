const express = require('express');
const { listUsers, createUser } = require('../controllers/adminController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/users', listUsers);
router.post('/users', createUser);

module.exports = router;
