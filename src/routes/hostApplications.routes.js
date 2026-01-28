const express = require('express');

const requireAuth = require('../middleware/requireAuth');
const requireRole = require('../middleware/requireRole');
const validate = require('../middleware/validate');

const controller = require('../controllers/hostApplications.controller');
const {
  idParamSchema,
  createHostApplicationSchema,
  listQuerySchema,
  reviewSchema,
} = require('../services/hostApplications.service');

const router = express.Router();

// User endpoints
router.post('/', requireAuth, validate(createHostApplicationSchema), controller.createMyApplication);
router.get('/me', requireAuth, controller.getMyApplication);

// Admin endpoints
router.get(
  '/',
  requireAuth,
  requireRole('admin'),
  validate(listQuerySchema, 'query'),
  controller.listApplications
);

router.patch(
  '/:id',
  requireAuth,
  requireRole('admin'),
  validate(idParamSchema, 'params'),
  validate(reviewSchema),
  controller.reviewApplication
);

module.exports = router;