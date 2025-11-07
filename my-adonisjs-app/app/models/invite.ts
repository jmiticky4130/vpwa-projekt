import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'
import Channel from '#models/channel'
import User from '#models/user'

export default class Invite extends BaseModel {
  static table = 'invites'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'channel_id' })
  declare channelId: number

  @column({ columnName: 'to_user_id' })
  declare toUserId: number

  @column()
  declare status: string // 'pending' | 'accepted' | 'declined'

  @column.dateTime({ columnName: 'created_at', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'expires_at' })
  declare expiresAt: DateTime | null

  @belongsTo(() => Channel, { foreignKey: 'channelId' })
  declare channel: BelongsTo<typeof Channel>

  @belongsTo(() => User, { foreignKey: 'toUserId' })
  declare recipient: BelongsTo<typeof User>
}
