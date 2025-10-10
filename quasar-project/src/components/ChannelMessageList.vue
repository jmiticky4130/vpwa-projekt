<template>
  <div class="message-list" ref="listEl">
    <q-chat-message
      v-for="m in messages"
      :key="m.id"
      :text="[m.text]"
      :sent="m.sent"
      :name="m.name"
      :stamp="m.stamp"
      text-color="white"
      bg-color="transparent"
      class="flat-message"
      size="sm"
    />
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

const props = defineProps<{ channelKey: string }>()

const messages = ref<Message[]>([])
const listEl = ref<HTMLElement | null>(null)

const storageKey = () => `chat:${props.channelKey}`

function loadMessages() {
  try {
    const raw = localStorage.getItem(storageKey())
    if (raw) {
      messages.value = JSON.parse(raw) as Message[]
    } else {
      // starter sample per channel on first load
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

defineExpose({ appendMessage })

onMounted(loadMessages)
watch(() => props.channelKey, () => loadMessages())
</script>

<style scoped>
.message-list {
  flex: 1 1 auto;
  min-height: 0; /* allow proper flexbox scrolling */
  overflow-y: auto;
  padding: 8px 0 16px 0;
}

/* Flatten QChatMessage default bubbles */
.flat-message :deep(.q-message-text) {
  background: transparent !important;
  border: 0 !important;
  box-shadow: none !important;
  padding: 0 !important;
}
.flat-message :deep(.q-message)
{
  color: rgba(255,255,255,0.9);
}
.flat-message :deep(.q-message-stamp) {
  color: rgba(255,255,255,0.6);
}
.flat-message :deep(.q-message-name) {
  color: rgba(255,255,255,0.75);
}
</style>
