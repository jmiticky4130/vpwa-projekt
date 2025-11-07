<template>
  <div class="message-list" ref="listEl">
    <q-infinite-scroll
      @load="loadMoreMessages"
      :offset="100"
      reverse
      scroll-target=".message-list"
      :key="props.channelKey + userStatus"
    >
      <template v-slot:loading>
        <div class="row justify-center q-my-md">
          <q-spinner color="primary" name="dots" size="40px" />
        </div>
      </template>
      <div
        v-for="m in displayedMessages"
        :key="m.id"
        :class="[
          'msg-row',
          { 'msg-row--own': isOwn(m) },
          { 'msg-row--mention': isDirectedToCurrentUser(m) },
        ]"
      >
        <q-chat-message
          :key="m.id + '-' + m.state"
          :sent="isOwn(m)"
          :name="
            isOwn(m)
              ? 'You'
              : m.state === 'typing'
                ? `${m.name} is typing...`
                : m.state === 'peeking'
                  ? `${m.name}'s current preview of the message`
                  : m.name
          "
          :stamp="m.stamp"
          bg-color="transparent"
          text-color="white"
          class="flat-message"
          :class="['flat-message', `state-${m.state}`]"
          dense
        >
          <template v-if="m.state === 'typing'">
            <div @click="togglePeekingMesage(m.id)">
              <q-spinner-dots size="2rem" />
            </div>
          </template>
          <template v-else-if="m.state === 'peeking'">
            <div @click="togglePeekingMesage(m.id)">
              hello, this is current typed message preview
            </div>
          </template>
          <template v-else>
            <div>{{ m.text }}</div>
          </template>
        </q-chat-message>
      </div>
    </q-infinite-scroll>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, onMounted, computed } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';

type Message = {
  id: string;
  text: string;
  name: string;
  stamp: string;
  state: 'sent' | 'typing' | 'peeking';
};

const props = defineProps<{ channelKey: string }>();
const allMessages = ref<Message[]>([]);
const currMessages = ref<Message[]>([]);
// Track the last message that transitioned from typing->sent so it can be shown as the absolute bottom item
const lastFinishedId = ref<string | null>(null);
const displayedMessages = computed<Message[]>(() => {
  const live = currMessages.value.filter((m) => m.state === 'typing' || m.state === 'peeking');
  const last = lastFinishedId.value
    ? currMessages.value.filter((m) => m.id === lastFinishedId.value)
    : ([] as Message[]);
  const rest = currMessages.value.filter(
    (m) =>
      m.state !== 'typing' &&
      m.state !== 'peeking' &&
      (lastFinishedId.value ? m.id !== lastFinishedId.value : true),
  );
  // Order: normal sent messages, then live typing/peeking, and finally the just-finished message
  return [...rest, ...live, ...last];
});
const listEl = ref<HTMLElement | null>(null);
const loadedCount = ref(0);
const BATCH_SIZE = 20;

const { user } = storeToRefs(useAuthStore());
// Basic mode: assume online since per-user status store was removed
const userStatus = computed<'online' | 'dnd' | 'offline'>(() => 'online');
const currentUserDisplay = computed(() => user.value?.nickname ?? '');

function loadMessages() {
  // LocalStorage persistence removed; initialize with a simple welcome message only in-memory
  allMessages.value = [
    {
      id: `s-${Date.now()}-1`,
      text: `Welcome to #${props.channelKey}!`,
      state: 'sent',
      name: 'System',
      stamp: new Date().toLocaleTimeString(),
    },
  ];
  loadedCount.value = Math.min(BATCH_SIZE, allMessages.value.length);
  currMessages.value = allMessages.value.slice(allMessages.value.length - loadedCount.value);
  console.log('Loaded messages (non-persistent):', allMessages.value.length, 'Showing:', loadedCount.value);
  scrollToBottom();
}

function loadMoreMessages(index: number, done: (stop?: boolean) => void) {
  console.log('Request to load more messages');
  if (userStatus.value === 'offline') {
    done(true);
    return;
  }
  // Simulate async fetch delay
  setTimeout(() => {
    const remaining = allMessages.value.length - loadedCount.value;
    if (remaining <= 0) {
      console.log('No more messages to load');
      done(true);
      return;
    }
    console.log(`Loading more messages, ${remaining} remaining`);

    const take = Math.min(BATCH_SIZE, remaining);
    const start = allMessages.value.length - loadedCount.value - take;
    const end = allMessages.value.length - loadedCount.value;
    const older = allMessages.value.slice(Math.max(0, start), Math.max(0, end));

    // Prepend older messages to current view without altering allMessages
    currMessages.value = [...older, ...currMessages.value];
    loadedCount.value += older.length;
    done();
  }, 1000);
}

// Persistence disabled - removed function

function scrollToBottom() {
  void nextTick(() => {
    const el = listEl.value;
    if (el) {
      el.scrollTop = el.scrollHeight;
    }
  });
}

