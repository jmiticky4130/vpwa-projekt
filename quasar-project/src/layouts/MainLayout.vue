<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark">
    <q-header elevated class="bg-primary text-white">
      <q-tabs
        v-if="$q.screen.xs && currentUser"
        v-model="mobileTab"
        indicator-color="white"
        active-color="white"
      >
        <q-tab name="channels" label="Channels" />
        <q-tab name="chat" label="Chat" />
        <q-tab name="members" label="Members" />
      </q-tabs>
      <q-toolbar v-else>
        <q-toolbar-title class="app-title text-weight-medium cursor-pointer" @click="goHome">
          <img class="title-gif" src="../assets/sili-cat.gif" alt="Silly cat" />
          <span class="hidden-xs-only">ChatApp</span>
        </q-toolbar-title>
        <div v-if="currentUser" class="row items-center q-gutter-sm hidden-xs-only">
          <q-badge color="white" text-color="primary">{{ currentUser.email }}</q-badge>
          <q-btn dense flat icon="logout" @click="logout" />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-btn v-if="!currentUser" dense flat label="Login" @click="goLogin" />
          <q-btn v-if="!currentUser" dense flat label="Sign up" @click="goSignup" />
        </div>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <div
        class="layout-with-channels"
        style="display: flex; height: calc(100vh - var(--q-header-height, 50px)); overflow: hidden"
        
      >
        <template v-if="$q.screen.xs && currentUser">
          <div v-if="mobileTab === 'channels'" style="position: relative; width: 100%">
            <ChannelNavigation />
            <UserStatusBar />
          </div>

          <div v-else-if="mobileTab === 'chat'" style="flex: 1" class="mobile-hide-members">
            <router-view />
          </div>

          <div v-else-if="mobileTab === 'members'" style="flex: 1">
            <UserList :users="channelUsers" :current-user-email="currentUserEmail" />
          </div>
        </template>

        <template v-else>
          <div v-if="currentUser" style="position: relative">
            <ChannelNavigation />
            <UserStatusBar />
          </div>
          <div style="flex: 1">
            <router-view />
          </div>
        </template>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ChannelNavigation from 'src/components/ChannelNavigation.vue';
import UserStatusBar from 'src/components/UserStatusBar.vue';
import UserList from 'src/components/UserList.vue';
import { useUserStore } from 'src/stores/user-store';
import { useChannelStore } from 'src/stores/channel-store';
import { storeToRefs } from 'pinia';
import type { User } from 'src/types/user';

const router = useRouter();
const route = useRoute();
const userStore = useUserStore();
const channelStore = useChannelStore();
const { currentUser } = storeToRefs(userStore);

// Mobile tabs state (xs only)
const mobileTab = ref<'channels' | 'chat' | 'members'>('chat');

// Current channel + users for Members tab
const currentChannel = computed(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});
const channelUsers = computed<User[]>(() => {
  const ch = currentChannel.value;
  if (!ch) return [] as User[];
  const ids = Array.isArray(ch.members) ? ch.members : [];
  return userStore.users.filter((u) => ids.includes(u.id));
});
const currentUserEmail = computed(() => currentUser.value?.email ?? '');

function goHome() {
  void router.push('/');
}
function goLogin() {
  void router.push('/login');
}
function goSignup() {
  void router.push('/signup');
}
function logout() {
  userStore.logout();
  void router.push('/login');
}
</script>

<style scoped>
.q-toolbar-title {
  user-select: none;
}
.app-title {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.title-gif {
  width: 24px;
  height: 24px;
  object-fit: cover;
  border-radius: 4px;
}
.mobile-hide-members :deep(.user-list-panel) {
  display: none !important;
}
</style>
