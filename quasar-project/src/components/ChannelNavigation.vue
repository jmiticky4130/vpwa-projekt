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
          name="Add new channel"
          class="channel-tab create-channel-tab"
          style="color: white"
          @click.stop="openCreateDialog"
          color="primary"
        >
          <div class="tab-content row items-center justify-center full-width">
            <span style="color: white" class="create-channel-label">Create new channel</span>
          </div>
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
              'is-new': channelStore.isNew(ch.name),
            },
          ]"
          @click="channelStore.unmarkAsNew(ch.name)"
        >
          <div class="tab-content row items-center no-wrap full-width">
            <q-badge
              v-if="currentUser?.id === ch.creatorId"
              class="action-badge delete-badge q-mr-sm"
              color="red-10"
              text-color="white"
              @click.stop="deleteChannel(ch.name, currentUser?.id ?? null)"
              role="button"
              aria-label="Delete channel"
            >
              <q-icon name="delete" size="15px" style="margin-top: 1px" />
            </q-badge>
            <q-badge
              v-else
              class="action-badge leave-badge q-mr-sm"
              color="red-5"
              text-color="white"
              @click.stop="leaveChannel(ch.name)"
              role="button"
              aria-label="Leave channel"
            >
              <q-icon name="logout" size="15px" style="margin-top: 1px; transform: scaleX(-1)" />
            </q-badge>

            <span class="channel-name col text-center ellipsis">{{ ch.name }}</span>

            <q-badge
              :color="ch.public ? 'green-8' : 'indigo-7'"
              class="text-white channel-badge q-ml-sm"
            >
              <q-icon
                :name="ch.public ? 'public' : 'lock'"
                size="19px"
                style="margin-top: 1px"
                class="chan-icon"
              />
            </q-badge>
          </div>
        </q-tab>
      </q-tabs>
    </template>
    <div v-else class="no-channels q-pa-md text-left text-grey-6">No channels available</div>

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
        <q-card-actions>
          <q-btn flat label="Cancel" v-close-popup />
          <q-btn color="primary" unelevated label="Create" @click="createChannel" />
        </q-card-actions>
      </q-card>
    </q-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, onMounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import type { Channel } from 'src/contracts/Channel';
import { useChannelStore } from 'src/stores/channel-store';
import { storeToRefs } from 'pinia';
import { useNotify } from 'src/util/notification';
import { useAuthStore } from 'src/stores/auth-store';
const {
  notifyAlreadyMember,
  notifyChannelCreated,
  notifyLeftChannel,
  notifyChannelAlreadyExists,
  notifyError,
  notifyChannelDeleted,
} = useNotify();

const emit = defineEmits<{
  (e: 'selected'): void;
}>();

const channelStore = useChannelStore();
const { user: currentUser } = storeToRefs(useAuthStore());
const channels = computed<Channel[]>(() => {
  const uid = currentUser.value?.id;
  if (uid == null) return [];
  return channelStore.list({ userId: uid, newchannels: [] });
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
  (val: string) => ((val?.length ?? 0) >= 2 && (val?.length ?? 0) <= 30) || '2–30 characters',
];

onMounted(() => {
  void channelStore.refresh();
});

watch(
  () => currentUser.value?.id,
  (id) => {
    if (id != null) {
      void channelStore.refresh();
    }
  },
);

function openCreateDialog() {
  newChannelName.value = '';
  newChannelPublic.value = false;
  showCreateDialog.value = true;
}

function onSelect(slug: string) {
  if (slug && slug !== 'Add new channel') {
    emit('selected');
    void router.push({ name: 'channel', params: { slug } });
  }
}

async function deleteChannel(name: string, uid: number | null) {
  try {
    await channelStore.removeChannel(name, uid);
    notifyChannelDeleted(name, true);
    void router.push({ path: '/' });
  } catch (err: unknown) {
    const error = err as { message?: string; response?: { data?: { message?: string | string[] } } };
    let errorMsg = 'An unexpected error occurred';
    
    if (error.response && error.response.data && error.response.data.message) {
      const msg = error.response.data.message;
      errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
    } else if (error.message) {
      errorMsg = error.message;
    }
    notifyError(errorMsg);
  }
}

async function leaveChannel(name: string) {
  try {
    await channelStore.removeMember(name);
    notifyLeftChannel(name);
    void router.push({ path: '/' });
  } catch (err: unknown) {
    const error = err as { message?: string; response?: { data?: { message?: string | string[] } } };
    let errorMsg = 'An unexpected error occurred';
    
    if (error.response && error.response.data && error.response.data.message) {
      const msg = error.response.data.message;
      errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
    } else if (error.message) {
      errorMsg = error.message;
    }
    notifyError(errorMsg);
  }
}

async function createChannel() {
  const name = newChannelName.value.trim();
  if (!name) return;

  try {
    // Check global existence first
    const exists = await channelStore.checkChannelExists(name);
    if (exists) {
      const ch = channelStore.findByName(name);
      if (ch) {
        // User is already a member
        await router.push({ name: 'channel', params: { slug: ch.name } });
        notifyAlreadyMember(ch.name);
        showCreateDialog.value = false;
        return;
      }
      notifyChannelAlreadyExists(name);
      return;
    }

    const payload: { name: string; isPublic: boolean } = {
      name: name,
      isPublic: newChannelPublic.value,
    };
    const created = await channelStore.addChannel(payload);

    const uid = currentUser.value?.id;
    if (uid != null) {
      await channelStore.addMember(created?.name ?? '');
    }
    onSelect(created?.name ?? '');
    notifyChannelCreated(created?.name ?? '', created?.public ? 'public' : 'private');
    showCreateDialog.value = false;
  } catch (err: unknown) {
    const error = err as { message?: string; response?: { data?: { message?: string | string[] } } };
    let errorMsg = 'An unexpected error occurred';
    
    if (error.response && error.response.data && error.response.data.message) {
      const msg = error.response.data.message;
      errorMsg = Array.isArray(msg) ? msg.join(', ') : msg;
    } else if (error.message) {
      errorMsg = error.message;
    }
    notifyError(errorMsg);
  }
}

// keep active tab in sync when route changes externally
watch(
  () => route.params.slug,
  (slug) => {
    const s = slug ? String(slug) : '';
    if (s !== activeSlug.value) activeSlug.value = s;
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

@media (min-width: 1024px) {
  .channel-tabs {
    min-width: 256px;
    max-width: 256px;
  }
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

.channel-tab:hover {
  filter: brightness(1.02);
}

.action-badge {
  width: 24px;
  height: 24px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  cursor: pointer;
  margin-right: 8px;
}

.channel-tab :deep(.q-tab__content) {
  justify-content: flex-start;
  text-align: left;
  width: 100%;
}

.channel-tab {
  padding-left: 8px;
  padding-right: 8px;
}

.tab-content {
  display: flex;
  align-items: center;
  gap: 6px;
}

.chan-icon {
  width: 14px;
  height: 19px;
}

.channel-name {
  font-size: 14px;
}

.create-channel-tab {
  background: var(--q-primary);
  color: white;
  margin-top: 4px;
  margin-bottom: 12px;
}
</style>
