import Channel from '#models/channel'
import { DateTime } from 'luxon'
import logger from '@adonisjs/core/services/logger'
import { io } from './ws.js'

export async function startScheduler() {
  logger.info('[scheduler] Starting background scheduler')
  // Schedule daily cleanup
  setInterval(
    async () => {
      await cleanupInactiveChannels()
    },
    24 * 60 * 60 * 1000
  )
}

async function cleanupInactiveChannels() {
  try {
    const cutoffDate = DateTime.now().minus({ days: 30 })
    logger.info(`[scheduler] Running cleanup for channels inactive since ${cutoffDate.toISO()}`)

    const channelsToDelete = await Channel.query()
      .where('last_activity', '<', cutoffDate.toSQL())
      .orWhere((query) => {
        // delete if lastActivity is null AND createdAt is older than 30 days
        query.whereNull('last_activity').andWhere('created_at', '<', cutoffDate.toSQL())
      })

    if (channelsToDelete.length === 0) {
      logger.info('[scheduler] No inactive channels found to delete')
      return
    }

    logger.info(`[scheduler] Found ${channelsToDelete.length} inactive channels to delete`)

    for (const channel of channelsToDelete) {
      logger.info(`[scheduler] Deleting channel: ${channel.name} (ID: ${channel.id})`)

      // Notify clients and disconnect
      if (io) {
        const ns = io.of(`/channels/${channel.name}`)
        ns.emit('channel:deleted', { name: channel.name })
        ns.disconnectSockets()
      }

      await channel.delete()
    }

    logger.info('[scheduler] Cleanup complete')
  } catch (error) {
    logger.error('[scheduler] Error during channel cleanup:', error)
  }
}

startScheduler()
