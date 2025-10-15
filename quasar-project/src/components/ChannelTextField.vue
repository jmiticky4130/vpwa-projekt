<template>
  <div class="channel-text-field">
    <q-input
      v-model="message"
      :placeholder="placeholder"
      dense
      outlined
      autogrow
      class="text-field-input"
      @keyup.enter.exact.prevent="onEnter"
    />
    <q-btn icon="send" color="primary" unelevated round size="sm" @click="submit" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'

const props = defineProps<{ channelName?: string}>()
const emit = defineEmits<{ submit: [value: string] }>()

const message = ref('')
const placeholder = computed(() => `Message #${props.channelName}`)

function submit() {
  const value = message.value.trim()
  if (!value) return
  emit('submit', value)
  message.value = ''
}

function onEnter() {
  submit()
}
</script>

<style scoped>
.channel-text-field {
  position: fixed;
  left: 220px; /* align with ChannelNavigation width */
  right: 0;
  bottom: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: flex; /* left side */
  gap: 8px;
  z-index: 1000;
}
.text-field-input {
  width: 100%; /* keep input compact and anchored left */
}
.text-field-input :deep(textarea) {
  font-size: 18px;
  color: rgba(255, 255, 255, 0.85);
  caret-color: rgba(255, 255, 255, 0.9);
  min-height: 48px;
  line-height: 1.4;
}
.text-field-input :deep(textarea::placeholder) {
  color: rgba(255, 255, 255, 0.6);
}
</style>
