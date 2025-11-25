import { Server } from 'socket.io'
import app from '@adonisjs/core/services/app'
import server from '@adonisjs/core/services/server'
import logger from '@adonisjs/core/services/logger'
import Channel from '#models/channel'
import Message from '#models/message'
import User from '#models/user'
import AuthMiddleware from '#middleware/auth_middleware'

let io: Server
const authMiddleware = new AuthMiddleware()

import { DateTime } from 'luxon'

// Initialize Socket.IO when the app is ready
app.ready(() => {
  io = new Server(server.getNodeServer(), {
    cors: { origin: true, credentials: true },
    path: '/socket.io',
    serveClient: true,
  })
  logger.info('[ws] Socket.IO server attached at /socket.io')
  logger.info('[ws] Installing auth middleware for channel namespaces')

  // Register channel namespace handlers
  registerChannelNamespace()
  registerUserNamespace()
})

// Helper to serialize Message to the frontend shape
function serializeMessage(m: Message, author: User) {
  return {
    id: m.id,
    channelId: m.channelId,
    createdBy: m.authorId,
    body: m.body,
    createdAt: m.createdAt?.toISO?.() ?? new Date().toISOString(),
    updatedAt: m.createdAt?.toISO?.() ?? new Date().toISOString(),
    author: {
      id: author.id,
      nickname: author.nickname,
      firstName: author.firstName,
      lastName: author.lastName,
      email: author.email,
      createdAt: author.createdAt?.toISO?.() ?? new Date().toISOString(),
      updatedAt: author.createdAt?.toISO?.() ?? new Date().toISOString(),
      newchannels: [],
    },
  }
}

// Handle dynamic channel namespaces: /channels/:name
function registerChannelNamespace() {
  const channelsNs = io.of(/^\/channels\/[^/]+$/)
  // Attach auth middleware to dynamic namespace
  channelsNs.use(authMiddleware.wsHandle.bind(authMiddleware))
  channelsNs.on('connection', async (socket) => {
    try {
      const nsName: string = socket.nsp.name // e.g. /channels/general
      const channelName = nsName.split('/').pop() as string
      logger.info('[ws] Connection on %s: socket %s', nsName, socket.id)

      const user: User | undefined = socket.data?.user
      if (!user) {
        logger.warn('[ws] No user in socket data for %s, disconnecting', socket.id)
        socket.disconnect(true)
        return
      }
      logger.info('[ws] Authenticated user %s connected to %s', user.id, nsName)

      // Channel & membership already verified in auth middleware; retrieve cached channel
      const channel: Channel | undefined = (socket.data as any).channel
      if (!channel) {
        logger.warn('[ws] Channel not available after auth for %s', channelName)
        socket.emit('error', { message: 'Channel not available' })
        socket.disconnect(true)
        return
      }

      // Send current statuses of all other users in this namespace to the new connection
      const sockets = await socket.nsp.fetchSockets()
      const statuses = sockets
        .map((s) => {
          const u = s.data.user as User
          const st = (s.data as any).status || 'offline'
          if (!u || s.id === socket.id) return null
          return { userId: u.id, status: st }
        })
        .filter((s) => s !== null)

      if (statuses.length > 0) {
        socket.emit('allStatuses', statuses)
      }

      // addMessage event: persists and broadcasts a new message
      socket.on('addMessage', async (body: string, cb: (err: Error | null, res?: any) => void) => {
        try {
          logger.debug('[ws] addMessage by user %s in %s: %s', user.id, channel.name, body)
          const created = await Message.create({
            channelId: channel.id,
            authorId: user.id,
            body,
          })

          // Update channel last activity
          channel.lastActivity = DateTime.now()
          await channel.save()

          await created.load('author')
          const payload = serializeMessage(created, created.author)
          // broadcast to everyone in the 'active' room (online/dnd users)
          socket.nsp.to('active').emit('message', payload)
          logger.info(
            '[ws] message broadcast in %s by %s (msg %s)',
            channel.name,
            user.id,
            created.id
          )
          cb(null, payload)
        } catch (e: any) {
          logger.error('[ws] addMessage error in %s: %s', channel.name, e?.message)
          cb(e)
        }
      })

      // setStatus event: broadcast user status to this namespace excluding sender
      socket.on(
        'setStatus',
        async (status: 'online' | 'dnd' | 'offline', cb?: (err: Error | null) => void) => {
          try {
            if (!['online', 'dnd', 'offline'].includes(status)) {
              throw new Error('Invalid status')
            }
            ;(socket.data as any).status = status

            // Manage "active" room membership for message delivery
            if (status === 'offline') {
              socket.leave('active')
            } else {
              socket.join('active')
            }

            const payload = { userId: user.id, status }
            // Emit only to other sockets in this namespace
            socket.broadcast.emit('myStatus', payload)
            logger.debug(
              '[ws] setStatus %s -> %s (namespace %s, excluding self)',
              user.id,
              status,
              socket.nsp.name
            )
            if (cb) cb(null)
          } catch (e: any) {
            logger.error('[ws] setStatus error for %s: %s', user.id, e?.message)
            if (cb) cb(e)
          }
        }
      )

      socket.on('disconnect', (reason: string) => {
        if (reason !== 'io server disconnect') {
          logger.debug('[ws] disconnect %s %s', socket.id, reason)
        }

        // Broadcast offline status to others
        const payload = { userId: user.id, status: 'offline' }
        socket.broadcast.emit('myStatus', payload)
      })
    } catch (e) {
      logger.error('[ws] Unhandled error on connection %s: %s', socket.id, (e as any)?.message)
      socket.disconnect(true)
    }
  })
}

// Handle user-specific namespace: /users/:id
function registerUserNamespace() {
  const userNs = io.of(/^\/users\/\d+$/)
  // Attach auth middleware to dynamic namespace
  userNs.use(authMiddleware.wsHandle.bind(authMiddleware))

  userNs.on('connection', async (socket) => {
    try {
      const nsName: string = socket.nsp.name // e.g. /users/1
      const targetUserId = Number(nsName.split('/').pop())
      const user: User | undefined = socket.data?.user

      if (!user || user.id !== targetUserId) {
        logger.warn('[ws] Unauthorized access to user namespace %s by user %s', nsName, user?.id)
        socket.disconnect(true)
        return
      }

      logger.info('[ws] User %s connected to private namespace %s', user.id, nsName)
    } catch (e) {
      logger.error('[ws] Error in user namespace connection: %s', (e as any)?.message)
      socket.disconnect(true)
    }
  })
}

export { io }
