<template>
  <div class="message-list" ref="listEl">
    <q-infinite-scroll @load="loadMoreMessages" :offset="100" reverse scroll-target=".message-list" :key="props.channelKey">
      <template v-slot:loading>
        <div class="row justify-center q-my-md">
          <q-spinner color="primary" name="dots" size="40px" />
        </div>
      </template>
      <div v-for="m in currMessages" :key="m.id" :class="['msg-row', { 'msg-row--own': isOwn(m) }, { 'msg-row--mention': isDirectedToCurrentUser(m) }]">
        <!-- Author shown above message -->
        <div class="msg-author" :aria-hidden="true">
          {{ isOwn(m) ? 'You' : m.name || 'Anonymous' }}
        </div>

        <q-chat-message
          :text="[m.text]"
          :sent="isOwn(m)"
          :name="m.name"
          :stamp="m.stamp"
          bg-color="transparent"
          text-color="white"
          class="flat-message"
          size="sm"
          dense
        />
      </div>
    </q-infinite-scroll>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick, defineExpose, onMounted, computed } from 'vue';
import { useUserStore } from 'src/stores/user-store'
import { storeToRefs } from 'pinia'

type Message = {
  id: string;
  text: string;
  sent?: boolean;
  name?: string;
  stamp?: string;
};

const props = defineProps<{ channelKey: string; currentUser: string }>();
const allMessages = ref<Message[]>([]);
const currMessages = ref<Message[]>([]);
const listEl = ref<HTMLElement | null>(null);
const loadedCount = ref(0); 
const BATCH_SIZE = 20;

const userStore = useUserStore()
const { currentUser: cu } = storeToRefs(userStore)
const userStatus = computed<'online' | 'dnd' | 'offline'>(() => cu.value?.status ?? 'online')

const storageKey = () => `chat:${props.channelKey}`;

function loadMessages() {
  try {
    const raw = localStorage.getItem(storageKey());
    if (raw) {
      allMessages.value = JSON.parse(raw) as Message[];
    } else {
      allMessages.value = [
        {
          id: `s-${Date.now()}-1`,
          text: `Welcome to #${props.channelKey}!`,
          sent: false,
          name: 'System',
          stamp: new Date().toLocaleTimeString(),
        },
      ];
      persist();
    }
  } catch {
    allMessages.value = [];
  }
  // reset paging; keep showing existing messages even when offline
  loadedCount.value = Math.min(BATCH_SIZE, allMessages.value.length);
    currMessages.value = allMessages.value.slice(allMessages.value.length - loadedCount.value);
  console.log("Loaded messages:", allMessages.value.length, "Showing:", loadedCount.value);
  scrollToBottom();
}

function loadMoreMessages(index: number, done: (stop?: boolean) => void) {
  console.log('Request to load more messages');
  if (userStatus.value === 'offline') {
    done(true)
    return
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

function persist() {
  localStorage.setItem(storageKey(), JSON.stringify(allMessages.value));
}

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
    sent: true,
    stamp: new Date().toLocaleTimeString(),
    ...opts,
  };
  allMessages.value.push(msg);
  /*const isOwn = msg.sent === true && (!!msg.name && msg.name === props.currentUser)*/ // NOT YET NEEDED
  if (userStatus.value !== 'offline' /*|| isOwn*/) {
    currMessages.value = [...currMessages.value, msg];
    loadedCount.value = Math.min(allMessages.value.length, loadedCount.value + 1);
    scrollToBottom();
  }
  persist();
}

function isOwn(m: Message) {
  if (m.name && props.currentUser) {
    return m.sent === true && m.name === props.currentUser;
  }
  return m.sent === true;
}


function isDirectedToCurrentUser(m: Message) {
  if (m.text && props.currentUser) {
    const mention = `@${props.currentUser}`;
    return m.text.includes(mention);
  }
  return false;
}

defineExpose({ appendMessage });

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
    if (next === 'online') {
      loadMessages()
    }
  }
)

</script>

<style scoped>

.message-list::-webkit-scrollbar { width: 10px; background-color: black; }
.message-list::-webkit-scrollbar-thumb { background: #286eb5; border-radius: 6px; }

.message-list {
  --own-bg: rgba(0, 150, 200, 0.18);
  --own-border: rgba(0, 150, 200, 0.5);
  --incoming-bg: rgba(255, 255, 255, 0.04); 
  --incoming-border: rgba(255,255,255,0.06);
  --mention-border: #7e0000;
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

.msg-author {
  font-size: 12px;
  margin-bottom: 4px;
  color: rgba(255,255,255,0.65);
  user-select: none;
}

.msg-row--own .msg-author {
  color: rgba(130,220,190,0.95);
}

.flat-message {
  max-width: 75%;
  min-width: 0;
  box-sizing: border-box;
  position: relative;
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
  border-color: var(--mention-border) !important;
}


.flat-message :deep(.q-message-name) {
  display: none;
}

.flat-message :deep(.q-message-stamp) {
  color: rgba(255,255,255,0.5);
  font-size: 11px;
}
</style>
