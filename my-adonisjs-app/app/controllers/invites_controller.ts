import type { HttpContext } from '@adonisjs/core/http'
import Invite from '#models/invite'
import Channel from '#models/channel'
import User from '#models/user'
import { DateTime } from 'luxon'

export default class InvitesController {
  /**
   * GET /invites
   * Returns pending invites for the authenticated user
   */
  async list({ auth }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const invites = await Invite.query()
      .where('to_user_id', user.id)
      .andWhere('status', 'pending')
      .preload('channel', (q) => q.select(['id', 'name', 'public', 'created_by']))

    return invites.map((inv) => ({
      id: inv.id,
      channelId: inv.channelId,
      channelName: inv.channel?.name ?? '',
      public: (inv.channel as any)?.public ?? true,
      creatorId: (inv.channel as any)?.created_by ?? (inv.channel as any)?.createdBy,
      status: inv.status,
      expiresAt: inv.expiresAt ? inv.expiresAt.toISO() : null,
      createdAt: inv.createdAt.toISO(),
    }))
  }

  /**
   * POST /invites/create
   * Body: { channelName: string, target: string }
   * target can be nickname or email
   * Rules: if channel is private only creator can invite; if public any member can invite.
   */
  async create({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const channelName: string = request.input('channelName')?.trim()?.toLowerCase()
    const targetRaw: string = request.input('target')?.trim()
    if (!channelName || !targetRaw) {
      return response.badRequest({ error: 'channelName and target are required' })
    }

    const channel = await Channel.findBy('name', channelName)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    // Check inviter is member
    const inviterMembership = await channel
      .related('members')
      .query()
      .where('users.id', user.id)
      .first()
    if (!inviterMembership) return response.forbidden({ error: 'Not a channel member' })

    // Privacy rule
    if (!channel.public && channel.createdBy !== user.id) {
      return response.forbidden({ error: 'Only creator can invite to private channel' })
    }

    // Resolve target user by nickname
    const target = await User.query()
      .whereRaw('LOWER(nickname) = ?', [targetRaw.toLowerCase()])
      .first()
    if (!target) return response.notFound({ error: 'Target user not found' })

    // Already a member?
    const existingMember = await channel
      .related('members')
      .query()
      .where('users.id', target.id)
      .first()
    if (existingMember) return response.conflict({ error: 'User already in channel' })

    // Existing pending invite? User reported needing to "delete the invite through the mail" so we
    // will replace any pending invite (email or nickname initiated) with a fresh one, instead of returning conflict.
    const existingInvite = await Invite.query()
      .where('channel_id', channel.id)
      .andWhere('to_user_id', target.id)
      .andWhere('status', 'pending')
      .first()
    if (existingInvite) {
      await existingInvite.delete()
    }

    const invite = await Invite.create({
      channelId: channel.id,
      toUserId: target.id,
      status: 'pending',
      expiresAt: DateTime.now().plus({ days: 7 }),
    })
    return { success: true, id: invite.id }
  }

  /**
   * POST /invites/respond
   * Body: { inviteId: number, action: 'accept' | 'decline' }
   */
  async respond({ auth, request, response }: HttpContext) {
    const user = await auth.use('api').authenticate()
    const inviteId = Number(request.input('inviteId'))
    const action = String(request.input('action') ?? '').toLowerCase() as 'accept' | 'decline'
    if (!inviteId || Number.isNaN(inviteId) || !['accept', 'decline'].includes(action)) {
      return response.badRequest({ error: 'Invalid inviteId or action' })
    }

    const invite = await Invite.query()
      .where('id', inviteId)
      .andWhere('to_user_id', user.id)
      .first()
    if (!invite) return response.notFound({ error: 'Invite not found' })
    if (invite.status !== 'pending') return response.conflict({ error: 'Invite already resolved' })

    const channel = await Channel.find(invite.channelId)
    if (!channel) return response.notFound({ error: 'Channel not found' })

    if (action === 'decline') {
      invite.status = 'declined'
      await invite.save()
      return { success: true, status: 'declined' }
    }

    // Accept: add membership even if private
    await user.related('channels').attach([channel.id])
    invite.status = 'accepted'
    await invite.save()
    return { success: true, status: 'accepted', channel: { id: channel.id, name: channel.name } }
  }
}
