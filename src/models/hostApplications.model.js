const { query } = require('../db/pool');

async function createHostApplication({
  userId,
  offeringType,
  spaceTypes = [],
  categories = [],
  capacity,
  notes = '',
}) {
  const { rows } = await query(
    `INSERT INTO host_applications (
       user_id, offering_type, space_types, categories, capacity, notes
     )
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING *`,
    [userId, offeringType, spaceTypes, categories, capacity, notes]
  );

  return rows[0];
}

async function findPendingByUserId(userId) {
  const { rows } = await query(
    `SELECT *
     FROM host_applications
     WHERE user_id = $1 AND status = 'pending'
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function getLatestByUserId(userId) {
  const { rows } = await query(
    `SELECT *
     FROM host_applications
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] || null;
}

async function listByStatus(status = 'pending') {
  const { rows } = await query(
    `SELECT *
     FROM host_applications
     WHERE status = $1
     ORDER BY created_at ASC`,
    [status]
  );
  return rows;
}

async function getById(id) {
  const { rows } = await query(`SELECT * FROM host_applications WHERE id = $1`, [id]);
  return rows[0] || null;
}

async function reviewApplication({ id, status, reviewedBy, reviewNotes = '' }) {
  const { rows } = await query(
    `UPDATE host_applications
     SET status = $1,
         reviewed_by = $2,
         reviewed_at = NOW(),
         review_notes = $3,
         updated_at = NOW()
     WHERE id = $4
     RETURNING *`,
    [status, reviewedBy, reviewNotes, id]
  );
  return rows[0] || null;
}

module.exports = {
  createHostApplication,
  findPendingByUserId,
  getLatestByUserId,
  listByStatus,
  getById,
  reviewApplication,
};
