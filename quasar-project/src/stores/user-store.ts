import { defineStore } from 'pinia';
import { ref } from 'vue';
import usersData from 'src/../users.json';
import type { User } from 'src/types/user';

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null);

  const users = ref<User[]>(
    (usersData as User[]).map((u) => ({
      id: u.id,
      nickname: u.nickname,
      firstName: u.firstName,
      lastName: u.lastName,
      email: u.email,
      password: u.password,
      status: 'offline' as const,
      showOnlyDirectedMessages: false,
      newchannels: [],
    })),
  );

  function setCurrentUser(user: User) {
    currentUser.value = user;
  }

  function logout() {
    setStatus('offline');
    currentUser.value = null;
  }

  function setStatus(status: 'online' | 'dnd' | 'offline') {
    if (currentUser.value) {
      currentUser.value.status = status;
    }
  }

  function setShowOnlyDirectedMessages(status: boolean) {
    if (currentUser.value) {
      currentUser.value.showOnlyDirectedMessages = status;
    }
  }


  function findByEmail(email: string): User | undefined {
    return users.value.find((u) => u.email === email);
  }

  function createUser(payload: Omit<User, 'id' | 'status' | 'newchannels' | 'showOnlyDirectedMessages'>): User {
    const nextId = users.value.reduce((m, v) => Math.max(m, v.id), 0) + 1;
    const newUser: User = {
      ...payload,
      id: nextId,
      status: 'online',
      showOnlyDirectedMessages: false,
      newchannels: [],
    };
    users.value.push(newUser);
    return newUser;
  }

  function addNewChannel(userId: number, channelName: string) {
    const u = users.value.find((x) => x.id === userId);
    if (!u) return;
    const slug = channelName.toLowerCase();
    if (!u.newchannels.includes(slug)) u.newchannels.unshift(slug);
  }

  function clearNewChannel(userId: number, channelName: string) {
    const u = users.value.find((x) => x.id === userId);
    if (!u) return;
    const slug = channelName.toLowerCase();
    u.newchannels = u.newchannels.filter((s) => s !== slug);
  }

  return {
    currentUser,
    users,
    setCurrentUser,
    logout,
    setStatus,
    setShowOnlyDirectedMessages,
    findByEmail,
    createUser,
    addNewChannel,
    clearNewChannel,
  };
});