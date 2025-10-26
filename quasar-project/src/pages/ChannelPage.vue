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
          <q-btn
            @click="simulateAliceTyping()"
            color="secondary"
            label="Simulate typing"
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
          <ChannelMessageList ref="msgListRef" :channel-key="channelKey" />
        </div>
      </div>
      <UserList
        class="user-list-panel"
        :users="channelUsers"
        :current-user-email="currentUserEmail"
      />
    </div>
    <div class="absolute-bottom full-width">
      <ChannelTextField
        v-if="channel"
        :channelName="channel.name"
        @submit="handleSubmit"
        @system="handleSystem"
      />
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRoute } from 'vue-router';
import ChannelTextField from 'src/components/ChannelTextField.vue';
import ChannelMessageList from 'src/components/ChannelMessageList.vue';
import UserList from 'src/components/UserList.vue';
import { useUserStore } from 'src/stores/user-store';
import { storeToRefs } from 'pinia';
import { useNotify } from 'src/util/notification';
import { useChannelStore } from 'src/stores/channel-store';
import type { Channel } from 'src/types/channel';

const { notifyMessage } = useNotify();
const route = useRoute();
const channelStore = useChannelStore();

const channel = computed<Channel | undefined>(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});

const channelKey = computed(() => (channel.value ? channel.value.name.toLowerCase() : ''));

const msgListRef = ref<InstanceType<typeof ChannelMessageList> | null>(null);

async function onNotify(directed: boolean) {
  await notifyMessage(
    `Hello${directed ? `@${currentUserDisplay.value}` : ''} this is a test notification `,
    channel.value?.name || '',
    currentUserDisplay.value,
  );
}

function simulateAliceTyping() {
  const author = 'alice';
  const finalText = 'Hey there! This is a message that im writing hello hello hellohellohellohello';
  msgListRef.value?.simulateTyping(author, finalText);
}

const userStore = useUserStore();
const { currentUser } = storeToRefs(userStore);
const currentUserDisplay = computed(() => currentUser.value?.nickname ?? '');
const currentUserEmail = computed(() => currentUser.value?.email ?? '');

const channelCreatorLabel = computed(() => {
  const ch = channel.value;
  if (!ch || ch.creatorId == null) return '';
  const creator = userStore.users.find((u) => u.id === ch.creatorId);
  return creator ? creator.nickname : String(ch.creatorId);
});

const channelUsers = computed(() => {
  const ch = channel.value;
  if (!ch) return [];
  const ids = Array.isArray(ch.members) ? ch.members : [];
  return userStore.users.filter((u) => ids.includes(u.id));
});

function handleSubmit(value: string) {
  msgListRef.value?.appendMessage(value, { name: currentUserDisplay.value, state: 'sent' });
}

function handleSystem(value: string) {
  msgListRef.value?.appendMessage(value, { name: 'System', state: 'sent' });
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
  flex: 0 0 240px;
  min-height: 0;
  display: flex;
}
</style>
