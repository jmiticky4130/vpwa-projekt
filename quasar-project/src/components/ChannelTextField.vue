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
import { computed, ref } from 'vue';
import { useRouter } from 'vue-router';
import { useChannelStore } from 'src/stores/channel-store';
import { useAuthStore } from 'src/stores/auth-store';
import { useNotify } from 'src/util/notification';
import { storeToRefs } from 'pinia';

const props = defineProps<{ channelName?: string }>();
const emit = defineEmits<{ submit: [value: string]; system: [value: string]; membersChanged: []; listMembers: [] }>();
const message = ref('');
const placeholder = computed(() =>
  props.channelName ? `Message #${props.channelName}` : 'Type /join #channel to start or join one',
);
const router = useRouter();
const channelStore = useChannelStore();
const { user: currentUser } = storeToRefs(useAuthStore());
const {
  notifyJoinedChannel,
  notifyAlreadyMember,
  notifyPrivateChannelBlocked,
  //notifyBannedCannotJoin,
  notifyChannelCreated,
  notifyCreatorOnlyPrivacy,
  notifyChannelAlreadyState,
  notifyChannelPrivacyUpdated,
  notifyInviteNotAllowedPrivate,
  notifyChannelDeleted,
  notifyLeftChannel,
  notifyRevokeSuccess,
  notifyRevokeNotCreator,
  //notifyKickSuccess,
  //notifyKickNotCreator,
  notifyKickNotAllowedPrivate,
  notifyChannelAlreadyExists,
  //notifyChannelNotFound,
  // notifyRevokeNotCreator, (unused after removing revoke command handling)
  /*notifyChannelDeleted,
  notifyLeftChannel,
  notifyInviteSuccess,
  notifyRevokeSuccess,
  notifyUserNotFound,
  notifyAlreadyInChannel,
  notifyNotInChannel,
  notifyKickNotAllowedPrivate,
  notifyKickCannotKickCreator,
  notifyKickCannotKickSelf,
  notifyKickVoteAdded,
  notifyKickVoteDuplicate,
  notifyKickedByAdmin,
  notifyInviteBlockedBanned,*/
} = useNotify();

type Command = {
  name: 'join' | 'public' | 'private' | 'quit' | 'cancel' | 'invite' | 'revoke' | 'kick' | 'list';
  args: string[];
};

function tryParseCommand(value: string): Command | null {
  if (!value.startsWith('/')) return null;
  const parts = value.split(/\s+/);
  if (parts.length === 0 || !parts[0]) return null;
  const cmdName = parts[0].slice(1).toLowerCase();
  if (cmdName === 'join') {
    const args = parts.slice(1);
    if (args.length > 0) {
      return { name: 'join', args };
    }
  }
  if (cmdName === 'public') {
    return { name: 'public', args: [] as string[] };
  }
  if (cmdName === 'private') {
    return { name: 'private', args: [] as string[] };
  }
  if (cmdName === 'quit') {
    return { name: 'quit', args: [] as string[] };
  }
  if (cmdName === 'cancel') {
    return { name: 'cancel', args: [] as string[] };
  }
  if (cmdName === 'invite') {
    const arg = parts.slice(1).join(' ').trim();
    if (arg) return { name: 'invite', args: [arg] };
  }
  if (cmdName === 'revoke') {
    const arg = parts.slice(1).join(' ').trim();
    if (arg) return { name: 'revoke', args: [arg] };
  }
  if (cmdName === 'kick') {
    const arg = parts.slice(1).join(' ').trim();
    if (arg) return { name: 'kick', args: [arg] };
  }
  if (cmdName === 'list') {
    return { name: 'list', args: [] as string[] };
  }
  return null;
}

