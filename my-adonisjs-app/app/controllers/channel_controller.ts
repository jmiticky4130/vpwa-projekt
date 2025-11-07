import type { HttpContext } from '@adonisjs/core/http'
import Channel from '#models/channel'
import Membership from '#models/membership'
import { DateTime } from 'luxon'
import { createChannelValidator, channelNameValidator } from '../validators/channel.js'

export default class ChannelController {
  /**
   * POST /channel/create
   * Body: { name: string, isPublic: boolean }
   * Creates a channel and adds creator as a member
   */
  async create({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const { name, isPublic } = await request.validateUsing(createChannelValidator)
    // New logic: if channel with same name exists and is public, auto-join instead of failing.
    const existing = await Channel.findBy('name', name)
    if (existing) {
      // If existing channel is public and user is not yet a member, attach membership and return channel.
      if (existing.public) {
        const membership = await Membership.query()
          .where('user_id', user.id)
          .andWhere('channel_id', existing.id)
          .first()
        if (!membership) {
          await user.related('channels').attach([existing.id])
        }
        return existing
      }
      // Non-public existing channel; preserve original conflict behaviour.
      return response.conflict({ error: 'Channel with this name already exists' })
    }

    // No existing channel -> create a new one as before.
    try {
      const channel = await Channel.create({
        name,
        createdBy: user.id,
        lastActivity: DateTime.now(),
        public: isPublic,
      })
      await user.related('channels').attach([channel.id])
      return channel
    } catch (error: any) {
      // Safety net: still handle unique constraint in case of race condition.
      if (error && typeof error.code === 'string' && error.code === '23505') {
        // Retry fetching existing (could have been created by another request just now)
        const retry = await Channel.findBy('name', name)
        if (retry && retry.public) {
          const membership = await Membership.query()
            .where('user_id', user.id)
            .andWhere('channel_id', retry.id)
            .first()
          if (!membership) await user.related('channels').attach([retry.id])
          return retry
        }
        return response.conflict({ error: 'Channel with this name already exists' })
      }
      throw error
    }
  }

  /**
   * POST /channel/delete
   * Body: { name: string }
   * Only channel creator can delete
   */
  async delete({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const { name } = await request.validateUsing(channelNameValidator)

    const channel = await Channel.findBy('name', name)
    if (!channel) return response.notFound({ error: 'Channel not found' })
    if (channel.createdBy !== user.id) {
      return response.forbidden({ error: 'Only the channel creator can delete this channel' })
    }
    await channel.delete()
    return { success: true }
  }

  /**
   * GET /channel/list
   * Returns channels the user is a member of
   */
  async list({ auth }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const channels = await user
      .related('channels')
      .query()
      .preload('members', (q) => q.select(['id']))

    // Map to frontend-friendly DTO
    return channels.map((c) => ({
      id: c.id,
      name: c.name,
      public: (c as any).public === undefined ? true : (c as any).public,
      creatorId: c.createdBy,
      members: Array.isArray((c as any).members) ? (c as any).members.map((m: any) => m.id) : [],
    }))
  }

  /**
   * POST /channel/join
   * Body: { name: string }
   */
  async join({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const { name } = await request.validateUsing(channelNameValidator)

    const channel = await Channel.findBy('name', name)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    // Check existing membership
    const existing = await Membership.query()
      .where('user_id', user.id)
      .andWhere('channel_id', channel.id)
      .first()
    if (existing) {
      return { success: true, message: 'Already a member' }
    }

    await user.related('channels').attach([channel.id])
    return { success: true }
  }

  /**
   * POST /channel/leave
   * Body: { name: string }
   */
  async leave({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const { name } = await request.validateUsing(channelNameValidator)

    const channel = await Channel.findBy('name', name)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    // If the creator leaves/cancels, delete the channel entirely
    if (channel.createdBy === user.id) {
      await channel.delete()
      return { success: true, deleted: true }
    }

    // Otherwise just remove membership
    await user.related('channels').detach([channel.id])
    return { success: true, left: true }
  }

  /**
   * PATCH /channel/privacy
   * Body: { name: string, public: boolean }
   * Only creator can change visibility
   */
  async privacy({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const nameRaw = request.input('name')
    const publicRaw = request.input('public')
    if (typeof nameRaw !== 'string' || nameRaw.trim() === '') {
      return response.badRequest({ error: 'Invalid channel name' })
    }
    if (typeof publicRaw !== 'boolean') {
      return response.badRequest({ error: 'Invalid public flag' })
    }
    const name = nameRaw.trim().toLowerCase()
    const channel = await Channel.findBy('name', name)
    if (!channel) return response.notFound({ error: 'Channel not found' })
    if (channel.createdBy !== user.id) {
      return response.forbidden({ error: 'Only the channel creator can change privacy.' })
    }
    if (channel.public === publicRaw) {
      return { success: true, public: channel.public, unchanged: true }
    }
    channel.public = publicRaw
    await channel.save()
    return { success: true, public: channel.public }
  }

  /**
   * POST /channel/revoke
   * Body: { name: string, nickname: string }
   * Only channel creator can revoke (remove) a member by nickname
   */
  async revoke({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const nameRaw = request.input('name')
    const nicknameRaw = request.input('nickname')
    if (typeof nameRaw !== 'string' || nameRaw.trim() === '') {
      return response.badRequest({ error: 'Invalid channel name' })
    }
    if (typeof nicknameRaw !== 'string' || nicknameRaw.trim() === '') {
      return response.badRequest({ error: 'Invalid nickname' })
    }
    const name = nameRaw.trim().toLowerCase()
    const nickname = nicknameRaw.trim().toLowerCase()

    const channel = await Channel.findBy('name', name)
    if (!channel) return response.notFound({ error: 'Channel not found' })
    if (channel.createdBy !== user.id) {
      return response.forbidden({ error: 'Only the channel creator can revoke members' })
    }

    // Find target user by nickname (case-insensitive)
    const { default: UserModel } = await import('#models/user')
    const target = await UserModel.query().whereRaw('LOWER(nickname) = ?', [nickname]).first()
    if (!target) return response.notFound({ error: 'User not found' })

    // Check membership
    const membership = await Membership.query()
      .where('user_id', target.id)
      .andWhere('channel_id', channel.id)
      .first()
    if (!membership) {
      return response.conflict({ error: 'User is not a member of this channel' })
    }

    await target.related('channels').detach([channel.id])
    return { success: true }
  }
}
