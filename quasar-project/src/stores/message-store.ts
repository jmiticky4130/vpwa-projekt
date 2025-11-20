import { defineStore } from 'pinia'
import type { RawMessage, SerializedMessage } from 'src/contracts'
import ChannelService from 'src/services/ChannelService'

export interface MessageStoreState {
  loading: boolean
  error: Error | null
  messages: Record<string, SerializedMessage[]>
  active: string | null
}

function initialState(): MessageStoreState {
  return {
    loading: false,
    error: null,
    messages: {},
    active: null,
  }
}

export const useMessageStore = defineStore('messages', {
  state: () => initialState(),
  getters: {
    joinedChannels(state): string[] {
      return Object.keys(state.messages)
    },
    currentMessages(state): SerializedMessage[] {
      return state.active !== null ? (state.messages[state.active] || []) : []
    },
    lastMessageOf: (state) => (channel: string): SerializedMessage | null => {
      const arr = state.messages[channel] || []
      if (arr.length === 0) return null
      return arr[arr.length - 1] as SerializedMessage
    },
  },
  actions: {
    setActive(channel: string | null) {
      this.active = channel
    },
    loadingStart() {
      this.loading = true
      this.error = null
    },
    loadingError(err: unknown) {
      this.loading = false
      this.error = err instanceof Error ? err : new Error('Unknown error')
    },
    loadingSuccess(channel: string, messages: SerializedMessage[]) {
      this.loading = false
      this.messages[channel] = messages
    },
    addIncomingMessage(channel: string, message: SerializedMessage) {
      if (!this.messages[channel]) {
        this.messages[channel] = []
      }
      // Prevent duplicate entries (can happen if the same websocket event
      // fires twice during HMR or double subscription scenarios)
      const exists = this.messages[channel].some((m) => m.id === message.id)
      if (!exists) {
        this.messages[channel].push(message)
      }
    },
    async join(channel: string): Promise<void> {
      try {
        this.loadingStart()
        let manager = ChannelService.in(channel)
        if (!manager) {
          manager = ChannelService.join(channel)
        }
        const messages = await manager.loadMessages()
        this.loadingSuccess(channel, messages)
        if (!this.active) this.active = channel
      } catch (e) {
        this.loadingError(e)
        throw e
      }
    },
    leave(channel: string | null): void {
      const leaving: string[] = channel !== null ? [channel] : Object.keys(this.messages)
      leaving.forEach((c) => {
        ChannelService.leave(c)
        if (this.active === c) this.active = null
        delete this.messages[c]
      })
    },
    async addMessage(payload: { channel: string; message: RawMessage }): Promise<SerializedMessage | undefined> {
      const { channel, message } = payload
      const manager = ChannelService.in(channel)
      if (!manager) return undefined
      const newMessage = await manager.addMessage(message)
      // Do not push here; the server broadcast via the
      // websocket 'message' event will call addIncomingMessage
      // and update the store for this channel.
      return newMessage
    },
    reset() {
      Object.assign(this, initialState())
    },
  },
})
