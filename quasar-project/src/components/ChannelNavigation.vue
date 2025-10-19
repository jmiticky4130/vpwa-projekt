<template>
  <div class="channel-nav">
    <template v-if="channels.length">
      <q-tabs
        vertical
        v-model="activeSlug"
        class="channel-tabs"
        content-class="channel-tabs-content"
        dense
        active-color="primary"
        @update:model-value="onSelect"
      >
        <q-tab
          v-for="ch in channels"
          :key="ch.name"
          :name="ch.name"
          :class="[
            'channel-tab',
            {
              public: ch.public,
              private: !ch.public,
              active: ch.name === activeSlug,
              'is-new': currentUser?.newchannels?.includes(ch.name.toLowerCase()),
            },
          ]"
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
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Channel } from 'src/types/channel'
import { useChannelStore } from 'src/stores/channel-store'
import { useUserStore } from 'src/stores/user-store'
import { storeToRefs } from 'pinia'

const channelStore = useChannelStore()
const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)
const channels = computed<Channel[]>(() => {
  const uid = currentUser.value?.id
  if (uid == null) return []
  // Only show accessible channels and sort user's newchannels to the top
  return channelStore.list({ userId: uid, newchannels: currentUser.value?.newchannels ?? [] })
})

const router = useRouter()
const route = useRoute()

// initialize active tab from route (do not default to first channel)
const initialSlug = String(route.params.slug || '')
const activeSlug = ref(initialSlug)

// keep active tab in sync when route changes externally
watch(
  () => route.params.slug,
  (slug) => {
    const s = slug ? String(slug) : ''
    if (s && s !== activeSlug.value) activeSlug.value = s
  }
)

function onSelect(slug: string) {
  if (slug) {
    const uid = currentUser.value?.id
    if (uid != null) userStore.clearNewChannel(uid, slug)
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
  padding-bottom: 54px;
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

.channel-tab.is-new {
  border-color: #00cbe6;
  border-width: 3px;
  border-style: solid;
}

/* hover */
.channel-tab:hover {
  filter: brightness(1.02);
}
</style>