function appendMessage(text: string, opts?: Partial<Message>) {
  const msg: Message = {
    id: `m-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    text,
    state: 'sent',
    name: opts?.name ?? (currentUserDisplay.value || 'Anonymous'),
    stamp: new Date().toLocaleTimeString(),
    ...opts,
  };
  allMessages.value.push(msg);
  if (userStatus.value !== 'offline') {
    currMessages.value = [...currMessages.value, msg];
    loadedCount.value = Math.min(allMessages.value.length, loadedCount.value + 1);
    scrollToBottom();
  }
  // Any new append clears the special bottom pin
  lastFinishedId.value = null;
}

function isOwn(m: Message) {
  const me = currentUserDisplay.value;
  if (m.name && me) {
    return m.state === 'sent' && m.name === me;
  }
  return m.state === 'sent';
}

function isDirectedToCurrentUser(m: Message) {
  const me = currentUserDisplay.value;
  if (m.text && me) {
    const mention = `@${me}`;
    return m.text.includes(mention);
  }
  return false;
}

function togglePeekingMesage(id: string) {
  const idx = allMessages.value.findIndex((m) => m.id === id);
  if (idx !== -1) {
    const base = allMessages.value[idx]!;
    const updated: Message = {
      id: base.id,
      state: base.state === 'peeking' ? 'typing' : 'peeking',
      name: base.name,
      text: base.text,
      stamp: base.stamp,
    };
    allMessages.value.splice(idx, 1, updated);
    const cidx = currMessages.value.findIndex((m) => m.id === id);
    if (cidx !== -1) currMessages.value.splice(cidx, 1, updated);
  }
}
// Simulate someone typing a message that appears after delay
function simulateTyping(author: string, finalText: string, delayMs = 5000) {
  const id = `t-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const msg: Message = {
    id,
    text: '',
    state: 'typing',
    name: author,
    stamp: new Date().toLocaleTimeString(),
  };
  allMessages.value.push(msg);
  if (userStatus.value !== 'offline') {
    currMessages.value = [...currMessages.value, msg];
    loadedCount.value = Math.min(allMessages.value.length, loadedCount.value + 1);
    scrollToBottom();
  }

  // Resolve after delay
  setTimeout(() => {
  const idx = allMessages.value.findIndex((m) => m.id === id);
  if (idx !== -1) {
    const base = allMessages.value[idx]!;

    allMessages.value.splice(idx, 1);
    const cidx = currMessages.value.findIndex((m) => m.id === id);
    if (cidx !== -1) {
      currMessages.value.splice(cidx, 1);
    }

    // Append the final message so it ends up at the bottom
    appendMessage(finalText, {
      id: base.id,
      state: 'sent',
      name: base.name,
      stamp: new Date().toLocaleTimeString(),
    });

    scrollToBottom();
  }
}, delayMs);
}

defineExpose({ appendMessage, simulateTyping });

onMounted(() => {
  loadMessages();
});

watch(
  () => props.channelKey,
  () => loadMessages(),
);

watch(
  () => userStatus.value,
  (next) => {
    if (next === 'online' || next === 'dnd') {
      loadMessages();
    }
  },
);
</script>

<style scoped>
.message-list::-webkit-scrollbar {
  width: 10px;
  background-color: black;
}
.message-list::-webkit-scrollbar-thumb {
  background: #286eb5;
  border-radius: 6px;
}

.message-list {
  --own-bg: rgba(0, 150, 200, 0.18);
  --own-border: rgba(0, 150, 200, 0.5);
  --incoming-bg: rgba(255, 255, 255, 0.04);
  --incoming-border: rgba(255, 255, 255, 0.06);
  --mention-border: #c00202;
  display: flex;

  flex-direction: column;
  gap: 10px;
  flex: 1;
  min-height: 0;
  padding: 8px 12px 16px;
  box-sizing: border-box;
  overflow-y: auto;
}

.msg-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}

.msg-row--own {
  align-items: flex-end;
}

.flat-message {
  max-width: 75%;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
  color: rgba(255, 255, 255, 0.5);
}

.flat-message :deep(.q-message-text) {
  padding: 8px;
  border-radius: 8px;
  border: 1px solid transparent;
  white-space: pre-wrap;
  word-break: break-word;
  overflow-wrap: anywhere;
  box-shadow: none;
}

.msg-row:not(.msg-row--own) .flat-message :deep(.q-message-text) {
  background: var(--incoming-bg);
  border-color: var(--incoming-border);
}

.msg-row--own .flat-message :deep(.q-message-text) {
  background: var(--own-bg);
  border-color: var(--own-border);
}

.msg-row--mention .flat-message :deep(.q-message-text) {
  border-color: var(--mention-border);
  border-width: 3px;
  border-style: dashed;

}

.flat-message :deep(.q-message-stamp) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.flat-message.state-typing :deep(.q-message-text) {
  border-style: dashed !important;
  border-color: #6897f0 !important;
  border-width: 3px;
}

.flat-message.state-peeking :deep(.q-message-text) {
  border-style: dotted !important;
  border-width: 3px;
  border-color: #dcf06b !important;
}
</style>
