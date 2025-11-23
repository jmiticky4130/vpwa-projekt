<template>
  <q-page class="row items-start" style="min-height: 0; height: 100%">
    <div style="flex:1; display:flex; flex-direction:column; min-height:0; padding:16px">
      <div class="page-content">
        <h2 class="text-white">Welcome</h2>
        <p class="text-grey-4">Select a channel on the left to get started or use /join #channel to join or create one.</p>
      </div>
    </div>
    <div class="user-list-panel">
      <div class="user-list-header row q-pa-sm q-gutter-sm">
        <div class="row q-gutter-xs full-width justify-center">
          <q-btn
            color="primary"
            label="Invites"
            dense
            no-caps
            class="col"
          >
            <q-badge color="red" floating v-if="inviteCount > 0">{{ inviteCount }}</q-badge>
          </q-btn>
        </div>
      </div>
      <div class="user-list-body">
        <InviteList />
      </div>
    </div>
    <div class="absolute-bottom full-width">
    <ChannelTextField/>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { computed, onMounted } from 'vue';
import ChannelTextField from 'src/components/ChannelTextField.vue'
import InviteList from 'src/components/InviteList.vue'
import { useInviteStore } from 'src/stores/invite-store';

const inviteStore = useInviteStore();
const inviteCount = computed(() => inviteStore.invites.length);

onMounted(() => {
  void inviteStore.refresh();
});
</script>

<style scoped>
.user-list-panel {
  flex: 0 0 260px;
  min-height: 0;
  display: flex;
  flex-direction: column;
  border-left: 1px solid rgba(255, 255, 255, 0.08);
  max-height: 100%;
  height: 100%;
}
.user-list-header {
  flex: 0 0 auto;
}
.user-list-body {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  scrollbar-width: none;
}
.user-list-body::-webkit-scrollbar {
  width: 0;
  height: 0;
}
</style>
