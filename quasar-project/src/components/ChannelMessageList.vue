<template>
  <div class="message-list" ref="listEl">
    <div
      v-for="m in messages"
      :key="m.id"
      :class="['msg-row', { 'msg-row--own': isOwn(m) }]"
    >
      <!-- Author shown above message -->
      <div class="msg-author" :aria-hidden="true">
        {{ isOwn(m) ? 'You' : (m.name || 'Anonymous') }}
      </div>

      <q-chat-message
        :text="[m.text]"
        :sent="isOwn(m)"
        :name="m.name"
        :stamp="m.stamp"
        text-color="white"
        bg-color="transparent"
        class="flat-message"
        size="sm"
        dense
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick, defineExpose } from 'vue'

type Message = {
  id: string
  text: string
  sent?: boolean
  name?: string
  stamp?: string
}

const props = defineProps<{ channelKey: string, currentUser: string }>()
const messages = ref<Message[]>([])
const listEl = ref<HTMLElement | null>(null)

const storageKey = () => `chat:${props.channelKey}`

function loadMessages() {
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      messages.value = JSON.parse(raw) as Message[]
    } else {
      messages.value = [
        { id: `s-${Date.now()}-1`, text: `Welcome to #${props.channelKey}!`, sent: false, name: 'System', stamp: new Date().toLocaleTimeString() },
      ]
      persist()
    }
  } catch {
    messages.value = []
  }
  scrollToBottom()
}

function persist() {
  localStorage.setItem(storageKey(), JSON.stringify(messages.value))
}

function scrollToBottom() {
  void nextTick(() => {
    const el = listEl.value
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  })
}

function appendMessage(text: string, opts?: Partial<Message>) {
  const msg: Message = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    sent: true,
    stamp: new Date().toLocaleTimeString(),
    ...opts,
  }
  messages.value.push(msg)
  persist()
  scrollToBottom()
}

function isOwn(m: Message) {
  if (m.name && props.currentUser) {
    return m.sent === true && m.name === props.currentUser
  }
  return m.sent === true
}

defineExpose({ appendMessage })

onMounted(loadMessages)
watch(() => props.channelKey, () => loadMessages())
</script>

<style scoped>
.message-list {
  flex: 1;
  min-height: 0;
  min-width: 0;
  overflow-y: auto;    /* vertical only */
  overflow-x: hidden;  /* hide horizontal scrollbar */
  padding: 8px 12px 16px 12px;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.msg-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start; 
  max-width: 100%;
}

.msg-row--own {
  align-items: flex-end;
}

.msg-author {
  font-size: 12px;
  line-height: 1;
  margin-bottom: 4px;
  color: rgba(255,255,255,0.65); 
  user-select: none;
  text-transform: none;
}

.msg-row--own .msg-author {
  color: rgba(130, 220, 190, 0.95); 
}

.flat-message {
  max-width: 75%; 
  min-width: 0;
  box-sizing: border-box;
}

.flat-message :deep(.q-message) {
  min-width: 0;
  max-width: 100%;
  box-sizing: border-box;
  color: rgba(255,255,255,0.95);
  padding: 6px 8px; 
  border-radius: 8px;
}

.msg-row:not(.msg-row--own) .flat-message :deep(.q-message-text) {
  background: rgba(255,255,255,0.04) !important;
  border: 1px solid rgba(255,255,255,0.04) !important;
  box-shadow: none !important;
  padding: 8px !important;
  color: rgba(255,255,255,0.92);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.msg-row--own .flat-message :deep(.q-message-text) {
  background: linear-gradient(135deg, rgba(38,198,218,0.16), rgba(0,188,212,0.12)) !important;
  border: 1px solid rgba(38,198,218,0.16) !important;
  box-shadow: none !important;
  padding: 8px !important;
  color: rgba(255,255,255,0.95);
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
}

.flat-message :deep(.q-message-stamp) {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
}
.flat-message :deep(.q-message-name) {
  display: none; /* hide q-chat-message's default name */
}
</style>
