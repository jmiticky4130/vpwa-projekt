import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import channelsData from 'src/../channels.json'
import type { Channel } from 'src/types/channel'

export const useChannelStore = defineStore('channels', () => {
  // Seed already includes creatorId; no migration needed
  const loadInitial = (): Channel[] => {
    try {
      if (typeof window !== 'undefined') {
        const raw = window.localStorage.getItem('channels')
        if (raw) {
          const parsed = JSON.parse(raw) as Channel[]
          if (Array.isArray(parsed)) return parsed
        }
      }
    } catch (e) {
            console.error(e)
    }
    return Array.isArray(channelsData) ? (channelsData as Channel[]) : []
  }

  const loaded = loadInitial()
  const channels = ref<Channel[]>(loaded)

  const persist = () => {
    try {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('channels', JSON.stringify(channels.value))
      }
    } catch (e) {
      console.error(e)
    }
  }


  const nextId = computed(() => channels.value.reduce((m, v) => Math.max(m, v.id || 0), 0) + 1)

  function list() {
    return channels.value
  }

  function findByName(name: string): Channel | undefined {
    return channels.value.find((c) => c.name.toLowerCase() === name.toLowerCase())
  }

  function addChannel(payload: Channel): Channel {
    const exists = findByName(payload.name)
    if (exists) return exists
    const id = payload.id ?? nextId.value
    const ch: Channel = { id, name: payload.name, public: payload.public, creatorId: payload.creatorId }
    channels.value.push(ch)
    persist()
    return ch
  }

  function setPrivacy(name: string, isPublic: boolean) {
    const ch = findByName(name)
    if (ch) {
      ch.public = isPublic
      persist()
    }
  }

  return { channels, list, findByName, addChannel, setPrivacy }
})
