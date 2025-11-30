<template>
  <div class="typing-indicator q-px-md q-py-xs text-grey-5 text-caption">
    <div class="typing-content row items-center">
      <template v-if="typingUsersList.length > 0">
        <q-spinner-dots size="1.5em" class="q-mr-sm" />
        
        <div class="row inline q-gutter-x-xs">
          <div v-for="(user, index) in typingUsersList" :key="user.userId" class="relative-position">
            <span 
              class="cursor-pointer text-weight-bold hover-underline"
              :class="{ 'text-primary': previewUserId === user.userId }"
              @click.stop="togglePreview(user.userId)"
            >
              {{ user.nickname }}
            </span>
            <span v-if="index < typingUsersList.length - 1">,</span>
            
            <!-- Preview Bubble -->
            <div 
              v-if="previewUserId === user.userId"
              class="preview-bubble shadow-4"
              @click.stop
            >
              <div class="text-caption text-grey-4 q-mb-xs">Live preview:</div>
              <div class="preview-text">{{ user.content || '...' }}</div>
            </div>
          </div>
        </div>
        
        <span class="q-ml-xs">is typing...</span>
      </template>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue';
import { useTypingStore } from 'src/stores/typing-store';

const props = defineProps<{ channelName: string }>();
const typingStore = useTypingStore();

const typingUsersList = computed(() => {
  const channelData = typingStore.typingUsers[props.channelName.toLowerCase()];
  if (!channelData) return [];
  return Object.values(channelData);
});

const previewUserId = ref<number | null>(null);

function togglePreview(userId: number) {
  previewUserId.value = previewUserId.value === userId ? null : userId;
}

// Close preview when clicking outside
function closePreview() {
  previewUserId.value = null;
}

onMounted(() => {
  document.addEventListener('click', closePreview);
});

onUnmounted(() => {
  document.removeEventListener('click', closePreview);
});
</script>

<style scoped>
.typing-indicator {
  width: calc(100% - 276px);
  background: transparent;
  min-height: 24px;
  display: flex;
  align-items: center;
  position: relative;
  z-index: 10;
}

.hover-underline:hover {
  text-decoration: underline;
}

.preview-bubble {
  position: absolute;
  bottom: 100%;
  left: 50%;
  transform: translateX(-50%);
  background: #2d2d2d;
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  padding: 8px 12px;
  width: max-content;
  max-width: 300px;
  min-width: 150px;
  margin-bottom: 8px;
  z-index: 1000;
  pointer-events: auto;
}

.preview-bubble::after {
  content: '';
  position: absolute;
  top: 100%;
  left: 50%;
  margin-left: -6px;
  border-width: 6px;
  border-style: solid;
  border-color: #2d2d2d transparent transparent transparent;
}

.preview-text {
  white-space: pre-wrap;
  word-break: break-word;
  color: white;
  font-size: 13px;
  line-height: 1.4;
}
</style>
