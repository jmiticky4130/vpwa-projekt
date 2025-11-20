import type { HttpContext } from '@adonisjs/core/http'
import { registerUserValidator } from '#validators/register_user'
import User from '#models/user'
import Channel from '#models/channel'

export default class AuthController {
  async register({ request }: HttpContext) {
    const data = await request.validateUsing(registerUserValidator)

    // Map to User model columns and hash password
    const user = await User.create({
      email: data.email,
      nickname: data.nickname,
      firstName: data.firstName,
      lastName: data.lastName,
      passwordHash: data.password,
    })

    console.log('User created:', user)
    // Add user to general channel
    const general = await Channel.findByOrFail('name', 'general')
    await user.related('channels').attach([general.id])
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

  async login({ auth, request }: HttpContext) {
    const email = request.input('email')
    const password = request.input('password')
    console.log('Attempting login for email:', email)
    const user = await User.verifyCredentials(email, password)
    console.log('User authenticated:', user)
    const created = await auth.use('api').createToken(user, [], {
      name: 'api-token',
      expiresIn: '7 days',
    })
    // Extract raw token string from possible shapes
    const rawToken: string = (() => {
      const anyCreated: any = created
      if (typeof anyCreated.token === 'string') return anyCreated.token
      if (anyCreated.token?.release) return anyCreated.token.release()
      if (anyCreated.value?.release) return anyCreated.value.release()
      if (typeof anyCreated.value === 'string') return anyCreated.value
      return String(anyCreated.token || anyCreated.value)
    })()
    const response = {
      type: (created as any).type ?? 'bearer',
      token: rawToken,
      expires_at: (created as any).expiresAt?.toISO?.(),
      expires_in: (created as any).expiresIn,
    }
    console.log('Token created (preview):', rawToken.slice(0, 10) + '...')
    return response
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
