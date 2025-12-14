import { defineStore } from 'pinia'
import { ref } from 'vue'

export type PresenceStatus = 'online' | 'dnd' | 'offline'

export const usePresenceStore = defineStore('presence', () => {
  const statuses = ref<Record<number, PresenceStatus>>({})

  function set(userId: number, status: PresenceStatus) {
    const prev = statuses.value[userId]
    if (prev === status) {
      // Skip redundant log updates
      return
    }
    console.log(`[presence] Update received for user ${userId}: ${prev ?? 'unset'} -> ${status}`)
    statuses.value[userId] = status
  }

  function get(userId: number): PresenceStatus {
    return statuses.value[userId] ?? 'offline'
  }

  function reset() {
    console.log('[presence] Resetting all presence statuses')
    statuses.value = {}
  }

  return { statuses, set, get, reset }
})
