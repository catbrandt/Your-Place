const request = require('supertest')
const app = require('../app')
const { query, pool } = require('../db/pool')

describe('Booking Controller', () => {
  let testUserId
  let testSpaceId
  let testEventId
  let testBookingId

  beforeAll(async () => {
    // Use existing user 1 or create a new test user
    const userResult = await query(
      `INSERT INTO users (id, full_name, email, password_hash, role, locale)
            VALUES (3, $1, $2, $3, $4, $5)
            ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name
            RETURNING id`,
      ['Test User', 'test@email.com', 'hashedpassword', 'user', 'en']
    )
    testUserId = userResult.rows[0].id
  })

  beforeEach(async () => {
    // Create test data before each test (after jest.setup.js cleanup)
    // Creation of test space
    const spaceResult = await query(
      `INSERT INTO spaces (host_user_id, name, description, address, city, country, capacity) 
            VALUES ($1, $2, $3, $4, $5, $6, $7) 
            RETURNING id`,
      [testUserId, 'Test Space', 'A test space', '1 Test Rd', 'City', 'Country', 5]
    )
    testSpaceId = spaceResult.rows[0].id

    // Creation of test event
    const eventResult = await query(
      `INSERT INTO events (host_user_id, space_id, title, description, category, start_at,
            end_at, capacity, price_per_spot, status) 
            VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10) 
            RETURNING id`,
      [
        testUserId,
        testSpaceId,
        'Test Event',
        'A test event',
        'Movement',
        '2026-03-02T08:00:00.000Z',
        '2026-03-02T09:30:00.000Z',
        20,
        10.0,
        'active',
      ]
    )
    testEventId = eventResult.rows[0].id
  })

  afterAll(async () => {
    // Removal of test data after testing run
    await query('DELETE FROM bookings WHERE user_id = $1', [testUserId])
    await query('DELETE FROM events WHERE host_user_id = $1', [testUserId])
    await query('DELETE FROM spaces WHERE host_user_id = $1', [testUserId])
    await query('DELETE FROM users WHERE id = $1', [testUserId])
    // Don't call pool.end() here - jest.setup.js handles it
  })

  // Test One: Creation of an event booking
  it('Should create new event booking', async () => {
    const response = await request(app).post('/bookings').send({
      eventId: testEventId,
      userId: testUserId,
      quantity: 3,
      totalPrice: 30.0,
      paymentStatus: 'pending',
    })
    expect(response.status).toBe(201)
    expect(response.body).toHaveProperty('id')
    expect(response.body.event_id).toBe(testEventId)
    testBookingId = response.body.id
  })
})
