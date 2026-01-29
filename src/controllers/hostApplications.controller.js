const service = require('../services/hostApplications.service');

async function createMyApplication(req, res, next) {
  try {
    const created = await service.submitApplication(req.user, req.body);
    return res.status(201).json({ data: created });
  } catch (err) {
    return next(err);
  }
}

async function getMyApplication(req, res, next) {
  try {
    const app = await service.getMyLatest(req.user);
    return res.json({ data: app });
  } catch (err) {
    return next(err);
  }
}

// Admin
async function listApplications(req, res, next) {
  try {
    const apps = await service.adminList(req.user, req.query);
    return res.json({ data: apps });
  } catch (err) {
    return next(err);
  }
}

async function reviewApplication(req, res, next) {
  try {
    const reviewed = await service.adminReview(req.user, req.params.id, req.body);
    return res.json({ data: reviewed });
  } catch (err) {
    return next(err);
  }
}

module.exports = {
  createMyApplication,
  getMyApplication,
  listApplications,
  reviewApplication,
};
