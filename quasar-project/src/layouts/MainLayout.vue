<template>
  <q-layout view="lHh Lpr lFf" class="bg-dark">
    <q-header elevated class="bg-primary text-white">
      <q-toolbar>
        <q-toolbar-title class="app-title text-weight-medium cursor-pointer" @click="goHome">
          <img class="title-gif" src="../assets/sili-cat.gif" alt="Silly cat" />
          <span>ChatApp</span>
        </q-toolbar-title>
        <div v-if="currentUser" class="row items-center q-gutter-sm">
          <q-badge color="white" text-color="primary">{{ currentUser.email }}</q-badge>
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
        style="display: flex; height: calc(100vh - var(--q-header-height, 56px)); overflow: hidden"
      >
      <div style="position: relative">
          <ChannelNavigation v-if="currentUser" />
          <UserStatusBar v-if="currentUser"/>
        </div>
        <div style="flex: 1">
          <router-view />
        </div>
      </div>
    </q-page-container>
  </q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router';
import ChannelNavigation from 'src/components/ChannelNavigation.vue';
import UserStatusBar from 'src/components/UserStatusBar.vue';
import { useUserStore } from 'src/stores/user-store';
import { storeToRefs } from 'pinia';

const router = useRouter();
const userStore = useUserStore();
const { currentUser } = storeToRefs(userStore);

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
</style>
