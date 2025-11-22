import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { useAuthStore } from 'src/stores/auth-store'
import type { RawMessage, SerializedMessage } from 'src/contracts'
import ChannelService from 'src/services/ChannelService'
import { useNotify } from 'src/util/notification'
import { AppVisibility } from 'quasar'

export interface MessageStoreState {
  loading: boolean
  error: Error | null
  messages: Record<string, SerializedMessage[]>
  active: string | null
  totals: Record<string, number>
}

export const useMessageStore = defineStore('messages', () => {
  // State
  const loading = ref(false)
  const error = ref<Error | null>(null)
  const messages = ref<Record<string, SerializedMessage[]>>({})
  // queue of raw messages written while offline; keyed by channel
  const offlineQueues = ref<Record<string, RawMessage[]>>({})
  const active = ref<string | null>(null)
  const totals = ref<Record<string, number>>({})

  // Getters
  const joinedChannels = computed(() => Object.keys(messages.value))
  
  const currentMessages = computed(() => {
    return active.value !== null ? (messages.value[active.value] || []) : []
  })

  const lastMessageOf = computed(() => (channel: string): SerializedMessage | null => {
    const arr = messages.value[channel] || []
    if (arr.length === 0) return null
    return arr[arr.length - 1] as SerializedMessage
  })

  // Actions
  function setActive(channel: string | null) {
    active.value = channel
  }

  function loadingStart() {
    loading.value = true
    error.value = null
  }

  function loadingError(err: unknown) {
    loading.value = false
    error.value = err instanceof Error ? err : new Error('Unknown error')
  }

  function loadingSuccess(channel: string, msgs: SerializedMessage[], total?: number) {
    loading.value = false
    messages.value[channel] = msgs
    if (total !== undefined) {
      totals.value[channel] = total
    }
  }

  function prependMessages(channel: string, msgs: SerializedMessage[]) {
    if (!messages.value[channel]) {
      messages.value[channel] = []
    }
    // Filter out duplicates to avoid UI glitches or key collisions
    const existingIds = new Set(messages.value[channel].map(m => m.id))
    const uniqueMsgs = msgs.filter(m => !existingIds.has(m.id))
    
    if (uniqueMsgs.length > 0) {
      messages.value[channel] = [...uniqueMsgs, ...messages.value[channel]]
    }
  }

  async function addIncomingMessage(channel: string, message: SerializedMessage) {
    if (!messages.value[channel]) {
      messages.value[channel] = []
    }
    // Prevent duplicate entries (can happen if the same websocket event
    // fires twice during HMR or double subscription scenarios)
    const exists = messages.value[channel].some((m) => m.id === message.id)
    if (!exists) {
      messages.value[channel].push(message)
      // Increment total count so infinite scroll knows there's more history relative to new size
      if (totals.value[channel] !== undefined) {
        totals.value[channel]++
      }
      if (channel !== active.value || !AppVisibility.appVisible) {
        await useNotify().notifyMessage(
          message.body,
          channel,
          message.author.nickname
        );
      }
    }

    console.log(`[message-store] Added incoming message to channel: ${channel} message body ${message.body}`);
  }

  async function join(channel: string): Promise<void> {
    try {
      loadingStart()
      // Ensure socket connection for live updates
      let manager = ChannelService.in(channel)
      if (!manager) {
        manager = ChannelService.join(channel)
      }
      // Fetch history via HTTP
      const response = await ChannelService.fetchMessages(channel, 0, 20)
      loadingSuccess(channel, response.messages, response.total)
      if (!active.value) active.value = channel
      // If there are queued offline messages for this channel, display them as pending
    } catch (e) {
      loadingError(e)
      throw e
    }
  }

  async function loadMore(channel: string): Promise<boolean> {
    const manager = ChannelService.in(channel)
    if (!manager) return false
    const currentCount = messages.value[channel]?.length ?? 0
    const total = totals.value[channel] ?? 0
    if (currentCount >= total) return false
    try {
      const response = await ChannelService.fetchMessages(channel, currentCount, 20)
      prependMessages(channel, response.messages)
      return response.messages.length > 0
    } catch (e) {
      console.error('Failed to load more messages', e)
      return false
    }
  }  
  
  function leave(channel: string | string[] | null): void {
    let leaving: string[] = []
    if (channel === null) {
      leaving = Object.keys(messages.value)
    } else if (Array.isArray(channel)) {
      leaving = channel
    } else {
      leaving = [channel]
    }

    console.log("[message-store] Leaving channels:", leaving)
    leaving.forEach((c) => {
      console.log(`[message-store] Leaving channel: ${c}`)
      try {
        ChannelService.leave(c)
      } catch (e) {
        console.warn(`[message-store] Failed to leave socket for ${c}`, e)
      }
      
      if (active.value === c) active.value = null
      delete messages.value[c]
      delete totals.value[c]
    })
  }

  function queueOffline(channel: string, raw: RawMessage) {
    if (!offlineQueues.value[channel]) offlineQueues.value[channel] = []
    offlineQueues.value[channel].push(raw)
  }

  async function flushOfflineQueue(channel: string): Promise<void> {
    const queued = offlineQueues.value[channel]
    if (!queued || queued.length === 0) return
    const manager = ChannelService.in(channel)
    if (!manager) {
      console.warn('[message-store] Cannot flush queue, socket not joined for', channel)
      return
    }
    console.log(`[message-store] Flushing ${queued.length} queued messages for ${channel}`)
    // send sequentially to preserve order
    for (const raw of queued) {
      try {
        await manager.addMessage(raw)
      } catch (e) {
        console.error('[message-store] Failed to send queued message, re-queueing', e)
        queueOffline(channel, raw) // put back (end) and abort remaining flush
        return
      }
    }
    // clear queue after success
    offlineQueues.value[channel] = []
  }

  async function flushAllOfflineQueues(): Promise<void> {
    const channels = Object.keys(offlineQueues.value)
    for (const ch of channels) {
      await flushOfflineQueue(ch)
    }
  }

  async function revalidateChannel(channel: string): Promise<void> {
    try {
      const response = await ChannelService.fetchMessages(channel, 0, 20)
      loadingSuccess(channel, response.messages, response.total)
    } catch (e) {
      console.warn('[message-store] Failed to revalidate channel', channel, e)
    }
  }

  async function addMessage(payload: { channel: string; message: RawMessage }): Promise<SerializedMessage | undefined> {
    const { channel, message } = payload
    const auth = useAuthStore()
    if (auth.user?.status === 'offline') {
      queueOffline(channel, message)
      console.log('[message-store] Queued message while offline for channel', channel)
      return undefined
    }
    const manager = ChannelService.in(channel)
    if (!manager) {
      console.warn('[message-store] Not joined to channel; joining implicitly before send', channel)
      ChannelService.join(channel)
    }
    const inst = ChannelService.in(channel)
    if (!inst) return undefined
    const newMessage = await inst.addMessage(message)
    return newMessage
  }

  function reset() {
    loading.value = false
    error.value = null
    messages.value = {}
    active.value = null
    totals.value = {}
    offlineQueues.value = {}
  }

  return {
    loading,
    error,
    messages,
    offlineQueues,
    active,
    totals,
    joinedChannels,
    currentMessages,
    lastMessageOf,
    setActive,
    loadingStart,
    loadingError,
    loadingSuccess,
    prependMessages,
    addIncomingMessage,
    join,
    loadMore,
    leave,
    addMessage,
    queueOffline,
    flushOfflineQueue,
    flushAllOfflineQueues,
    revalidateChannel,
    reset
  }
})
