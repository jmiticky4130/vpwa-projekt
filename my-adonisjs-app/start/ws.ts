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

    const channel = await Channel.query().where('name', channelName).first()
    if (!channel) {
      logger.warn('[ws] Channel not found: %s', channelName)
      socket.emit('error', { message: 'Channel not found' })
      socket.disconnect(true)
      return
    }

    // Check membership
    const isMember = await channel
      .related('members')
      .query()
      .where('users.id', user.id)
      .first()

    if (!isMember) {
      socket.emit('error', { message: 'Forbidden: not a member' })
      socket.disconnect(true)
      return
    }

    // loadMessages event: returns all messages for this channel
    socket.on('loadMessages', async (cb: (err: Error | null, res?: any) => void) => {
      try {
        logger.debug('[ws] loadMessages by user %s in channel %s', user.id, channel.name)
        const messages = await Message.query()
          .where('channel_id', channel.id)
          .orderBy('created_at', 'asc')
          .preload('author')

        const data = messages.map((m) => serializeMessage(m, m.author))
        logger.debug('[ws] loadMessages fetched %d messages for %s', data.length, channel.name)
        cb(null, data)
      } catch (e: any) {
        logger.error('[ws] loadMessages error for %s: %s', channel.name, e?.message)
        cb(e)
      }
    })

    // addMessage event: persists and broadcasts a new message
    socket.on(
      'addMessage',
      async (body: string, cb: (err: Error | null, res?: any) => void) => {
        try {
          logger.debug('[ws] addMessage by user %s in %s: %s', user.id, channel.name, body)
          const created = await Message.create({
            channelId: channel.id,
            authorId: user.id,
            body,
          })
          await created.load('author')
          const payload = serializeMessage(created, created.author)
          // broadcast to everyone in this namespace
          socket.nsp.emit('message', payload)
          logger.info('[ws] message broadcast in %s by %s (msg %s)', channel.name, user.id, created.id)
          cb(null, payload)
        } catch (e: any) {
          logger.error('[ws] addMessage error in %s: %s', channel.name, e?.message)
          cb(e)
        }
      }
    )

    socket.on('disconnect', (reason: string) => {
      if (reason !== 'io server disconnect') {
        logger.debug('[ws] disconnect %s %s', socket.id, reason)
      }
    })
  } catch (e) {
    logger.error('[ws] Unhandled error on connection %s: %s', socket.id, (e as any)?.message)
    socket.disconnect(true)
  }
  })
}

export { io }
