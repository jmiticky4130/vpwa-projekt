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
import { useRouter } from 'vue-router'
import { useChannelStore } from 'src/stores/channel-store'
import { useUserStore } from 'src/stores/user-store'
import { useNotify } from 'src/util/notification'
import { storeToRefs } from 'pinia'
import type { Channel } from 'src/types/channel'

const props = defineProps<{ channelName?: string }>()
const emit = defineEmits<{ submit: [value: string] }>()

const message = ref('')
const placeholder = computed(() => `Message #${props.channelName}`)

type Command = { name: 'join' | 'public' | 'private' | 'quit' | 'cancel'; args: string[] }

function tryParseCommand(value: string): Command | null {
  if (!value.startsWith('/')) return null
  const parts = value.split(/\s+/)
  if (parts.length === 0 || !parts[0]) return null
  const cmdName = parts[0].slice(1).toLowerCase()
  // Support: /join channel
  if (cmdName === 'join') {
    const arg = parts[1]
    if (arg) {
      return { name: 'join', args: [arg] }
    }
  }
  // Support: /public or /private
  if (cmdName === 'public') {
    return { name: 'public', args: [] as string[] }
  }
  if (cmdName === 'private') {
    return { name: 'private', args: [] as string[] }
  }
  if (cmdName === 'quit') {
    return { name: 'quit', args: [] as string[] }
  }
  if (cmdName === 'cancel') {
    return { name: 'cancel', args: [] as string[] }
  }
  return null
}

const router = useRouter()
const channelStore = useChannelStore()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const {
  notifyJoinedChannel,
  notifyPrivateChannelBlocked,
  notifyChannelCreated,
  notifyCreatorOnlyPrivacy,
  notifyChannelAlreadyState,
  notifyChannelPrivacyUpdated,
  notifyChannelDeleted,
  notifyLeftChannel,
} = useNotify()

async function handleCommand(cmd: Command) {
  if (cmd.name === 'join') {
    const targetNameRaw = cmd.args.join(' ').trim()
    if (!targetNameRaw) return
    const targetName = targetNameRaw.replace(/^#/, '')

    const ch = channelStore.findByName(targetName)
    if (ch) {
      if (ch.public) {
        await router.push({ name: 'channel', params: { slug: ch.name } })
        notifyJoinedChannel(ch.name)
      } else {
        notifyPrivateChannelBlocked(ch.name)
      }
      return
    }

    const creatorId = currentUser.value?.id ?? 1
    const payload: Channel = {
      id: 0,
      name: targetName,
      public: true,
      creatorId,
    }
    const created = channelStore.addChannel(payload)
    await router.push({ name: 'channel', params: { slug: created.name } })
    notifyChannelCreated(created.name, created.public ? 'public' : 'private')
    return
  }

  if (cmd.name === 'public' || cmd.name === 'private') {
    const currentName = props.channelName || ''
    const ch = currentName ? channelStore.findByName(currentName) : undefined
    if (!ch) return
  const isCreator = currentUser.value?.id === ch.creatorId
    if (!isCreator) {
      notifyCreatorOnlyPrivacy()
      return
    }
    const targetPublic = cmd.name === 'public'
    if (ch.public === targetPublic) {
      notifyChannelAlreadyState(targetPublic)
      return
    }
    channelStore.setPrivacy(ch.name, targetPublic)
    notifyChannelPrivacyUpdated(targetPublic)
    return
  }

  if (cmd.name === 'quit' || cmd.name === 'cancel') {
    const currentName = props.channelName || ''
    if (!currentName) return
    const ch = channelStore.findByName(currentName)
  const isCreator = currentUser.value?.id != null && ch?.creatorId === currentUser.value.id
    if (isCreator) {
      notifyChannelDeleted(currentName)
      await router.push({ path: '/' })
    } else {
      notifyLeftChannel(currentName)
      await router.push({ path: '/' })
    }
  }
}

async function submit() {
  const value = message.value.trim()
  if (!value) return
  const cmd = tryParseCommand(value)
  if (cmd) {
    await handleCommand(cmd)
  } else {
    emit('submit', value)
  }
  message.value = ''
}

function onEnter() {
  void submit()
}
</script>

<style scoped>
.channel-text-field {
  position: fixed;
  left: 220px;
  right: 0;
  bottom: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  justify-content: flex;
  gap: 8px;
  z-index: 1000;
}
.text-field-input {
  width: 100%;
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
