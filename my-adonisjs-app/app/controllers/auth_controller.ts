import type { HttpContext } from '@adonisjs/core/http'
import { registerUserValidator } from '#validators/register_user'
import User from '#models/user'
import db from '@adonisjs/lucid/services/db'
import { io } from '../../start/ws.js'

export default class AuthController {
  async register({ request, response }: HttpContext) {
    const data = await request.validateUsing(registerUserValidator)

    try {
      // Map to User model columns and hash password
      const user = await User.create({
        email: data.email,
        nickname: data.nickname,
        firstName: data.firstName,
        lastName: data.lastName,
        passwordHash: data.password,
      })

      console.log('User created:', user)

      return {
        id: user.id,
        nickname: user.nickname,
        firstName: user.firstName,
        lastName: user.lastName,
        email: user.email,
        createdAt: user.createdAt?.toISO?.() ?? new Date().toISOString(),
        updatedAt: user.createdAt?.toISO?.() ?? new Date().toISOString(),
        newchannels: [],
      }
    } catch (error) {
      if (error.code === '23505') {
        return response.conflict({ error: 'Email or nickname already in use' })
      } else {
        return response.internalServerError({ error: 'Unexpected error during registration' })
      }
    }
  }

  async login({ auth, request, response }: HttpContext) {
    const email = request.input('email')
    const password = request.input('password')
    console.log('Attempting login for email:', email)

    try {
      const user = await User.verifyCredentials(email, password)
      console.log('User authenticated:', user)

      // Invalidate all previous tokens to ensure single session
      await db.from('auth_access_tokens').where('tokenable_id', user.id).delete()

      // Force logout other sessions via socket
      if (io) {
        io.of(`/users/${user.id}`).emit('force_logout')
      }

      const token = await auth.use('api').createToken(user, [], {
        name: 'api-token',
        expiresIn: '7 days',
      })
      return token
    } catch (error) {
      return response.badRequest({ error: 'Invalid credentials' })
    }
  }

  async logout({ auth }: HttpContext) {
    // Revokes current token (Bearer token from request header)
    await auth.use('api').invalidateToken()
    return { success: true }
  }

  async me({ auth }: HttpContext) {
    const user = await auth.use('api').authenticate()
    await user.load('channels')
    return {
      id: user.id,
      nickname: user.nickname,
      firstName: user.firstName,
      lastName: user.lastName,
      email: user.email,
      createdAt: user.createdAt?.toISO?.() ?? new Date().toISOString(),
      updatedAt: user.createdAt?.toISO?.() ?? new Date().toISOString(),
      newchannels: [],
    }
  }
}
