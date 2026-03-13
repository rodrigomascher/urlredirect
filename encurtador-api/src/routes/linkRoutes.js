const express = require('express');
const {
  createLink,
  getLast7DaysClicks,
  getSegmentationMetrics,
  listLinks,
  updateLinkDestino
} = require('../controllers/linkController');
const { authMiddleware, requireUser } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(authMiddleware, requireUser);

router.get('/', listLinks);
router.post('/', createLink);
router.patch('/:id', updateLinkDestino);
router.get('/metrics/last-7-days', getLast7DaysClicks);
router.get('/metrics/segmentation', getSegmentationMetrics);

module.exports = router;
