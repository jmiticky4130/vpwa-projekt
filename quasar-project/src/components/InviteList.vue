<template>
  <div class="invite-list-root">
    <div class="header row items-center justify-between q-mb-sm">
      <h6 class="q-ma-none text-white"> Your Invites</h6>
      <q-btn dense flat color="grey-8" icon="refresh" @click="refreshInvites" :disable="loading" />
    </div>
    <div v-if="loading" class="column items-center q-my-md">
      <q-spinner color="primary" size="32px" />
      <div class="text-grey-5 q-mt-sm">Loading invites...</div>
    </div>
    <div v-else-if="error" class="text-negative q-pa-sm">
      {{ error }}
    </div>
    <div v-else>
      <q-list bordered separator class="bg-transparent">
        <template v-if="invites.length">
          <q-item v-for="inv in invites" :key="inv.id" clickable class="invite-row">
            <q-item-section>
              <div class="text-white">#{{ inv.channelName }}</div>
              <div class="text-grey-5 text-caption">Status: {{ inv.status }}</div>
              <div v-if="inv.expiresAt" class="text-grey-6 text-caption">Expires {{ formatExpires(inv.expiresAt) }}</div>
            </q-item-section>
            <q-item-section side class="row items-center q-gutter-xs">
              <q-btn size="sm" dense color="positive" icon="check" @click.stop="acceptInvite(inv.id)" />
              <q-btn size="sm" dense color="negative" icon="close" @click.stop="declineInvite(inv.id)" />
            </q-item-section>
          </q-item>
        </template>
        <template v-else>
          <q-item>
            <q-item-section class="text-grey-5">No pending invites.</q-item-section>
          </q-item>
        </template>
      </q-list>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useInviteStore } from 'src/stores/invite-store'
import { useNotify } from 'src/util/notification'
import { useChannelStore } from 'src/stores/channel-store'

const inviteStore = useInviteStore()
const channelStore = useChannelStore()
const { notifyJoinedChannel } = useNotify()

const invites = computed(() => inviteStore.invites)
const loading = computed(() => inviteStore.loading)
const error = computed(() => inviteStore.error)

function refreshInvites() {
  void inviteStore.refresh()
}

function formatExpires(expiresAt: string) {
  return new Date(expiresAt).toLocaleDateString()
}

async function acceptInvite(id: number) {
  const invite = invites.value.find((i) => i.id === id)
  const ok = await inviteStore.accept(id)
  if (ok) {
    // Refresh channels so membership appears in UI
    await channelStore.refresh()
    notifyJoinedChannel(invite?.channelName ?? '')
  }
}

async function declineInvite(id: number) {
  const ok = await inviteStore.decline(id)
  if (ok) {
    // Nothing else for now
  }
}

onMounted(() => {
  refreshInvites()
})
</script>

<style scoped>
.invite-list-root {
  display: flex;
  flex-direction: column;
  flex: 1;
  min-height: 0;
}
.invite-row {
  background: rgba(255,255,255,0.04);
  border-radius: 8px;
  margin: 4px 8px;
}
h6 { 
  font-weight: 600;
  margin: 10px;
}
</style>
