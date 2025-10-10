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
        @update:model-value="onSelect"
      >
        <q-tab
          v-for="ch in channels"
          :key="ch.id"
          :name="String(ch.id)"
          :class="['channel-tab', { public: ch.public, private: !ch.public, active: String(ch.id) === activeId }]
          "
        >
          <div class="tab-content">
            <q-badge :color="ch.public ? 'green-7' : 'deep-orange-6'" class="text-white channel-badge">
              {{ ch.public ? 'Public' : 'Private' }}
            </q-badge>
            <span class="channel-name">{{ ch.name }}</span>
          </div>
        </q-tab>
      </q-tabs>
    </template>
    <div v-else class="no-channels q-pa-md text-caption text-grey-6">No channels available</div>
  </div>
  
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
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

const router = useRouter()
const route = useRoute()

const getIdBySlug = (slug: string) => {
  const found = channels.value.find((c) => c.name.toLowerCase() === slug.toLowerCase())
  return found ? String(found.id) : ''
}

const getSlugById = (id: string) => {
  const found = channels.value.find((c) => String(c.id) === id)
  return found ? found.name : ''
}

// initialize active tab from route
const initialSlug = String(route.params.slug || '')
const initialId = initialSlug ? getIdBySlug(initialSlug) : String(channels.value[0]?.id ?? '')
const activeId = ref(String(initialId))

// keep active tab in sync when route changes externally
watch(
  () => route.params.slug,
  (slug) => {
    const id = slug ? getIdBySlug(String(slug)) : ''
    if (id && id !== activeId.value) activeId.value = id
  }
)

function onSelect(id: string) {
  const slug = getSlugById(id)
  if (slug) {
    void router.push({ name: 'channel', params: { slug } })
  }
}
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
