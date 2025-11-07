import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Hash from '@adonisjs/core/services/hash'

import User from '#models/user'
import Channel from '#models/channel'
import Message from '#models/message'

export default class extends BaseSeeder {
  public async run() {
    // 1) Users
    const users = await Promise.all(
      [
        {
          firstName: 'Alice',
          lastName: 'Novak',
          nickname: 'alice',
          email: 'alice@example.com',
          password: 'secret123',
        },
        {
          firstName: 'Bob',
          lastName: 'Kovac',
          nickname: 'bob',
          email: 'bob@example.com',
          password: 'secret123',
        },
        {
          firstName: 'Eve',
          lastName: 'Horak',
          nickname: 'eve',
          email: 'eve@example.com',
          password: 'secret123',
        },
      ].map(async (u) => {
        return User.create({
          firstName: u.firstName,
          lastName: u.lastName,
          nickname: u.nickname,
          email: u.email,
          passwordHash: await Hash.make(u.password),
        })
      })
    )

    const [alice, bob, eve] = users

    // 2) Channels
    const [general, random] = await Channel.createMany([
      { name: 'general', createdBy: alice.id, lastActivity: DateTime.now() },
      { name: 'random', createdBy: bob.id, lastActivity: DateTime.now() },
    ])

    // 3) Memberships (many-to-many)
    await alice.related('channels').attach({
      [general.id]: {
        created_at: DateTime.now().toJSDate(),
        updated_at: DateTime.now().toJSDate(),
      },
      [random.id]: { created_at: DateTime.now().toJSDate(), updated_at: DateTime.now().toJSDate() },
    })
    await bob.related('channels').attach({
      [general.id]: {
        created_at: DateTime.now().toJSDate(),
        updated_at: DateTime.now().toJSDate(),
      },
      [random.id]: { created_at: DateTime.now().toJSDate(), updated_at: DateTime.now().toJSDate() },
    })
    await eve.related('channels').attach({
      [general.id]: {
        created_at: DateTime.now().toJSDate(),
        updated_at: DateTime.now().toJSDate(),
      },
    })

    // 4) Messages
    await Message.createMany([
      {
        channelId: general.id,
        authorId: alice.id,
        body: 'Welcome to #general!',
        createdAt: DateTime.now(),
      },
      { channelId: general.id, authorId: bob.id, body: 'Hi everyone', createdAt: DateTime.now() },
      {
        channelId: random.id,
        authorId: eve.id,
        body: 'Random thoughts',
        createdAt: DateTime.now(),
      },
    ])
  }
}
