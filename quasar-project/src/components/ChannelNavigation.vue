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
        <q-tab name="Add new channel">
          <q-btn color="primary" unelevated @click.stop="openCreateDialog" label="Create new channel" />
        </q-tab>

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
              'is-new': currentUser?.newchannels.includes(ch.name.toLowerCase()),
            },
          ]"
        >
          <div class="tab-content">
            <q-badge
              v-if="currentUser?.id === ch.creatorId"
              class="delete-badge"
              color="red-6"
              text-color="white"
              @click.stop="deleteChannel(ch.name, currentUser?.id ?? null)"
              role="button"
              aria-label="Delete channel"
            >
              <q-icon name="delete" size="14px" />
            </q-badge>
            <q-badge
              :color="ch.public ? 'green-7' : 'deep-orange-6'"
              class="text-white channel-badge"
            >
              {{ ch.public ? 'Public' : 'Private' }}
            </q-badge>
            <span class="channel-name">{{ ch.name }}</span>
          </div>
        </q-tab>
      </q-tabs>
    </template>
    <div v-else class="no-channels q-pa-md text-caption text-grey-6">No channels available</div>

    <!-- Create Channel Dialog -->
    <q-dialog v-model="showCreateDialog" persistent>
      <q-card style="min-width: 360px; max-width: 92vw">
        <q-card-section class="text-h6">Create a new channel</q-card-section>
        <q-separator />
        <q-card-section>
          <q-form @submit.prevent="createChannel">
            <div class="q-gutter-md">
              <q-input
                v-model="newChannelName"
                label="Channel name"
                :rules="nameRules"
                autofocus
                clearable
              />
              <q-select
                v-model="newChannelPublic"
                :options="[
                  { label: 'Private', value: false },
                  { label: 'Public', value: true },
                ]"
                emit-value
                map-options
                label="Visibility"
              />
            </div>
          </q-form>
        </q-card-section>
        <q-card-actions >
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" unelevated label="Create" @click="createChannel" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Channel } from 'src/types/channel';
import { useChannelStore } from 'src/stores/channel-store';
import { useUserStore } from 'src/stores/user-store';
import { storeToRefs } from 'pinia';
import { useNotify } from 'src/util/notification';
const {
  notifyJoinedChannel,
  notifyAlreadyMember,
  notifyPrivateChannelBlocked,
  notifyChannelCreated,
  notifyBannedCannotJoin,
  notifyChannelDeleted
} = useNotify();

const emit = defineEmits<{
  (e: 'selected'): void;
}>();

const channelStore = useChannelStore();
const userStore = useUserStore();
const { currentUser } = storeToRefs(userStore);
const channels = computed<Channel[]>(() => {
  const uid = currentUser.value?.id;
  if (uid == null) return [];
  return channelStore.list({ userId: uid, newchannels: currentUser.value?.newchannels ?? [] });
});

const router = useRouter();
const route = useRoute();

const initialSlug = String(route.params.slug || '');
const activeSlug = ref(initialSlug);
const newChannelName = ref('');
const newChannelPublic = ref(false);
const showCreateDialog = ref(false);

const nameRules = [
  (val: string) => !!(val && val.trim()) || 'Channel name is required',
  (val: string) => /^[-_a-zA-Z0-9]+$/.test(val) || 'Use letters, numbers, - or _ only',
  (val: string) => (val?.length ?? 0) >= 2 && (val?.length ?? 0) <= 30 || '2–30 characters',
  (val: string) => {
    const v = String(val || '').toLowerCase();
    return !channelStore.channels.some((c) => c.name.toLowerCase() === v) || 'Channel already exists';
  },
];

function openCreateDialog() {
  newChannelName.value = '';
  newChannelPublic.value = false;
  showCreateDialog.value = true;
}

function onSelect(slug: string) {
  if (slug && slug !== 'Add new channel') {
    const uid = currentUser.value?.id;
    if (uid != null) userStore.clearNewChannel(uid, slug);
    emit('selected');
    void router.push({ name: 'channel', params: { slug } });
  }
}

function deleteChannel(name: string, uid: number | null) {
  channelStore.removeChannel(name, uid);
  void router.push({ path: '/' });
  notifyChannelDeleted(name);

}

async function createChannel() {

  const ch = channelStore.findByName(newChannelName.value);
  if (ch) {
    const uid = currentUser.value?.id;
    const isMember = uid != null && Array.isArray(ch.members) && ch.members.includes(uid);
    if (isMember) {
      await router.push({ name: 'channel', params: { slug: ch.name } });
      notifyAlreadyMember(ch.name);
      showCreateDialog.value = false;
      return;
    }
    if (uid != null && channelStore.isBanned(ch.name, uid)) {
      notifyBannedCannotJoin(ch.name);
      return;
    }
    if (ch.public) {
      if (uid != null) {
        channelStore.addMember(ch.name, uid);
      }
      await router.push({ name: 'channel', params: { slug: ch.name } });
      notifyJoinedChannel(ch.name);
    } else {
      notifyPrivateChannelBlocked(ch.name);
    }
    showCreateDialog.value = false;
    return;
  }

  const creatorId = currentUser.value?.id ?? 1;
  const payload: Channel = {
    id: 0,
    name: newChannelName.value,
    public: newChannelPublic.value,
    creatorId,
    members: [creatorId],
    banned: [],
    kickVotes: {},
  };
  const created = channelStore.addChannel(payload);

  const uid = currentUser.value?.id;
  if (uid != null) {
    channelStore.addMember(created.name, uid);
  }
  onSelect(created.name);
  notifyChannelCreated(created.name, created.public ? 'public' : 'private');
  showCreateDialog.value = false;
  return;
}

// keep active tab in sync when route changes externally
watch(
  () => route.params.slug,
  (slug) => {
    const s = slug ? String(slug) : '';
    if (s && s !== activeSlug.value) activeSlug.value = s;
  },
);
</script>

<style scoped>
.channel-nav {
  width: 100%;
  background: rgba(255, 255, 255, 0.02);
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
  padding-bottom: 4px;
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
  background: rgba(255, 255, 255, 0.045);
  color: rgba(255, 255, 255, 0.92);
}
.channel-tab.private {
  background: rgba(255, 255, 255, 0.03);
  color: rgba(255, 255, 255, 0.84);
}
.channel-tab.active {
  border-left: 4px solid rgba(255, 255, 255, 0.9);
  background: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.98);
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

/* Delete badge (trashcan) */
.delete-badge {
  width: 22px;
  height: 22px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px; /* square-ish corners */
  cursor: pointer;
  margin-right: 8px;
}
</style>
