import { defineStore } from 'pinia';
import { ref } from 'vue';
import invitesService from 'src/services/InvitesService';
import type { InviteItem } from 'src/contracts';
//import channelService from 'src/services/ChannelsService';
import { useChannelStore } from './channel-store';

export const useInviteStore = defineStore('invites', () => {
  const invites = ref<InviteItem[]>([]);
  const loading = ref(false);
  const error = ref<string | null>(null);

  const setError = (e: unknown) => {
    console.error('InviteStore error:', e);
    error.value = 'There was an error fetching invites.';
  };

  async function refresh() {
    loading.value = true;
    error.value = null;
    try {
      invites.value = await invitesService.list();
    } catch (e) {
      setError(e);
    } finally {
      loading.value = false;
    }
  }

  async function sendInvite(channelName: string, target: string): Promise<boolean> {
    try {
      await invitesService.create({ channelName, target });
      await refresh();
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }

  async function accept(inviteId: number): Promise<boolean> {
    try {
      const resp = await invitesService.respond(inviteId, 'accept');
      if (resp.channel) {
        const channelStore = useChannelStore();
        // Mark as new so it appears at top with highlight
        channelStore.markAsNew(resp.channel.name);
        // Ensure channels list updates so UI shows membership
        await channelStore.refresh(); 
      }
      invites.value = invites.value.filter((i) => i.id !== inviteId);
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }

  async function decline(inviteId: number): Promise<boolean> {
    try {
      await invitesService.respond(inviteId, 'decline');
      invites.value = invites.value.filter((i) => i.id !== inviteId);
      return true;
    } catch (e) {
      setError(e);
      return false;
    }
  }

  return { invites, loading, error, refresh, sendInvite, accept, decline };
});
