import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import Message from '#models/message'

export default class MessagesController {
  async getByChannel({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const channelName = request.input('channelName')
    const skip = request.input('skip', 0)
    const limit = request.input('limit', 20)

    if (!channelName) {
      return response.badRequest({ error: 'Invalid channelName' })
    }

    const channel = await Channel.query().where('name', channelName).first()
    if (!channel) return response.notFound({ error: 'Channel not found' })

    const isMember = await channel.related('members').query().where('users.id', user.id).first()
    if (!isMember) return response.forbidden({ error: 'Not a member of this channel' })

    const totalObj = await Message.query().where('channel_id', channel.id).count('* as total')
    const total = Number(totalObj[0]?.$extras?.total ?? 0)

    const messages = await Message.query()
      .where('channel_id', channel.id)
      .orderBy('created_at', 'desc')
      .offset(skip)
      .limit(limit)
      .preload('author')

    messages.reverse()

    const data = messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      createdBy: m.authorId,
      body: m.body,
      createdAt: (m.createdAt || undefined)?.toISO?.() ?? new Date().toISOString(),
      updatedAt: (m.createdAt || undefined)?.toISO?.() ?? new Date().toISOString(),
      author: {
        id: m.author.id,
        nickname: m.author.nickname,
        firstName: m.author.firstName,
        lastName: m.author.lastName,
        email: m.author.email,
        createdAt: (m.author.createdAt || undefined)?.toISO?.() ?? new Date().toISOString(),
        updatedAt: (m.author.createdAt || undefined)?.toISO?.() ?? new Date().toISOString(),
        newchannels: [],
      },
    }))

    return { messages: data, total }
  }
}
