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
    const banned: number[] = Array.isArray(c.banned) ? c.banned : []
    // Ensure kickVotes is a simple object mapping targetId(string) -> unique voterId array
    const rawVotes = c.kickVotes || {}
    const kickVotes: Record<string, number[]> = {}
    for (const [k, v] of Object.entries(rawVotes)) {
      const unique = Array.isArray(v) ? Array.from(new Set(v)) : []
      kickVotes[k] = unique
    }
    return { ...c, members, banned, kickVotes }
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
    const ch: Channel = {
      id,
      name: payload.name,
      public: payload.public,
      creatorId: payload.creatorId,
      members,
      banned: Array.isArray(payload.banned) ? payload.banned : [],
      kickVotes: payload.kickVotes ?? {},
    }
    channels.value.push(ch)
    persist()
    return ch
  }

  function addMember(name: string, userId: number): boolean {
    const ch = findByName(name)
    if (!ch) return false
    if (ch.banned.includes(userId)) return false
    if (!ch.members.includes(userId)) {
      ch.members.push(userId)
      persist()
      return true
    }
    return false
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

  function isBanned(name: string, userId: number): boolean {
    const ch = findByName(name)
    if (!ch) return false
    const banned = Array.isArray(ch.banned) ? ch.banned : []
    return banned.includes(userId)
  }

  function banUser(name: string, targetUserId: number) {
    const ch = findByName(name)
    if (!ch) return
    // remove from members if present
    const idx = ch.members.indexOf(targetUserId)
    if (idx >= 0) ch.members.splice(idx, 1)
    if (!ch.banned.includes(targetUserId)) ch.banned.push(targetUserId)
    // clear any votes for this target
    delete ch.kickVotes[String(targetUserId)]
    persist()
  }

  function clearBan(name: string, targetUserId: number) {
    const ch = findByName(name)
    if (!ch) return
    ch.banned = ch.banned.filter((id) => id !== targetUserId)
    // also clear votes so they start fresh
    delete ch.kickVotes[String(targetUserId)]
    persist()
  }

  function addKickVote(name: string, voterUserId: number, targetUserId: number): { added: boolean; count: number; thresholdReached: boolean } {
    const ch = findByName(name)
    const thresholdKick = 2
    if (!ch) return { added: false, count: 0, thresholdReached: false }
    const key = String(targetUserId)
    const arr = Array.isArray(ch.kickVotes[key]) ? ch.kickVotes[key] : []
    const set = new Set(arr)
    const before = set.size
    set.add(voterUserId)
    const after = set.size
    ch.kickVotes[key] = Array.from(set)
    persist()
    const count = ch.kickVotes[key].length
    const thresholdReached = count >= thresholdKick
    return { added: after > before, count, thresholdReached }
  }

  return { channels, list, findByName, addChannel, setPrivacy, addMember, removeMember, removeChannel, isBanned, banUser, clearBan, addKickVote }
})