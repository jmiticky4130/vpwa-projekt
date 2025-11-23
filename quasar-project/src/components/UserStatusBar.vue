<template>
  <div class="user-status-bar">
    <q-btn
      class="status-btn"
      :round="$q.screen.gt.sm"
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
      class="status-btn"
      :round="$q.screen.gt.sm"
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
      class="status-btn"
      :round="$q.screen.gt.sm"
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
      class="status-btn"
      :round="$q.screen.gt.sm"
      dense
      unelevated
      size="md"
      :color="colorFor('directed')"
      :outline="directedOnly !== true"
      @click="toggleShowOnlyDirectedMessages"
      icon="alternate_email"
      :aria-label="'Direct Notify Only'"
    >
      <q-tooltip class="text-body2">
        Toggle: Notify only for @mentions
        <br />
        Currently: {{ directedOnly ? 'Only @mentions' : 'All notifications' }}
      </q-tooltip>
    </q-btn>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useAuthStore } from 'src/stores/auth-store';

const auth = useAuthStore();

const status = computed(() => auth.user?.status ?? 'online');
const directedOnly = computed(() => auth.user?.showOnlyDirectedMessages ?? false);

function setStatus(status: 'online' | 'dnd' | 'offline') {
  auth.setStatus(status);
}
function toggleShowOnlyDirectedMessages() {
  auth.setShowOnlyDirectedMessages(!directedOnly.value);
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

@media (max-width: 1023px) {
  .user-status-bar {
    justify-content: space-between;
    gap: 2px;
  }
  .status-btn {
    flex: 1;
    height: 95%;
    border-radius: 2px;
  }
}
</style>
