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
            <div @click="togglePeekingMesage()">
              <q-spinner-dots size="2rem" />
            </div>
          </template>
          <template v-else-if="m.state === 'peeking'">
            <div @click="togglePeekingMesage()">
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
import { ref, nextTick, computed, onMounted, watch } from 'vue';
import { storeToRefs } from 'pinia';
import { useAuthStore } from 'src/stores/auth-store';
import { useMessageStore } from 'src/stores/message-store';
import type { SerializedMessage } from 'src/contracts';

type Message = {
  id: string;
  text: string;
  name: string;
  stamp: string;
  state: 'sent' | 'typing' | 'peeking';
};

const props = defineProps<{ channelKey: string }>();
// Pinia message store
const messageStore = useMessageStore();

// Map backend messages to UI message type expected by q-chat-message
function toViewMessage(m: SerializedMessage): Message {
  return {
    id: String(m.id),
    text: m.body,
    name: m.author?.nickname ?? 'Unknown',
    stamp: new Date(m.createdAt).toLocaleTimeString(),
    state: 'sent',
  };
}

const displayedMessages = computed<Message[]>(() => {
  const arr = messageStore.messages[props.channelKey] || [];
  return arr.map(toViewMessage);
});
const listEl = ref<HTMLElement | null>(null);

const { user } = storeToRefs(useAuthStore());
// Basic mode: assume online since per-user status store was removed
const userStatus = computed<'online' | 'dnd' | 'offline'>(() => 'online');
const currentUserDisplay = computed(() => user.value?.nickname ?? '');

async function loadMoreMessages(_index: number, done: (stop?: boolean) => void) {
  const hasMore = await messageStore.loadMore(props.channelKey);
  done(!hasMore);
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

function isNearBottom(): boolean {
  const el = listEl.value;
  if (!el) return false;
  const threshold = 150; // pixels from bottom
  return el.scrollHeight - el.scrollTop - el.clientHeight < threshold;
}

async function appendMessage(text: string) {
  try {
    await messageStore.addMessage({ channel: props.channelKey, message: text });
    // The incoming echo (via websocket 'message') updates the store and UI
    scrollToBottom();
  } catch (e) {
    console.error('Failed to send message:', e);
  }
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

function togglePeekingMesage() {
  // Typing/peeking demo disabled when using server-driven messages
}
// Simulate someone typing a message that appears after delay
function simulateTyping() {
  // No-op in server-driven mode
}

defineExpose({ appendMessage, simulateTyping });

// When the list is first shown or the channel changes,
// scroll to the bottom so the newest messages are visible.
onMounted(() => {
  scrollToBottom();
});

watch(
  () => props.channelKey,
  () => {
    scrollToBottom();
  },
);

// Auto-scroll when new messages arrive if user is near bottom
watch(
  () => displayedMessages.value.length,
  (newLength, oldLength) => {
    if (newLength > oldLength && isNearBottom()) {
      scrollToBottom();
    }
  }
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
