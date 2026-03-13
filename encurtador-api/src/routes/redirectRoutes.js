const express = require('express');
const { redirectBySlug } = require('../controllers/redirectController');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.get('/r/:slug', asyncHandler(redirectBySlug));
router.get('/:slug', asyncHandler(redirectBySlug));

module.exports = router;
