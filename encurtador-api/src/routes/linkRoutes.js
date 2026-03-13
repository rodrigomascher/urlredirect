const express = require('express');
const {
  createLink,
  getLast7DaysClicks,
  getSegmentationMetrics,
  getRevisions,
  listLinks,
  updateLinkDestino
} = require('../controllers/linkController');
const { authMiddleware, requireUser } = require('../middleware/authMiddleware');
const { asyncHandler } = require('../middleware/asyncHandler');

const router = express.Router();

router.use(authMiddleware, requireUser);

router.get('/', asyncHandler(listLinks));
router.post('/', asyncHandler(createLink));
router.patch('/:id', asyncHandler(updateLinkDestino));
router.get('/:id/revisoes', asyncHandler(getRevisions));
router.get('/metrics/last-7-days', asyncHandler(getLast7DaysClicks));
router.get('/metrics/segmentation', asyncHandler(getSegmentationMetrics));

module.exports = router;
