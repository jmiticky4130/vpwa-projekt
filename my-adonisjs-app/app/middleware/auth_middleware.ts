import type { HttpContext } from '@adonisjs/core/http'
import type { NextFn } from '@adonisjs/core/types/http'
import type { Authenticators } from '@adonisjs/auth/types'
import type { Socket } from 'socket.io'
import logger from '@adonisjs/core/services/logger'
import { Secret } from '@adonisjs/core/helpers'
import User from '#models/user'
import Channel from '#models/channel'

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
      // Try to get token from handshake auth or Authorization header
      const authHeader = socket.handshake.headers?.authorization
      const authTokenFromHeader =
        typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')
          ? authHeader.slice(7)
          : undefined

      const token =
        ((socket.handshake.auth as Record<string, unknown> | undefined)?.token as
          | string
          | undefined) || authTokenFromHeader

      if (!token) {
        const err: any = new Error('Unauthorized: missing token')
        err.data = { status: 401 }
        logger.warn('[ws-auth] Missing token for socket %s (%s)', socket.id, socket.nsp?.name)
        return next(err)
      }

      // Wrap token in Secret so Adonis won't accidentally leak it
      const secret = new Secret(token)

      // Verify opaque access token using Adonis access tokens provider
      const accessToken: any = await User.accessTokens.verify(secret)

      // If verification failed or token is expired, reject
      if (
        !accessToken ||
        (typeof accessToken.isExpired === 'function' && accessToken.isExpired())
      ) {
        const err: any = new Error('Unauthorized: invalid or expired token')
        err.data = { status: 401 }
        logger.warn(
          '[ws-auth] Invalid/expired token for socket %s (%s)',
          socket.id,
          socket.nsp?.name
        )
        return next(err)
      }
      // Load user for the token
      const user = await User.find(accessToken.tokenableId)

      if (!user) {
        const err: any = new Error('Unauthorized: user not found for token')
        err.data = { status: 401 }
        logger.warn(
          '[ws-auth] Token user not found (id=%s) for socket %s (%s)',
          accessToken.tokenableId,
          socket.id,
          socket.nsp?.name
        )
        return next(err)
      }

      // Optionally keep the current access token on the user instance for ability checks
      ;(user as any).currentAccessToken = accessToken

      socket.data.user = user
      logger.info(
        '[ws-auth] Authenticated user %s on %s (%s)',
        user.id,
        socket.nsp?.name,
        socket.id
      )

      // If this is a dynamic channel namespace, also verify channel & membership here
      const nspName = socket.nsp?.name || ''
      if (/^\/channels\/[^/]+$/.test(nspName)) {
        const channelName = nspName.split('/').pop() as string
        const channel = await Channel.query().where('name', channelName).first()
        if (!channel) {
          const err: any = new Error('Channel not found')
          err.data = { status: 404 }
          logger.warn('[ws-auth] Channel %s not found for user %s', channelName, user.id)
          return next(err)
        }
        const isMember = await channel.related('members').query().where('users.id', user.id).first()
        if (!isMember) {
          const err: any = new Error('Forbidden: not a member')
          err.data = { status: 403 }
          logger.warn('[ws-auth] User %s is not member of channel %s', user.id, channelName)
          return next(err)
        }
        // Stash channel for later use in the connection handler
        ;(socket.data as any).channel = channel
        logger.info('[ws-auth] Verified membership of user %s in channel %s', user.id, channelName)
      }

      return next()
    } catch (error: any) {
      const err: any = new Error('Unauthorized')
      err.data = { status: 401 }
      logger.error('[ws-auth] Error verifying token for %s: %s', socket.id, error?.message)
      return next(err)
    }
  }
}
