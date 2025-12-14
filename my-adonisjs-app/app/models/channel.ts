import { DateTime } from 'luxon'
import { BaseModel, column, hasMany, belongsTo, manyToMany } from '@adonisjs/lucid/orm'
import type { HasMany, BelongsTo, ManyToMany } from '@adonisjs/lucid/types/relations'

import User from '#models/user'
import Message from '#models/message'

export default class Channel extends BaseModel {
  @column({ isPrimary: true })
  declare id: number

  @column({ columnName: 'created_by' })
  declare createdBy: number

  @column()
  declare name: string

  @column()
  declare public: boolean

  @column.dateTime({ columnName: 'created_at', autoCreate: true })
  declare createdAt: DateTime

  @column.dateTime({ columnName: 'last_activity' })
  declare lastActivity: DateTime | null

  @belongsTo(() => User, { foreignKey: 'createdBy' })
  declare creator: BelongsTo<typeof User>

  @hasMany(() => Message, { foreignKey: 'channelId' })
  declare messages: HasMany<typeof Message>

  @manyToMany(() => User, {
    pivotTable: 'memberships',
    pivotForeignKey: 'channel_id',
    pivotRelatedForeignKey: 'user_id',
    pivotColumns: ['is_kicked', 'is_banned', 'joined_at'],
  })
  declare members: ManyToMany<typeof User>
}
