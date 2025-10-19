import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import channelsData from 'src/../channels.json'
import type { Channel } from 'src/types/channel'

export const useChannelStore = defineStore('channels', () => {
  const loadInitial = (): Channel[] => {
    return Array.isArray(channelsData) ? (channelsData as Channel[]) : []
  }

  const loaded = loadInitial()
  // Ensure channels have members array; default to [creatorId]
  const normalizedLoaded: Channel[] = loaded.map((c: Channel) => {
    const members: number[] = Array.isArray(c.members)
      ? c.members
      : (typeof c.creatorId === 'number' ? [c.creatorId] : [])
    return { ...c, members }
  })
  const channels = ref<Channel[]>(normalizedLoaded)

  const persist = () => {
    if (typeof window === 'undefined') return
    try {
      window.localStorage.setItem('channels', JSON.stringify(channels.value))
    } catch (e) {
      console.error(e)
    }
  }

  const nextId = computed(() => channels.value.reduce((m, v) => Math.max(m, v.id || 0), 0) + 1)
  
  // Return only channels the user can access; if newchannels is provided, sort those to the top
  function list(channelParams?: { userId?: number | null; newchannels?: string[] }) {
    const userId = channelParams?.userId ?? null
    const newSet = new Set((channelParams?.newchannels ?? []).map((s) => s.toLowerCase()))
    return [...channels.value]
      .filter((c) => userId != null && Array.isArray(c.members) && c.members.includes(userId))
      .sort((channelA, channelB) => {
        const newChannelA = newSet.has(channelA.name.toLowerCase())
        const newChannelB = newSet.has(channelB.name.toLowerCase())
        if (newChannelA !== newChannelB) return newChannelB ? 1 : -1
        return channelA.name.localeCompare(channelB.name)
      })
  }



  function findByName(name: string): Channel | undefined {
    return channels.value.find((c) => c.name.toLowerCase() === name.toLowerCase())
  }

  function addChannel(payload: Channel): Channel {
    const exists = findByName(payload.name)
    if (exists) return exists
    const id = typeof payload.id === 'number' && payload.id > 0 ? payload.id : nextId.value
    const members = Array.isArray(payload.members)
      ? payload.members
      : (typeof payload.creatorId === 'number' ? [payload.creatorId] : [])
    const ch: Channel = { id, name: payload.name, public: payload.public, creatorId: payload.creatorId, members }
    channels.value.push(ch)
    persist()
    return ch
  }

  function addMember(name: string, userId: number) {
    const ch = findByName(name)
    if (ch && !ch.members.includes(userId)) {
      ch.members.push(userId)
      persist()
    }
  }

  function removeMember(name: string, userId: number) {
    const ch = findByName(name)
    if (ch) {
      const idx = ch.members.indexOf(userId)
      if (idx >= 0) {
        ch.members.splice(idx, 1)
        persist()
      }
    }
  }

  function setPrivacy(name: string, isPublic: boolean) {
    const ch = findByName(name)
    if (ch) {
      ch.public = isPublic
      persist()
    }
  }

  function removeChannel(name: string) {
    const idx = channels.value.findIndex((c) => c.name.toLowerCase() === name.toLowerCase())
    if (idx >= 0) {
      channels.value.splice(idx, 1)
      persist()
    }
  }

  return { channels, list, findByName, addChannel, setPrivacy, addMember, removeMember, removeChannel }
})
