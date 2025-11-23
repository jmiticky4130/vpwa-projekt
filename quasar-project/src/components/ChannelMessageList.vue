<template>
  <div class="message-list" ref="listEl">
    <div v-if="!isChannelLoaded" class="row justify-center q-my-md">
      <q-spinner color="primary" name="dots" size="40px" />
    </div>
    <q-infinite-scroll
      v-else
      @load="loadMoreMessages"
      :offset="100"
      reverse
      :scroll-target="listEl"
      :key="props.channelKey"
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
          :name="isOwn(m) ? 'You' : m.name"
          :stamp="m.stamp"
          bg-color="transparent"
          text-color="white"
          class="flat-message"
          :class="['flat-message', `state-${m.state}`]"
          dense
        >
          <div>
            {{ m.text }}
            <q-badge v-if="m.state === 'sending'" color="orange" class="q-ml-xs" rounded outline>
              sending...
            </q-badge>
          </div>
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
  state: 'sent' | 'sending';
  createdAt: number;
};

const props = defineProps<{ channelKey: string }>();
// Pinia message store
const messageStore = useMessageStore();

const isChannelLoaded = computed(() => {
  return messageStore.totals[props.channelKey] !== undefined;
});

// Map backend messages to UI message type expected by q-chat-message
function toViewMessage(m: SerializedMessage): Message {
  return {
    id: String(m.id),
    text: m.body,
    name: m.author?.nickname ?? 'Unknown',
    stamp: new Date(m.createdAt).toLocaleTimeString(),
    state: 'sent',
    createdAt: new Date(m.createdAt).getTime(),
  };
}

type SystemMessage = {
  id: string;
  text: string;
  createdAt: number;
};
const systemMessages = ref<SystemMessage[]>([]);

function addSystemMessage(text: string) {
  systemMessages.value.push({
    id: `sys-${Date.now()}`,
    text,
    createdAt: Date.now(),
  });
  scrollToBottom();
}

const displayedMessages = computed<Message[]>(() => {
  const persisted = (messageStore.messages[props.channelKey] || []).map(toViewMessage)
  const queuedRaw = messageStore.offlineQueues[props.channelKey] || []
  const queued = queuedRaw.map((raw, idx) => ({
    id: `queued-${idx}-${props.channelKey}`,
    text: raw,
    name: currentUserDisplay.value || 'You',
    stamp: new Date().toLocaleTimeString(),
    state: 'sending' as const,
    createdAt: Date.now()
  }))
  
  const system = systemMessages.value.map((sys) => ({
    id: sys.id,
    text: sys.text,
    name: 'System',
    stamp: new Date(sys.createdAt).toLocaleTimeString(),
    state: 'sent' as const,
    createdAt: sys.createdAt,
  }));

  return [...persisted, ...queued, ...system].sort((a, b) => a.createdAt - b.createdAt);
});
const listEl = ref<HTMLElement>();

const { user } = storeToRefs(useAuthStore());
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
  // Queued messages (sending) are always owned by current user
  if (m.state === 'sending') return true;
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

defineExpose({ appendMessage, addSystemMessage });

onMounted(() => {
  scrollToBottom();
});

watch(
  () => props.channelKey,
  () => {
    systemMessages.value = [];
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

watch(isChannelLoaded, (val) => {
  if (val) {
    scrollToBottom();
  }
});
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

.msg-row.msg-row--mention .flat-message :deep(.q-message-text) {
  border-color: #6897f0;
  border-width: 3px;
  border-style: dashed;
}

.flat-message :deep(.q-message-stamp) {
  color: rgba(255, 255, 255, 0.5);
  font-size: 11px;
}

.flat-message.state-sending :deep(.q-message-text) {
  border-style: dashed;
  border-color: #ff9800;
  opacity: 0.7;
}
</style>
