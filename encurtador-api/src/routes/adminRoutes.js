const express = require('express');
const { listUsers, createUser, listAllLinks, deleteLink } = require('../controllers/adminController');
const { authMiddleware, requireAdmin } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.use(authMiddleware, requireAdmin);

router.get('/users', asyncHandler(listUsers));
router.post('/users', asyncHandler(createUser));
router.get('/links', asyncHandler(listAllLinks));
router.delete('/links/:id', asyncHandler(deleteLink));

module.exports = router;
