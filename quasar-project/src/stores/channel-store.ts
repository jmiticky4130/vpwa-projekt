import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { Channel } from 'src/contracts/Channel'
import channelService from 'src/services/ChannelsService'
import { useAuthStore } from './auth-store'
import { useMessageStore } from './message-store'

export const useChannelStore = defineStore('channels', () => {
  const channels = ref<Channel[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)
  const newlyAccepted = ref<Set<string>>(new Set())
  const membersVersion = ref<Record<string, number>>({})

  const setError = (e: unknown) => {
    if (e instanceof Error) error.value = e.message
    else error.value = 'Unknown error'
  }

  function markAsNew(channelName: string) {
    newlyAccepted.value.add(channelName.toLowerCase())
  }

  function unmarkAsNew(channelName: string) {
    newlyAccepted.value.delete(channelName.toLowerCase())
  }

  function isNew(channelName: string) {
    return newlyAccepted.value.has(channelName.toLowerCase())
  }

  function incrementMembersVersion(channelName: string) {
    const key = channelName.toLowerCase()
    membersVersion.value[key] = (membersVersion.value[key] || 0) + 1
  }

  function removeChannelLocal(channelName: string) {
    const idx = channels.value.findIndex(c => c.name.toLowerCase() === channelName.toLowerCase())
    if (idx !== -1) {
      channels.value.splice(idx, 1)
    }
    // Also disconnect socket
    const ms = useMessageStore()
    ms.leave(channelName)
  }

  async function refresh(): Promise<void> {
    loading.value = true
    error.value = null
    try {
      const list = await channelService.list()
      console.log('Channel list refreshed:', list);
      // Normalize optional fields
      channels.value = list.map((c: Channel) => {
        const banned = (c as unknown as { banned?: number[] }).banned ?? []
        const kickVotes = (c as unknown as { kickVotes?: Record<string, number[]> }).kickVotes ?? ({} as Record<string, number[]>)
        return {
          ...c,
          members: Array.isArray(c.members) ? c.members : [],
          banned,
          kickVotes,
        }
      })
    } catch (e) {
      setError(e)
    } finally {
      loading.value = false
    }
  }

  // Return only channels the current auth user can access; optional newchannels sorting retained
  function list(params?: { userId?: number | null; newchannels?: string[] }) {
    
    const auth = useAuthStore()
    const userId = params?.userId ?? auth.user?.id ?? null
    // Merge params.newchannels with store's newlyAccepted
    const newSet = new Set([
      ...(params?.newchannels ?? []).map((s) => s.toLowerCase()),
      ...newlyAccepted.value
    ])
    
    return [...channels.value]
      .filter((c) => userId != null && Array.isArray(c.members) && c.members.includes(userId))
      .sort((a, b) => {
        const aNew = newSet.has(a.name.toLowerCase())
        const bNew = newSet.has(b.name.toLowerCase())
        if (aNew !== bNew) return aNew ? -1 : 1 // New channels first
        return a.name.localeCompare(b.name)
      })
  }

  function findByName(name: string): Channel | undefined {
    return channels.value.find((c) => c.name.toLowerCase() === name.toLowerCase());
  }

  async function addChannel(payload: { name: string; isPublic: boolean }): Promise<Channel | null> {
    try {
      const ch = await channelService.create(payload)
      // Ensure it appears in list for current user
      await refresh()
      return ch
    } catch (e) {
      setError(e)
      return null
    }
  }

  async function addMember(name: string): Promise<boolean> {
    try {
      await channelService.join({ name })
      await refresh()
      return true
    } catch (e) {
      setError(e)
      return false
    }
  }

  async function removeMember(name: string) {
    try {
      await channelService.leave({ name })
      // Disconnect socket for this channel
      const ms = useMessageStore()
      ms.leave(name)
      await refresh()
    } catch (e) {
      setError(e)
    }
  }

  async function revokeMember(name: string, nickname: string) {
    try {
      await channelService.revoke({ name, nickname })
      await refresh()
      return true
    } catch (e) {
      setError(e)
      return false
    }
  }

  async function setPrivacy(name: string, isPublic: boolean) {
    try {
      await channelService.setPrivacy({ name, public: isPublic })
      await refresh()
    } catch (e) {
      setError(e)
    }
  }

  async function removeChannel(name: string, uid: number | null) {
    if (uid == null) return
    const ch = findByName(name)
    if (!ch) return
    if (ch.creatorId !== uid) return
    try {
      await channelService.remove({ name })
      // Disconnect socket for this channel
      const ms = useMessageStore()
      ms.leave(name)
      await refresh()
    } catch (e) {
      setError(e)
    }
  }

  async function kickMember(name: string, nickname: string) {
    try {
      const result = await channelService.kick({ name, nickname })
      await refresh()
      return result
    } catch (e) {
      setError(e)
      return null
    }
  }

  return {
  channels,
  loading,
  error,
  refresh,
    list,
    findByName,
    addChannel,
    setPrivacy,
    addMember,
    removeMember,
    revokeMember,
    kickMember,
    removeChannel,
    markAsNew,
    unmarkAsNew,
    isNew,
    membersVersion,
    incrementMembersVersion,
    removeChannelLocal
  };
});
