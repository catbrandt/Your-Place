const express = require('express')
const requireAuth = require('../middleware/requireAuth')
const validate = require('../middleware/validate')
const { getMe, updateMe, deleteMe } = require('../controllers/users.controller')
const { updateMeSchema } = require('../services/users.service')

const router = express.Router()

router.get('/me', requireAuth, getMe)

// Update own profile fields
router.patch('/me', requireAuth, validate(updateMeSchema), updateMe)

// Delete own account
router.delete('/me', requireAuth, deleteMe)

module.exports = router
