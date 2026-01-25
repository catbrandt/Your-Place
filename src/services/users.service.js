const { z } = require('zod')

// Only allow updating profile-style fields (not email/role/password here)
const updateMeSchema = z
  .object({
    fullName: z.string().min(1).max(160).optional(),
    locale: z.string().min(2).max(10).optional(),
  })
  .refine((obj) => Object.keys(obj).length > 0, {
    message: 'At least one field must be provided',
  })

module.exports = {
  updateMeSchema,
}