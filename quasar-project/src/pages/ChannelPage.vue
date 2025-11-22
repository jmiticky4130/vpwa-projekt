<template>
  <q-page class="q-pa-md column channel-page-root">
    <div class="channel-main-layout" v-if="channel">
      <div class="messages-column">
        <header class="channel-header row items-center q-gutter-sm">
          <q-badge :color="channel.public ? 'green-7' : 'deep-orange-6'" class="text-white">
            {{ channel.public ? 'Public channel' : 'Private channel' }}
          </q-badge>
          <q-badge v-if="channelCreatorLabel" color="indigo-6" class="text-white">
            Creator: {{ channelCreatorLabel }}
          </q-badge>
          <h4 class="q-ma-none text-white ellipsis">{{ channel.name }}</h4>
        </header>
        <div class="channel-sub text-grey-5" v-if="channel">
          You are viewing <strong>{{ channel.name }}</strong>
        </div>
        <div class="messages-wrapper">
          <ChannelMessageList :channelKey="channel.name.toLowerCase()" />
        </div>
      </div>
      <div class="user-list-panel">
        <div class="user-list-header row q-pa-sm q-gutter-sm">
          <q-btn-toggle
            v-model="panelMode"
            toggle-color="primary"
            color="grey-8"
            dense
            :options="[
              {label: 'Users', value: 'users'},
              {label: 'Invites', value: 'invites'}
            ]"
          />
        </div>
        <div class="user-list-body">
          <component :is="panelComponent" v-bind="panelProps" />
        </div>
      </div>
    </div>
    <div class="absolute-bottom full-width">
      <ChannelTextField
        v-if="channel"
        :channelName="channel.name"
        @submit="handleSubmit"
        @system="handleSystem"
        @membersChanged="refreshChannelUsers"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import ChannelTextField from 'src/components/ChannelTextField.vue';
import UserList from 'src/components/UserList.vue';
import InviteList from 'src/components/InviteList.vue';
import { useAuthStore } from 'src/stores/auth-store';
import { storeToRefs } from 'pinia';
import { useChannelStore } from 'src/stores/channel-store';
import { useMessageStore } from 'src/stores/message-store';
import type { Channel } from 'src/contracts/Channel';
import type { User } from 'src/contracts';
import usersService from '../services/UsersService';
import ChannelMessageList from 'src/components/ChannelMessageList.vue';
import { usePresenceStore } from 'src/stores/presence-store';

const route = useRoute();
const channelStore = useChannelStore();
const messageStore = useMessageStore();

const channel = computed<Channel | undefined>(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});


const auth = useAuthStore();
const { user: currentUser } = storeToRefs(auth);
const currentUserEmail = computed(() => currentUser.value?.email ?? '');

const channelCreatorLabel = computed(() => {
  const ch = channel.value;
  if (!ch || ch.creatorId == null) return '';
  const creator = channelUsers.value.find((u) => u.id === ch.creatorId);
  return creator ? creator.nickname : String(ch.creatorId);
});

const channelUsers = ref<User[]>([]);
const presence = usePresenceStore();
const channelUsersWithStatus = computed<User[]>(() => {
  return channelUsers.value.map(u => {
    let status: 'online' | 'dnd' | 'offline'
    if (currentUser.value && u.id === currentUser.value.id) {
      // Auth store guarantees one of the three values
      status = currentUser.value.status as 'online' | 'dnd' | 'offline'
    } else {
      const p = presence.get(u.id)
      status = (p ?? 'offline') as 'online' | 'dnd' | 'offline'
    }
    return { ...u, status }
  })
});
const panelMode = ref<'users' | 'invites'>('users')
const panelComponent = computed(() => (panelMode.value === 'users' ? UserList : InviteList))
const panelProps = computed(() => {
  return panelMode.value === 'users'
    ? { users: channelUsersWithStatus.value, currentUserEmail: currentUserEmail.value }
    : {}
})

watch(
  () => channel.value?.id,
  async (id) => {
    channelUsers.value = []
    if (!id) return
    await refreshChannelUsers()
  },
  { immediate: true }
)


async function refreshChannelUsers() {
  const id = channel.value?.id
  if (!id) return
  try {
    const list = await usersService.getByChannel(id)
    channelUsers.value = list
  } catch (e) {
    console.warn('Failed to load channel users', e)
  }
}

// Join websocket channel when route/channel changes and set active
watch(
  () => channel.value?.name,
  async (name) => {
    if (!name) return
    const key = name.toLowerCase()
    try {
      messageStore.setActive(key)
      if(auth.user?.status !== 'offline'){
        await messageStore.join(key)
      }
    } catch (e) {
      console.warn('error when changing the active channel', e)
    }
  },
  { immediate: true }
)


// Reload channel data when user comes back online
watch(
  () => auth.user?.status,
  async (newStatus, oldStatus) => {
    if (newStatus === 'online' && oldStatus === 'offline') {
      const name = channel.value?.name
      if (name) {
        console.log('[ChannelPage] User came online, refreshing channel...')
        const key = name.toLowerCase()
        try {
          await messageStore.join(key)
          await refreshChannelUsers()
        } catch (e) {
          console.warn('Failed to refresh channel on online status', e)
        }
      }
    }
  }
)

async function handleSubmit(value: string) {
  const name = channel.value?.name
  if (!name) return
  try {
    await messageStore.addMessage({ channel: name.toLowerCase(), message: value })
  } catch (e) {
    console.error('Failed to send message', e)
  }
}

function handleSystem() { /* no-op while message list disabled */ }
</script>

<style scoped>
h4 {
  line-height: 1.2;
  width: 100%;
}

.q-page {
  gap: 12px;
  padding-bottom: 84px;
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
}

.channel-main-layout {
  display: flex;
  flex: 1 1 auto;
  min-height: 0;
  gap: 16px;
}
.messages-column {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.channel-header {
  flex: 0 0 auto;
  padding-bottom: 4px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.channel-sub {
  font-size: 12px;
  margin: 4px 0 8px;
}
.messages-wrapper {
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
}
.user-list-panel {
  flex: 0 0 260px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  max-height: 100%;
}
.user-list-header {
  flex: 0 0 auto;
}
.user-list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.user-list-body::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
