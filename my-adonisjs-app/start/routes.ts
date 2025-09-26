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
// No need for DateTime; using expiresIn option for tokens

router.on('/').render('pages/home')

const createUserValidator = vine.compile(
  vine.object({
    nickname: vine.string().trim().maxLength(20),
    firstName: vine.string().trim().maxLength(20),
    lastName: vine.string().trim().maxLength(20),
    email: vine.string().email().trim(),
    password: vine.string().minLength(6),
  })
)

const loginValidator = vine.compile(
  vine.object({
    email: vine.string().email().trim(),
    password: vine.string(),
  })
)

// Signup + auto login (issues token)
router.post('/api/users', async ({ request, response }) => {
  try {
    const payload = await request.validateUsing(createUserValidator)
    const user = await User.create({
      nickname: payload.nickname,
      firstName: payload.firstName,
      lastName: payload.lastName,
      email: payload.email,
      password: payload.password,
    })

    const token = await User.accessTokens.create(user, ['*'], {
      name: 'signup',
      expiresIn: '1d',
    })

    return response.created({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token: {
        type: 'bearer',
        value: token.value!.release(),
        expiresIn: '1d',
      },
    })
  } catch (error) {
    return response.status(400).send({ message: 'Invalid input' })
  }
})

// Login
router.post('/api/login', async ({ request, response }) => {
  try {
    const { email, password } = await request.validateUsing(loginValidator)
    const user = await User.verifyCredentials(email, password)
    const token = await User.accessTokens.create(user, ['*'], {
      name: 'login',
      expiresIn: '1d',
    })
    return response.ok({
      user: {
        id: user.id,
        email: user.email,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      token: {
        type: 'bearer',
        value: token.value!.release(),
        expiresIn: '1d',
      },
    })
  } catch (error) {
    return response.unauthorized({ message: 'Invalid credentials' })
  }
})

/*

ADD TRY CATCH AND ERROR MESSAGES!!!!!

*/

// Me (requires auth)
router.get('/api/me', async ({ auth, response }) => {
  const user = await auth.use('api').authenticate()
  return response.ok({
    id: user.id,
    email: user.email,
    nickname: user.nickname,
    firstName: user.firstName,
    lastName: user.lastName,
  })
})

// Logout (revoke current token)
router.post('/api/logout', async ({ auth, response }) => {
  const user = await auth.use('api').authenticate()
  const token = user.currentAccessToken
  if (token) {
    await User.accessTokens.delete(user, token.identifier)
  }
  return response.ok({ success: true })
})

// List tokens for current user (metadata only)
router.get('/api/tokens', async ({ auth, response }) => {
  const user = await auth.use('api').authenticate()
  const tokens = await User.accessTokens.all(user)
  const sanitized = tokens.map((t) => ({
    id: t.identifier,
    name: t.name ?? null,
    abilities: t.abilities,
    createdAt: t.createdAt,
    expiresAt: t.expiresAt,
    lastUsedAt: t.lastUsedAt,
  }))
  return response.ok({ tokens: sanitized })
})

// Revoke token by id
router.delete('/api/tokens/:id', async ({ auth, params, response }) => {
  const user = await auth.use('api').authenticate()
  const tokenId = params.id
  const deleted = await User.accessTokens.delete(user, tokenId)
  if (!deleted) {
    return response.notFound({ error: 'Token not found' })
  }
  return response.ok({ success: true })
})
