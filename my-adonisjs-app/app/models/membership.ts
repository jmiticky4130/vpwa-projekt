import { DateTime } from 'luxon'
import { BaseModel, column, belongsTo } from '@adonisjs/lucid/orm'
import type { BelongsTo } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Channel from '#models/channel'

export default class Membership extends BaseModel {
  static table = 'memberships'

  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'user_id' })
  declare userId: number

  @column({ columnName: 'channel_id' })
  declare channelId: number

  @column({ columnName: 'is_kicked' })
  declare isKicked: boolean

  @column({ columnName: 'is_banned' })
  declare isBanned: boolean

  @column.dateTime({ columnName: 'joined_at' })
  declare joinedAt: DateTime

  @belongsTo(() => User, { foreignKey: 'userId' })
  declare user: BelongsTo<typeof User>

  @belongsTo(() => Channel, { foreignKey: 'channelId' })
  declare channel: BelongsTo<typeof Channel>
}
