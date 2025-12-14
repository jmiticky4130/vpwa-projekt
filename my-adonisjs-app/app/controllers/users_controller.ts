import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'

export default class UsersController {
  async getByChannel({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const channelIdRaw = request.input('channelId') ?? request.qs().channelId
    const channelId = Number(channelIdRaw)
    if (!channelId || Number.isNaN(channelId) || channelId <= 0) {
      return response.badRequest({ error: 'Invalid channelId' })
    }

    const channel = await Channel.query()
      .where('id', channelId)
      .preload('members', (q) => q.select(['id', 'nickname', 'first_name', 'last_name', 'email']))
      .first()

    if (!channel) return response.notFound({ error: 'Channel not found' })

    const isMember = await channel.related('members').query().where('users.id', user.id).first()

    if (!isMember) return response.forbidden({ error: 'Not a member of this channel' })

    return channel.members.map((m) => ({
      id: m.id,
      nickname: m.nickname,
      firstName: (m as any).firstName ?? (m as any).first_name,
      lastName: (m as any).lastName ?? (m as any).last_name,
      email: m.email,
    }))
  }
}
