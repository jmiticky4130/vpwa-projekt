<template>
  <div class="user-status-bar">
    <q-btn
      round
      dense
      unelevated
      size="md"
      :color="colorFor('online')"
      :outline="status !== 'online'"
      @click="setStatus('online')"
      icon="lens"
      :aria-label="'Online'"
    >
      <q-tooltip class="text-body2" anchor="top middle" self="bottom start">
        Set status to Online
        <br />
        Current: {{ status }}
      </q-tooltip>
    </q-btn>
    <q-btn
      round
      dense
      unelevated
      size="md"
      :color="colorFor('dnd')"
      :outline="status !== 'dnd'"
      @click="setStatus('dnd')"
      icon="do_not_disturb_on"
      :aria-label="'Do not disturb'"
    >
      <q-tooltip class="text-body2">
        Set status to Do Not Disturb
        <br />
        Current: {{ status }}
      </q-tooltip>
    </q-btn>
    <q-btn
      round
      dense
      unelevated
      size="md"
      :color="colorFor('offline')"
      :outline="status !== 'offline'"
      @click="setStatus('offline')"
      icon="trip_origin"
      :aria-label="'Offline'"
    >
      <q-tooltip class="text-body2">
        Set status to Offline
        <br />
        Current: {{ status }}
      </q-tooltip>
    </q-btn>
    <q-btn
      round
      dense
      unelevated
      size="md"
      :color="colorFor('directed')"
      :outline="directedOnly !== true"
      @click="toggleShowOnlyDirectedMessages"
      icon="trip_origin"
      :aria-label="'Directed Messages'"
    >
      <q-tooltip class="text-body2">
        Toggle: Show only messages directed at you
        <br />
        Currently: {{ directedOnly ? 'Only directed messages' : 'All messages' }}
      </q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue';
// import { useAuthStore } from 'src/stores/auth-store';

// With user-store removed, keep local UI state for status and directed-only toggle
// Import available for future use (e.g., server-side status), but unused for now
// const auth = useAuthStore();
const statusRef = ref<'online' | 'dnd' | 'offline'>('online');
const directedOnlyRef = ref<boolean>(false);

const status = computed(() => statusRef.value);
const directedOnly = computed(() => directedOnlyRef.value);

function setStatus(status: 'online' | 'dnd' | 'offline') {
  statusRef.value = status;
}
function toggleShowOnlyDirectedMessages() {
  directedOnlyRef.value = !directedOnlyRef.value;
}

function colorFor(s: 'online' | 'dnd' | 'offline' | 'directed') {
  if (s === 'offline') return 'grey-6';
  if (s === 'dnd') return 'red-6';
  if (s === 'directed') return 'blue-6';
  return 'green-6';
}
</script>

<style scoped>
.user-status-bar {
  position: sticky;
  left: 0;
  bottom: 0;
  width: 100%;
  height: 61px;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  background: #00000094;
  border-top: 1px solid #222;
}
</style>
