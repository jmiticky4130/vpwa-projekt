import { defineStore } from 'pinia';
import { ref } from 'vue';

export interface TypingUser {
  userId: number;
  nickname: string;
  content: string;
  lastTyped: number;
}

export const useTypingStore = defineStore('typing', () => {
  // Structure: { [channelName]: { [userId]: TypingUser } }
  const typingUsers = ref<Record<string, Record<number, TypingUser>>>({});

  function setTyping(channel: string, userId: number, nickname: string) {
    if (!typingUsers.value[channel]) {
      typingUsers.value[channel] = {};
    }
    if (!typingUsers.value[channel][userId]) {
      typingUsers.value[channel][userId] = {
        userId,
        nickname,
        content: '',
        lastTyped: Date.now(),
      };
    } else {
      typingUsers.value[channel][userId].lastTyped = Date.now();
    }
  }

  function setTypingContent(channel: string, userId: number, content: string) {
    if (typingUsers.value[channel] && typingUsers.value[channel][userId]) {
      typingUsers.value[channel][userId].content = content;
      typingUsers.value[channel][userId].lastTyped = Date.now();
    }
  }

  function removeTyping(channel: string, userId: number) {
    if (typingUsers.value[channel]) {
      delete typingUsers.value[channel][userId];
    }
  }

  function clearChannel(channel: string) {
    delete typingUsers.value[channel];
  }

  function clearAll() {
    typingUsers.value = {};
  }

  return {
    typingUsers,
    setTyping,
    setTypingContent,
    removeTyping,
    clearChannel,
    clearAll,
  };
});
