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

  // Not implemented in backend yet - legacy code
  function isBanned(name: string, userId: number): boolean {
    const ch = findByName(name);
    if (!ch) return false;
    const banned = Array.isArray(ch.banned) ? ch.banned : [];
    return banned.includes(userId);
  }

  // Not implemented in backend yet - legacy code
  function banUser(name: string, targetUserId: number) {
    const ch = findByName(name);
    if (!ch) return;
    const idx = ch.members.indexOf(targetUserId);
    if (idx >= 0) ch.members.splice(idx, 1);
    ch.banned = Array.isArray(ch.banned) ? ch.banned : []
    if (!ch.banned.includes(targetUserId)) ch.banned.push(targetUserId);
    ch.kickVotes = ch.kickVotes ?? {}
    delete ch.kickVotes[String(targetUserId)];
  }

  // Not implemented in backend yet - legacy code
  function clearBan(name: string, targetUserId: number) {
    const ch = findByName(name);
    if (!ch) return;
    ch.banned = (Array.isArray(ch.banned) ? ch.banned : []).filter((id) => id !== targetUserId);
    if (ch.kickVotes) delete ch.kickVotes[String(targetUserId)];
  }
  
  // Not implemented in backend yet - legacy code
  function addKickVote(name: string, voterUserId: number, targetUserId: number): { added: boolean; count: number; thresholdReached: boolean } {
    const ch = findByName(name);
    const thresholdKick = 2;
    if (!ch) return { added: false, count: 0, thresholdReached: false };
    const key = String(targetUserId);
    ch.kickVotes = ch.kickVotes ?? {}
    const arr = Array.isArray(ch.kickVotes[key]) ? ch.kickVotes[key] : [];
    const set = new Set(arr);
    const before = set.size;
    set.add(voterUserId);
    const after = set.size;
    ch.kickVotes[key] = Array.from(set);
    const count = ch.kickVotes[key].length;
    const thresholdReached = count >= thresholdKick;
    return { added: after > before, count, thresholdReached };
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
    isBanned,
    banUser,
    clearBan,
    addKickVote,
    markAsNew,
    unmarkAsNew,
    isNew
  };
});
