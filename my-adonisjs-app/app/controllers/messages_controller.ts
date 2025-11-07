import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import Message from '#models/message'

export default class MessagesController {
  /**
   * GET /messages/get?channelId=
   * Returns messages for a channel if requester is a member
   */
  async getByChannel({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const channelIdRaw = request.input('channelId') ?? request.qs().channelId
    const channelId = Number(channelIdRaw)
    if (!channelId || Number.isNaN(channelId) || channelId <= 0) {
      return response.badRequest({ error: 'Invalid channelId' })
    }

    const channel = await Channel.find(channelId)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    const isMember = await channel.related('members').query().where('users.id', user.id).first()
    if (!isMember) return response.forbidden({ error: 'Not a member of this channel' })

    const messages = await Message.query()
      .where('channel_id', channelId)
      .orderBy('created_at', 'asc')

    return messages.map((m) => ({
      id: m.id,
      channelId: m.channelId,
      authorId: m.authorId,
      body: m.body,
      createdAt: (m.createdAt || undefined)?.toISO?.() ?? null,
    }))
  }
}
