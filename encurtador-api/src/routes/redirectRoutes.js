const express = require('express');
const { redirectBySlug } = require('../controllers/redirectController');

const router = express.Router();

router.get('/r/:slug', redirectBySlug);
router.get('/:slug', redirectBySlug);

module.exports = router;
