<template>
  <q-page class="q-pa-md column channel-page-root">
    <div class="channel-main-layout" v-if="channel">
      <div class="messages-column">
        <header class="channel-header row items-center q-gutter-sm">
          <q-badge :color="channel.public ? 'green-7' : 'deep-orange-6'" class="text-white">
            {{ channel.public ? 'Public channel' : 'Private channel' }}
          </q-badge>
          <q-btn @click="onNotify" color="primary" label="Notify" dense flat class="q-ml-xs" />
          <h4 class="q-ma-none text-white ellipsis">{{ channel.name }}</h4>
        </header>
        <div class="channel-sub text-grey-5" v-if="channel">
          You are viewing <strong>{{ channel.name }}</strong>
        </div>
        <div class="messages-wrapper">
          <ChannelMessageList
            ref="msgListRef"
            :channel-key="channelKey"
            :currentUser="currentUserDisplay"
          />
        </div>
      </div>
      <UserList class="user-list-panel" :users="users" :current-user-email="currentUserEmail" />
    </div>
    <div v-else class="column items-start q-gutter-sm">
      <h5 class="q-ma-none text-negative">Channel not found</h5>
      <q-btn color="primary" label="Back to home" :to="{ path: '/' }" />
    </div>
    <ChannelTextField v-if="channel" :channel-name="channel.name" @submit="handleSubmit" />
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import channelsData from 'src/../channels.json';
import ChannelTextField from 'src/components/ChannelTextField.vue';
import ChannelMessageList from 'src/components/ChannelMessageList.vue';
import UserList from 'src/components/UserList.vue';
import { useUserStore } from 'src/stores/user-store';
import { storeToRefs } from 'pinia';
import { useNotify } from 'src/util/notification';
import type { Channel } from 'src/types/channel';

const { notify } = useNotify();

const route = useRoute();

const allChannels = Array.isArray(channelsData) ? (channelsData as Channel[]) : [];

// find by slug (name)
const channel = computed<Channel | undefined>(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return allChannels.find((c) => c.name.toLowerCase() === slug);
});

// Channel key for storage (based on slug/name)
const channelKey = computed(() => (channel.value ? channel.value.name.toLowerCase() : ''));

// Access list methods
const msgListRef = ref<InstanceType<typeof ChannelMessageList> | null>(null);

function onNotify() {
  notify('Hello this is a test notification', channel.value?.name || '', currentUserDisplay.value);
}

// Current user display name (nickname fallback to email)
const userStore = useUserStore();
const { currentUser } = storeToRefs(userStore);
const currentUserDisplay = computed(() => currentUser.value?.nickname || 'Anonymous');
const currentUserEmail = computed(() => currentUser.value?.email || '');

// all users from user store (dummy in-memory)
const users = computed(() => userStore.users);

function appendToList(text: string) {
  msgListRef.value?.appendMessage(text, { name: currentUserDisplay.value, sent: true });
}

// Hook submit to append
function handleSubmit(value: string) {
  appendToList(value);
}
</script>

<style scoped>
h4 {
  line-height: 1.2;
  width: 100%; /* prevent growing on long names */
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
