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
          <q-btn
            @click="onNotify(false)"
            color="primary"
            label="Notify"
            dense
            flat
            class="q-ml-xs"
          />
          <q-btn
            @click="onNotify(true)"
            color="primary"
            label="Direct Notify"
            dense
            flat
            class="q-ml-xs"
          />
          <h4 class="q-ma-none text-white ellipsis">{{ channel.name }}</h4>
        </header>
        <div class="channel-sub text-grey-5" v-if="channel">
          You are viewing <strong>{{ channel.name }}</strong>
        </div>
        <div class="messages-wrapper">
          <!-- ChannelMessageList hidden/unused by request -->
        </div>
      </div>
      <div class="user-list-panel column bg-grey-10">
        <div class="q-pa-sm">
          <q-btn-toggle
            v-model="panelMode"
            spread
            no-caps
            toggle-color="primary"
            color="grey-9"
            text-color="white"
            :options="[
              {label: 'Users', value: 'users'},
              {label: 'Invites', value: 'invites'}
            ]"
          />
        </div>
        <div class="col relative-position">
          <component :is="panelComponent" v-bind="panelProps" class="absolute-full" />
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
import { useNotify } from 'src/util/notification';
import { useChannelStore } from 'src/stores/channel-store';
import type { Channel } from 'src/contracts/Channel';
import type { User } from 'src/contracts';
import usersService from '../services/UsersService';
import messagesService from '../services/MessagesService';

const { notifyMessage } = useNotify();
const route = useRoute();
const channelStore = useChannelStore();

const channel = computed<Channel | undefined>(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});

// const channelKey = computed(() => (channel.value ? channel.value.name.toLowerCase() : ''));

async function onNotify(directed: boolean) {
  await notifyMessage(
    `Hello${directed ? `@${currentUserDisplay.value}` : ''} this is a test notification `,
    channel.value?.name || '',
    currentUserDisplay.value,
  );
}

// Message list disabled; simulate typing removed

const auth = useAuthStore();
const { user: currentUser } = storeToRefs(auth);
const currentUserDisplay = computed(() => currentUser.value?.nickname ?? '');
const currentUserEmail = computed(() => currentUser.value?.email ?? '');

const channelCreatorLabel = computed(() => {
  const ch = channel.value;
  if (!ch || ch.creatorId == null) return '';
  const creator = channelUsers.value.find((u) => u.id === ch.creatorId);
  return creator ? creator.nickname : String(ch.creatorId);
});

const channelUsers = ref<User[]>([]);
const panelMode = ref<'users' | 'invites'>('users')
const panelComponent = computed(() => (panelMode.value === 'users' ? UserList : InviteList))
const panelProps = computed(() => {
  return panelMode.value === 'users'
    ? { users: channelUsers.value, currentUserEmail: currentUserEmail.value }
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
    // Fetch messages lazily on channel open (integration with UI can be added later)
    void messagesService.getByChannel(id)
  } catch (e) {
    console.warn('Failed to load channel users', e)
  }
}


function handleSubmit() { /* no-op while message list disabled */ }

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
  flex: 0 0 240px;
  min-height: 0;
  display: flex;
}
</style>
