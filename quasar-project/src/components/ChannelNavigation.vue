<template>
  <div class="channel-nav">
    <template v-if="channels.length">
      <q-tabs
        vertical
        v-model="activeId"
        class="channel-tabs"
        content-class="channel-tabs-content"
        dense
        active-color="primary"
      >
        <q-tab
          v-for="ch in channels"
          :key="ch.id"
          :name="String(ch.id)"
          :label="(ch.public ? '# ' : '🔒 ') + ch.name"
          :class="['channel-tab', { public: ch.public, private: !ch.public, active: String(ch.id) === activeId }]
          "
        />
      </q-tabs>
    </template>
    <div v-else class="no-channels q-pa-md text-caption text-grey-6">No channels available</div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import channelsData from 'src/../channels.json'

interface Channel {
  id: number
  name: string
  public: boolean
}


const channels = ref<Channel[]>([])
if (Array.isArray(channelsData)) {
  channels.value = channelsData as Channel[]
}

const firstId = channels.value[0]?.id ?? ''
const activeId = ref(String(firstId))
</script>

<style scoped>
.channel-nav {
  width: 220px;
  background: rgba(255,255,255,0.02);
  --channel-nav-offset: var(--q-header-height, 56px);
  position: sticky;
  top: var(--channel-nav-offset);
  height: calc(100vh - var(--channel-nav-offset));
  overflow: hidden;
}
.channel-tabs {
  display: flex;
  flex-direction: column;
  height: 100%;
  padding-top: 4px;
  overflow: hidden;
}

:deep(.channel-tabs-content) {
  height: 100%;
  max-height: 100%;
  overflow-y: auto;
  overscroll-behavior: contain;
}

:deep(.q-tabs__arrow) {
  display: none !important;
}
.channel-tab {
  text-transform: none;
  font-weight: 500;
  padding: 8px 12px;
  border-radius: 6px;
  margin: 6px;
}
.channel-tab.public {
  background: rgba(255,255,255,0.045);
  color: rgba(255,255,255,0.92);
}
.channel-tab.private {
  background: rgba(255,255,255,0.03);
  color: rgba(255,255,255,0.84);
}
.channel-tab.active {
  border-left: 4px solid rgba(255,255,255,0.9);
  background: rgba(255,255,255,0.08) !important;
  color: rgba(255,255,255,0.98);
}

/* hover */
.channel-tab:hover {
  filter: brightness(1.02);
}
</style>
