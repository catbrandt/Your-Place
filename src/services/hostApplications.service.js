const { z } = require('zod');
const ApiError = require('../utils/ApiError');
const model = require('../models/hostApplications.model');
const { pool } = require('../db/pool');
const { findUserById } = require('../models/users.model');

// Params
const idParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

// User submit schema (maps to wireframe)
const createHostApplicationSchema = z.object({
  offeringType: z.enum(['space', 'event', 'both']),
  spaceTypes: z.array(z.string().min(1)).optional().default([]),
  categories: z.array(z.string().min(1)).min(1),
  capacity: z.coerce.number().int().positive(),
  notes: z.string().max(2000).optional().default(''),
});

// Admin list schema
const listQuerySchema = z.object({
  status: z.enum(['pending', 'approved', 'rejected']).optional().default('pending'),
});

// Admin review schema
const reviewSchema = z.object({
  status: z.enum(['approved', 'rejected']),
  reviewNotes: z.string().max(2000).optional().default(''),
});

async function submitApplication(user, payload) {
  if (!user?.id) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');

  // Optional but sensible: hosts/admins don't need to apply
  if (user.role === 'host') {
    throw new ApiError(409, 'CONFLICT', 'You are already a host');
  }
  if (user.role === 'admin') {
    throw new ApiError(409, 'CONFLICT', 'Admins do not need host applications');
  }

  const pending = await model.findPendingByUserId(user.id);
  if (pending) {
    throw new ApiError(409, 'CONFLICT', 'You already have a pending host application');
  }

  return model.createHostApplication({
    userId: user.id,
    offeringType: payload.offeringType,
    spaceTypes: payload.spaceTypes,
    categories: payload.categories,
    capacity: payload.capacity,
    notes: payload.notes,
  });
}

async function getMyLatest(user) {
  if (!user?.id) throw new ApiError(401, 'UNAUTHORIZED', 'Not authenticated');

  const latest = await model.getLatestByUserId(user.id);
  if (!latest) throw new ApiError(404, 'NOT_FOUND', 'No host application found');
  return latest;
}

async function adminList(user, query) {
  if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin only');
  return model.listByStatus(query.status);
}

/**
 * Admin reviews an application.
 * If approved -> promote the applicant to host.
 * Uses a DB transaction so role/app status stay in sync.
 */
async function adminReview(user, applicationId, payload) {
  if (user.role !== 'admin') throw new ApiError(403, 'FORBIDDEN', 'Admin only');

  const existing = await model.getById(applicationId);
  if (!existing) throw new ApiError(404, 'NOT_FOUND', 'Host application not found');

  if (existing.status !== 'pending') {
    throw new ApiError(409, 'CONFLICT', 'Application has already been reviewed');
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1) Update application status
    const reviewedRes = await client.query(
      `UPDATE host_applications
       SET status = $1,
           reviewed_by = $2,
           reviewed_at = NOW(),
           review_notes = $3,
           updated_at = NOW()
       WHERE id = $4
       RETURNING *`,
      [payload.status, user.id, payload.reviewNotes ?? '', applicationId]
    );
    const reviewed = reviewedRes.rows[0];

    // 2) If approved, promote user to host (only if still user)
    if (payload.status === 'approved') {
      const applicant = await findUserById(existing.user_id);
      if (applicant && applicant.role === 'user') {
        await client.query(
          `UPDATE users
           SET role = 'host', updated_at = NOW()
           WHERE id = $1`,
          [existing.user_id]
        );
      }
    }

    await client.query('COMMIT');
    return reviewed;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}

module.exports = {
  idParamSchema,
  createHostApplicationSchema,
  listQuerySchema,
  reviewSchema,
  submitApplication,
  getMyLatest,
  adminList,
  adminReview,
};
