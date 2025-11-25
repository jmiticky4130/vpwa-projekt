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
          <h4 class="q-ma-none text-white ellipsis"># {{ channel.name }}</h4>
        </header>
        <div class="channel-sub text-grey-5" v-if="channel">
          You are viewing <strong>{{ channel.name }}</strong>
        </div>
        <div class="messages-wrapper">
          <ChannelMessageList :channelKey="channel.name.toLowerCase()" ref="messageListRef" />
        </div>
      </div>
      <div class="user-list-panel">
        <div class="user-list-header row q-pa-sm q-gutter-sm">
          <div class="row q-gutter-xs full-width justify-center">
            <q-btn
              :color="panelMode === 'users' ? 'primary' : 'grey-8'"
              label="Users"
              dense
              no-caps
              class="col"
              @click="panelMode = 'users'"
            />
            <q-btn
              :color="panelMode === 'invites' ? 'primary' : 'grey-8'"
              label="Invites"
              dense
              no-caps
              class="col"
              @click="panelMode = 'invites'"
            >
              <q-badge color="red" floating v-if="inviteCount > 0">{{ inviteCount }}</q-badge>
            </q-btn>
          </div>
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
        @listMembers="handleListMembers"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ChannelTextField from 'src/components/ChannelTextField.vue';
import UserList from 'src/components/UserList.vue';
import InviteList from 'src/components/InviteList.vue';
import { useAuthStore } from 'src/stores/auth-store';
import { storeToRefs } from 'pinia';
import { useChannelStore } from 'src/stores/channel-store';
import { useMessageStore } from 'src/stores/message-store';
import { useInviteStore } from 'src/stores/invite-store';
import type { Channel } from 'src/contracts/Channel';
import type { User } from 'src/contracts';
import usersService from '../services/UsersService';
import ChannelMessageList from 'src/components/ChannelMessageList.vue';
import { usePresenceStore } from 'src/stores/presence-store';

const route = useRoute();
const router = useRouter();
const channelStore = useChannelStore();
const messageStore = useMessageStore();
const inviteStore = useInviteStore();

const channel = computed<Channel | undefined>(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});

// Redirect if channel is removed (e.g. kicked/revoked)
watch(
  () => channel.value,
  (val) => {
    if (!val && route.name === 'channel') {
      void router.push('/');
    }
  }
);


const auth = useAuthStore();
const { user: currentUser } = storeToRefs(auth);
const currentUserEmail = computed(() => currentUser.value?.email ?? '');

const channelCreatorLabel = computed(() => {
  const ch = channel.value;
  if (!ch || ch.creatorId == null) return "Loading...";
  const creator = channelUsers.value.find((u) => u.id === ch.creatorId);
  return creator ? creator.nickname : "Loading...";
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

const inviteCount = computed(() => inviteStore.invites.length)

onMounted(() => {
  void inviteStore.refresh()
})

watch(
  () => channel.value?.id,
  async (id) => {
    channelUsers.value = []
    if (!id) return
    // Reset panel mode to users when switching channels
    panelMode.value = 'users'
    await refreshChannelUsers()
  },
  { immediate: true }
)

watch(
  () => {
    const name = channel.value?.name
    if (!name) return 0
    return channelStore.membersVersion[name.toLowerCase()] || 0
  },
  async (newVersion, oldVersion) => {
    if (newVersion !== oldVersion) {
      console.log(`[ChannelPage] Members version changed to ${newVersion}, refreshing...`)
      await refreshChannelUsers()
    }
  }
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
          // Scroll to bottom after fetch
          messageListRef.value?.scrollToBottom()
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

const messageListRef = ref<InstanceType<typeof ChannelMessageList> | null>(null);

function handleSystem(text: string) {
  console.log('Received system message in ChannelPage:', text);
  if (messageListRef.value) {
    console.log('Adding system message to list');
    messageListRef.value.addSystemMessage(text);
  } else {
    console.warn('messageListRef is null');
  }
}

function handleListMembers() {
  if (!channel.value) return;
  const userList = channelUsers.value.map((u) => u.nickname).join(', ');
  handleSystem(`Members in #${channel.value.name}: ${userList}`);
}
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
