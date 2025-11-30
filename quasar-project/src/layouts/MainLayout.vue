<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark">
    <q-header elevated class="bg-primary text-white">
      <q-tabs
        class="mobile-tabs full-width"
        v-if="($q.screen.xs || $q.screen.sm) && currentUser"
        v-model="mobileTab"
        align="justify"
        indicator-color="white"
        active-color="white"
      >
        <q-tab name="channels" label="Channels" />
        <q-tab name="chat" label="Chat" />
        <q-tab name="members" label="Members / Invites">
          <q-badge color="red" floating v-if="inviteCount > 0">{{ inviteCount }}</q-badge>
        </q-tab>
      </q-tabs>
      <q-toolbar v-else>
        <q-toolbar-title class="app-title text-weight-medium cursor-pointer" @click="goHome">
          <img class="title-gif" src="../assets/sili-cat.gif" alt="Silly cat" />
          <span>ChatApp</span>
        </q-toolbar-title>
        <div v-if="currentUser" class="row items-center q-gutter-sm">
          <q-badge color="white" style="font-size: 16px;" text-color="primary"> Logged in as: {{ currentUser.nickname }}</q-badge>
          <q-btn dense flat icon="logout" @click="logout" />
        </div>
        <div v-else class="row items-center q-gutter-sm">
          <q-btn dense flat label="Login" @click="goLogin" />
          <q-btn dense flat label="Sign up" @click="goSignup" />
        </div>
      </q-toolbar>
    </q-header>
    <q-page-container>
      <div
        class="layout-with-channels"
        style="display: flex; height: calc(100vh - var(--q-header-height, 50px)); overflow: hidden"
      >
        <template v-if="($q.screen.xs || $q.screen.sm) && currentUser">
          <div v-if="mobileTab === 'channels'" style="position: relative; width: 100%">
            <ChannelNavigation @selected="mobileTab = 'chat'" />
            <UserStatusBar />
          </div>

          <div v-else-if="mobileTab === 'chat'" style="flex: 1" class="mobile-hide-members">
            <router-view />
          </div>

          <div v-else-if="mobileTab === 'members'" style="flex: 1; display: flex; flex-direction: column; min-height: 0;">
            <div class="row q-pa-sm q-gutter-sm flex-shrink-0">
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
            <div class="mobile-members-list">
              <UserList 
                v-if="panelMode === 'users'" 
                :users="channelUsersWithStatus" 
                :current-user-email="currentUserEmail" 
              />
              <InviteList v-else />
            </div>
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
import { computed, ref, watch, onMounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';
import ChannelNavigation from 'src/components/ChannelNavigation.vue';
import UserStatusBar from 'src/components/UserStatusBar.vue';
import UserList from 'src/components/UserList.vue';
import InviteList from 'src/components/InviteList.vue';
import { useAuthStore } from 'src/stores/auth-store';
import { useChannelStore } from 'src/stores/channel-store';
import { useInviteStore } from 'src/stores/invite-store';
import { storeToRefs } from 'pinia';
import type { User } from 'src/contracts';
import usersService from 'src/services/UsersService';
import { usePresenceStore } from 'src/stores/presence-store';
import { useTypingStore } from 'src/stores/typing-store';
import ChannelService from 'src/services/ChannelService';

const router = useRouter();
const route = useRoute();
const auth = useAuthStore();
const channelStore = useChannelStore();
const inviteStore = useInviteStore();
const typingStore = useTypingStore();
const { user: currentUser } = storeToRefs(auth);
const mobileTab = ref<'channels' | 'chat' | 'members'>('chat');
const presence = usePresenceStore();

const panelMode = ref<'users' | 'invites'>('users');
const inviteCount = computed(() => inviteStore.invites.length);

// Watch for status changes
watch(
  () => currentUser.value?.status,
  (newStatus, oldStatus) => {
    if (newStatus === 'offline' && oldStatus !== 'offline') {
      // User went offline - clear all typing indicators they see
      typingStore.clearAll();
      
      // Also send stop typing if they were typing in current channel
      if (currentChannel.value) {
        const manager = ChannelService.in(currentChannel.value.name.toLowerCase());
        if (manager) {
          manager.sendTypingStop();
        }
      }
    }
  }
);

onMounted(() => {
  if (currentUser.value) {
    void inviteStore.refresh();
  }
});

// Refresh member list when mobile Members tab becomes active
watch(mobileTab, async (tab) => {
  if (tab === 'members') {
    if (currentChannel.value?.id) {
      try {
        channelUsers.value = await usersService.getByChannel(currentChannel.value.id)
      } catch (e) {
        console.warn('Failed to refresh members on tab change', e)
      }
    }
    void inviteStore.refresh();
  }
})

// Current channel + users for Members tab
const currentChannel = computed(() => {
  const slug = String(route.params.slug || '').toLowerCase();
  return channelStore.channels.find((c) => c.name.toLowerCase() === slug);
});
const channelUsers = ref<User[]>([]);
watch(
  () => currentChannel.value?.id,
  async (id) => {
    channelUsers.value = []
    if (!id) return
    try {
      channelUsers.value = await usersService.getByChannel(id)
    } catch (e) {
      console.warn('Failed to load channel users in layout', e)
    }
  },
  { immediate: true }
)

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
async function logout() {
  await auth.logout();
  void router.replace({ path: '/login', query: { redirect: route.fullPath } });
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
.mobile-members-list {
  flex: 1;
  overflow-y: auto;
  min-height: 0;
  scrollbar-width: none;
}
.mobile-members-list::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
