const request = require('supertest');
const app = require('../app');
const { query } = require('../db/pool');
const { createToken } = require('../services/auth.service');

describe('Host Applications API', () => {
  const password = 'password123';

  const makeEmail = (prefix = 'ha') =>
    `${prefix}+${Date.now()}-${Math.random().toString(16).slice(2)}@test.com`;

  const authHeader = (user) => ({
    Authorization: `Bearer ${createToken(user)}`,
  });

  const createdUserIds = [];

  afterEach(async () => {
    // clean up any users created here (jest.setup seeds ids 1-3)
    // eslint-disable-next-line no-restricted-syntax
    for (const id of createdUserIds) {
      // eslint-disable-next-line no-await-in-loop
      await query('DELETE FROM users WHERE id = $1', [id]);
    }
    createdUserIds.length = 0;
  });

  test('POST /host-applications creates a pending application (201)', async () => {
    const email = makeEmail('apply');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    const userId = reg.body.user.id;
    createdUserIds.push(userId);

    const res = await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'both',
        spaceTypes: ['private_room', 'workshop_studio'],
        categories: ['movement', 'wellness'],
        capacity: 10,
        notes: 'I want to run weekly sessions',
      });

    expect(res.status).toBe(201);
    expect(res.body.data.user_id).toBe(userId);
    expect(res.body.data.status).toBe('pending');
  });

  test('POST /host-applications returns 409 if pending already exists', async () => {
    const email = makeEmail('dup');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    const userId = reg.body.user.id;
    createdUserIds.push(userId);

    await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'space',
        categories: ['creative'],
        capacity: 5,
      });

    const res2 = await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'space',
        categories: ['creative'],
        capacity: 5,
      });

    expect(res2.status).toBe(409);
    expect(res2.body?.error?.code).toBeTruthy();
  });

  test('GET /host-applications/me returns latest application (200)', async () => {
    const email = makeEmail('me');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    const userId = reg.body.user.id;
    createdUserIds.push(userId);

    await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'event',
        categories: ['learning'],
        capacity: 20,
      });

    const res = await request(app)
      .get('/host-applications/me')
      .set('Authorization', `Bearer ${reg.body.token}`);

    expect(res.status).toBe(200);
    expect(res.body.data.user_id).toBe(userId);
  });

  test('Admin can list pending applications (200)', async () => {
    const email = makeEmail('pending');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    createdUserIds.push(reg.body.user.id);

    await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'space',
        categories: ['outdoors'],
        capacity: 2,
      });

    // admin is seeded in jest.setup.js as id=3 role=admin
    const adminToken = createToken({ id: 3, role: 'admin' });

    const res = await request(app)
      .get('/host-applications?status=pending')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.data)).toBe(true);
    expect(res.body.data.length).toBeGreaterThanOrEqual(1);
  });

  test('Admin approval promotes user to host (200)', async () => {
    const email = makeEmail('approve');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    const userId = reg.body.user.id;
    createdUserIds.push(userId);

    const created = await request(app)
      .post('/host-applications')
      .set('Authorization', `Bearer ${reg.body.token}`)
      .send({
        offeringType: 'both',
        categories: ['movement'],
        capacity: 10,
      });

    const appId = created.body.data.id;

    const adminToken = createToken({ id: 3, role: 'admin' });

    const approve = await request(app)
      .patch(`/host-applications/${appId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'approved', reviewNotes: 'Approved ✅' });

    expect(approve.status).toBe(200);
    expect(approve.body.data.status).toBe('approved');

    // confirm user role updated in DB
    const { rows } = await query('SELECT role FROM users WHERE id = $1', [userId]);
    expect(rows[0].role).toBe('host');
  });

  test('Non-admin cannot access admin endpoints (403)', async () => {
    const email = makeEmail('noadmin');
    const reg = await request(app).post('/auth/register').send({ email, password });
    expect(reg.status).toBe(201);

    createdUserIds.push(reg.body.user.id);

    const res = await request(app)
      .get('/host-applications?status=pending')
      .set('Authorization', `Bearer ${reg.body.token}`);

    expect(res.status).toBe(403);
  });
});