async function handleCommand(cmd: Command) {
  if (cmd.name === 'join') {
    const targetNameRaw = cmd.args[0]?.trim();
    const mode = cmd.args[1]?.toLowerCase(); // 'public' | 'private' | undefined

    if (!targetNameRaw) return;
    const targetName = targetNameRaw.replace(/^#/, '');

    // Check if channel exists on backend (covers channels user is not a member of)
    const exists = await channelStore.checkChannelExists(targetName);

    if (exists) {
      // If user explicitly requested to create a channel (by specifying mode), fail if it exists
      if (mode === 'public' || mode === 'private') {
        notifyChannelAlreadyExists(targetName);
        return;
      }

      // Otherwise, try to join existing channel
      const ch = channelStore.findByName(targetName);
      // If found in local store (user is member), navigate
      if (ch) {
        const uid = currentUser.value?.id;
        const isMember = uid != null && Array.isArray(ch.members) && ch.members.includes(uid);
        if (isMember) {
          await router.push({ name: 'channel', params: { slug: ch.name } });
          notifyAlreadyMember(ch.name);
          return;
        }
      }
      if (currentUser.value?.id != null) {
        const success = await channelStore.addMember(targetName);
        if (success) {
          await router.push({ name: 'channel', params: { slug: targetName } });
          notifyJoinedChannel(targetName);
        } else {
          notifyPrivateChannelBlocked(targetName);
        }
      }
      return;
    }
    const isPublic = mode === 'private' ? false : true;
    const payload: { name: string; isPublic: boolean } = {
      name: targetName,
      isPublic: isPublic,
    };
    const created = await channelStore.addChannel(payload);
    if (!created) return;
    const uid = currentUser.value?.id;
    if (uid != null) {
      // Backend already attaches creator, but for safety refresh membership
      await channelStore.addMember(created.name);
    }
    await router.push({ name: 'channel', params: { slug: created.name } });
    notifyChannelCreated(created.name, isPublic ? 'public' : 'private');
    return;
  }

  if (cmd.name === 'public' || cmd.name === 'private') {
    const currentName = props.channelName || '';
    const ch = currentName ? channelStore.findByName(currentName) : undefined;
    if (!ch) return;
    const isCreator = currentUser.value?.id === ch.creatorId;
    if (!isCreator) {
      notifyCreatorOnlyPrivacy();
      return;
    }
    const targetPublic = cmd.name === 'public';
    if (ch.public === targetPublic) {
      notifyChannelAlreadyState(targetPublic);
      return;
    }
    await channelStore.setPrivacy(currentName, targetPublic);
    notifyChannelPrivacyUpdated(targetPublic);
    return;
  }

  if (cmd.name === 'invite') {
    const currentName = props.channelName || '';
    if (!currentName) return;
    const ch = channelStore.findByName(currentName);
    if (!ch) return;
    const isCreator = currentUser.value?.id === ch.creatorId;
    if (!ch.public && !isCreator) {
      notifyInviteNotAllowedPrivate();
      return;
    }
    const identifierRaw = cmd.args.join(' ').trim();
    if (!identifierRaw) return;
    // Call invite store
    const { useInviteStore } = await import('src/stores/invite-store');
    const inviteStore = useInviteStore();
    const ok = await inviteStore.sendInvite(ch.name.toLowerCase(), identifierRaw.replace(/^@/, ''));
    if (ok) {
      // Existing notification helper
      const targetDisplay = identifierRaw.replace(/^@/, '');
      // notifyInviteSuccess available but not currently destructured; dynamic import notification for success
      const { useNotify } = await import('src/util/notification');
      useNotify().notifyInviteSuccess(targetDisplay, ch.name);
    }
    return;
  }

  if (cmd.name === 'revoke') {
    const currentName = props.channelName || '';
    if (!currentName) return;
    const ch = channelStore.findByName(currentName);
    if (!ch) return;
    const isCreator = currentUser.value?.id === ch.creatorId;
    if (!isCreator) {
      notifyRevokeNotCreator();
      return;
    }
    const identifierRaw = cmd.args.join(' ').trim();
    if (!identifierRaw) return;
    const nickname = identifierRaw.replace(/^@/, '');
    const ok = await channelStore.revokeMember(ch.name.toLowerCase(), nickname);
    if (ok) {
      notifyRevokeSuccess(nickname, ch.name);
      emit('membersChanged')
    }
    return;
  }

  if (cmd.name === 'kick') {
    const currentName = props.channelName || '';
    if (!currentName) return;
    const ch = channelStore.findByName(currentName);
    if (!ch) return;
    // Permission check handled by backend, but we can do a quick check for private channels
    const isCreator = currentUser.value?.id === ch.creatorId;
    if (!ch.public && !isCreator) {
      notifyKickNotAllowedPrivate();
      return;
    }
    const identifierRaw = cmd.args.join(' ').trim();
    if (!identifierRaw) return;
    const nickname = identifierRaw.replace(/^@/, '');
    const result = await channelStore.kickMember(ch.name.toLowerCase(), nickname);
    if (result && result.success) {
      const { useNotify } = await import('src/util/notification');
      useNotify().notifyKickMessage(result.message);
      if (result.kicked) {
        emit('membersChanged')
      }
    }
    return;
  }

  if (cmd.name === 'list') {
    emit('listMembers');
    return;
  }

  if (cmd.name === 'quit' || cmd.name === 'cancel') {
    const currentName = props.channelName || '';
    if (!currentName) return;
    const ch = channelStore.findByName(currentName);
    const isCreator = ch && currentUser.value?.id != null && ch.creatorId === currentUser.value.id;
    try {
      await channelStore.removeMember(currentName);
      if (isCreator) {
        notifyChannelDeleted(currentName);
      } else {
        notifyLeftChannel(currentName);
      }
      await router.push({ path: '/' });
    } catch {
      // optional: show error notify
    }
    return;
  }
}

async function submit() {
  const value = message.value.trim();
  if (!value) return;
  const cmd = tryParseCommand(value);
  if (cmd) {
    await handleCommand(cmd);
  } else {
    emit('submit', value);
  }
  message.value = '';
}

function onEnter() {
  void submit();
}
</script>

<style scoped>
.channel-text-field {
  position: absolute;
  width: 100%;
  bottom: 0;
  padding: 8px 12px;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  display: flex;
  align-items: center;
  gap: 8px;
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
