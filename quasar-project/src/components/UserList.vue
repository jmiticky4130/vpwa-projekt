<template>
  <div class="user-list-wrapper bg-grey-10">
    <q-list bordered class="rounded-borders user-list">
      <q-item-label header>Users ({{ users.length }})</q-item-label>
      <q-item v-for="u in users" :key="u.id || u.email" >
        <q-item-section>
          <q-item-label class="text-grey-4">
            {{ u.nickname }} <span v-if="isCurrent(u)" class="you-pill">(you)</span>
          </q-item-label>
          <q-item-label caption class="text-grey-6 ellipsis">{{ u.email }}</q-item-label>
        </q-item-section>
        <q-item-section side>
          <q-badge
            :color="isCurrent(u) ? 'green-6' : 'grey-7'"
            :label="isCurrent(u) ? 'online' : 'offline'"
          />
        </q-item-section>
      </q-item>
      <div v-if="!users.length" class="empty text-grey-6 q-pa-sm">No users</div>
    </q-list>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import type { User } from 'src/types/user';

const props = defineProps<{ users: User[]; currentUserEmail?: string }>();

function isCurrent(u: User) {
  return !!props.currentUserEmail && u.email === props.currentUserEmail;
}

defineExpose({ count: computed(() => props.users.length) });
</script>

<style scoped>
.user-list-wrapper {
  width: 240px;
  flex: 0 0 auto;
  display: flex;
  flex-direction: column;
  max-height: 100%;
}
.user-list {
  overflow-y: auto;
  max-height: 100%;
}
.you-pill {
  font-size: 11px;
  color: var(--q-primary);
}
.empty {
  font-size: 13px;
  text-align: center;
}

.user-list .q-item {
  padding: 8px 12px; /* space inside each item (optional tweak) */
  border-bottom: 1px solid rgba(255, 255, 255, 0.247);
}

.user-list .q-item:last-child {
  border-bottom: none;
}

/* make the badge and text breathe a bit */
.user-list .q-item-section { padding-top: 4px; padding-bottom: 4px; }

</style>
