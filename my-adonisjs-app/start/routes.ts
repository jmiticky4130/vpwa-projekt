/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from '@adonisjs/core/services/router'
import User from '#models/user'
import vine from '@vinejs/vine'

router.on('/').render('pages/home')

const createUserValidator = vine.compile(
  vine.object({
    firstName: vine.string().trim().optional(),
    lastName: vine.string().trim().optional(),
    email: vine.string().email().trim(),
    password: vine.string().minLength(6),
  })
)

router.post('/api/users', async ({ request, response }) => {
  const payload = await request.validateUsing(createUserValidator)
  const user = await User.create({
    firstName: payload.firstName ?? null,
    lastName: payload.lastName ?? null,
    email: payload.email,
    password: payload.password,
  })
  return response.created({ id: user.id, email: user.email })
})
