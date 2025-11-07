import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import type { Socket } from 'socket.io'

/**
 * Auth middleware is used authenticate HTTP requests and deny
 * access to unauthenticated users.
 */
export default class AuthMiddleware {
  /**
   * The URL to redirect to, when authentication fails
   */
  redirectTo = '/login'

  async handle(
    ctx: HttpContext,
    next: NextFn,
    options: {
      guards?: (keyof Authenticators)[]
    } = {}
  ) {
    await ctx.auth.authenticateUsing(options.guards, { loginRoute: this.redirectTo })
    return next()
  }

  public async wsHandle(socket: Socket, next: (err?: Error) => void) {
    try {
      const token = socket.handshake.auth?.token

      if (!token) {
        throw new Error('Missing auth token')
      }

      // získaš HttpContext z WS kontextu, ak máš integráciu podľa Adonis 6 štandardu
      const ctx = socket.data.ctx as HttpContext | undefined
      if (!ctx) {
        throw new Error('Missing HTTP context in socket')
      }

      // autentifikuj token
      //await ctx.auth.use('api').authenticateUsingBearerToken(token)

      // ak sa úspešne autentifikoval, posuň ďalej
      return next()
    } catch (error) {
      console.error('[WS Auth Error]', error.message)
      next(error)
      socket.disconnect(true)
    }
  }
}
