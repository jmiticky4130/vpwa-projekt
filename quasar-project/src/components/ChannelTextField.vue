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
const router = useRouter()
const channelStore = useChannelStore()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const {
  notifyJoinedChannel,
  notifyAlreadyMember,
  notifyPrivateChannelBlocked,
  notifyChannelCreated,
  notifyCreatorOnlyPrivacy,
  notifyChannelAlreadyState,
  notifyChannelPrivacyUpdated,
  notifyChannelDeleted,
  notifyLeftChannel,
  notifyInviteSuccess,
  notifyRevokeSuccess,
  notifyInviteNotAllowedPrivate,
  notifyRevokeNotCreator,
  notifyUserNotFound,
  notifyAlreadyInChannel,
  notifyNotInChannel,
} = useNotify()

type Command = { name: 'join' | 'public' | 'private' | 'quit' | 'cancel' | 'invite' | 'revoke'; args: string[] }

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
  if (cmdName === 'invite') {
    const arg = parts.slice(1).join(' ').trim()
    if (arg) return { name: 'invite', args: [arg] }
  }
  if (cmdName === 'revoke') {
    const arg = parts.slice(1).join(' ').trim()
    if (arg) return { name: 'revoke', args: [arg] }
  }
  return null
}


async function handleCommand(cmd: Command) {
  if (cmd.name === 'join') {
    const targetNameRaw = cmd.args.join(' ').trim()
    if (!targetNameRaw) return
    const targetName = targetNameRaw.replace(/^#/, '')

    const ch = channelStore.findByName(targetName)
    if (ch) {
      const uid = currentUser.value?.id
      const isMember = uid != null && Array.isArray(ch.members) && ch.members.includes(uid)
      if (isMember) {
        await router.push({ name: 'channel', params: { slug: ch.name } })
        notifyAlreadyMember(ch.name)
        return
      }
      if (ch.public) {
        // ensure current user becomes a member when joining a public channel
        if (uid != null) {
          channelStore.addMember(ch.name, uid)
          // mark as new for this user so it floats to top -- NOT NEEDED
          // userStore.addNewChannel(uid, ch.name)
        }
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
      public: false,
      creatorId,
      members: [creatorId],
    }
    const created = channelStore.addChannel(payload)

    const uid = currentUser.value?.id
    if (uid != null) {
      channelStore.addMember(created.name, uid)
    }
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

  if (cmd.name === 'invite' || cmd.name === 'revoke') {
    const currentName = props.channelName || ''
    if (!currentName) return
    const ch = channelStore.findByName(currentName)
    if (!ch) return
    const isCreator = currentUser.value?.id === ch.creatorId
    // For invite: allow if public OR creator; For revoke: only creator
    if (cmd.name === 'invite' && !ch.public && !isCreator) {
      notifyInviteNotAllowedPrivate()
      return
    }
    if (cmd.name === 'revoke' && !isCreator) {
      notifyRevokeNotCreator()
      return
    }
    const identifierRaw = cmd.args.join(' ').trim()
    const identifier = identifierRaw.replace(/^@/, '')
    const target = userStore.users.find((u) => u.nickname.toLowerCase() === identifier.toLowerCase() || u.email.toLowerCase() === identifier.toLowerCase())
    if (!target) {
      notifyUserNotFound(identifier)
      return
    }
    const isMember = Array.isArray(ch.members) && ch.members.includes(target.id)
    if (cmd.name === 'invite') {
      if (isMember) {
        notifyAlreadyInChannel(target.nickname, ch.name)
        return
      }
  channelStore.addMember(ch.name, target.id)
  // Mark as new for target user so it floats to top
  userStore.addNewChannel(target.id, ch.name)
      notifyInviteSuccess(target.nickname, ch.name)
      return
    } else {
      if (!isMember) {
        notifyNotInChannel(target.nickname, ch.name)
        return
      }
      // prevent creator from revoking themselves by mistake
      if (target.id === ch.creatorId) {
        notifyNotInChannel(target.nickname, ch.name)
        return
      }
      channelStore.removeMember(ch.name, target.id)
      notifyRevokeSuccess(target.nickname, ch.name)
      return
    }
  }

  if (cmd.name === 'quit' || cmd.name === 'cancel') {
    const currentName = props.channelName || ''
    if (!currentName) return
    const ch = channelStore.findByName(currentName)
  const isCreator = currentUser.value?.id != null && ch?.creatorId === currentUser.value.id
    if (isCreator) {
      // Remove stored messages for this channel as well
      try {
        const slug = currentName.toLowerCase()
        localStorage.removeItem(`chat:${slug}`)
      } catch {
        console.log('Failed to remove channel messages from storage')
      }
      channelStore.removeChannel(currentName)
      notifyChannelDeleted(currentName)
      await router.push({ path: '/' })
    } else {
      const uid = currentUser.value?.id
      if (uid != null) channelStore.removeMember(currentName, uid)
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
