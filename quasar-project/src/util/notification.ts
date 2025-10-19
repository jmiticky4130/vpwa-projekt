// src/composables/useNotify.ts
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/user-store';
import { storeToRefs } from 'pinia';

export function useNotify() {
  const $q = useQuasar();
  const router = useRouter();
  const userStore = useUserStore();
  const { currentUser } = storeToRefs(userStore);

  function shouldNotify() {
    // Suppress notifications when user is in Do Not Disturb
    return (currentUser.value?.status ?? 'online') !== 'dnd';
  }

  function notifyMessage(userMessage: string, channelSlug: string, userNickname: string) {
    // if the user message is long of empty stright trim it
    if (userMessage.length === 0) {
        return;
    }
    if (userMessage.length > 25) {
        userMessage = userMessage.substring(0, 25) + '...';
    }

    const message = `User: ${userNickname} in channel: ${channelSlug}: ${userMessage}`;

    if (!shouldNotify()) return;
    $q.notify({
      message,
      actions: [
        {
          label: 'View message',
          color: 'white',

          handler: () => {
            void router.push({ name: 'channel', params: { slug: 'support' } });
          },
        },
        {
          label: 'Dismiss',
          color: 'white',
          handler: () => {
            const dismiss = $q.notify({});
            dismiss();
          },
        },
      ],
    });
  }
  
  function notifyJoinedChannel(name: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'positive', message: `Joined #${name}` });
  }

  function notifyAlreadyMember(name: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'info', message: `You are already a member in channel #${name}` });
  }
  
  function notifyPrivateChannelBlocked(name: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'warning', message: `#${name} is private. You cannot join.` });
  }
  
  function notifyChannelCreated(name: string, visibility: 'public' | 'private') {
    if (!shouldNotify()) return;
    $q.notify({ type: 'positive', message: `Created #${name} (${visibility})` });
  }
  
  function notifyCreatorOnlyPrivacy() {
    if (!shouldNotify()) return;
    $q.notify({ type: 'warning', message: 'Only the channel creator can change privacy.' });
  }
  
  function notifyChannelAlreadyState(isPublic: boolean) {
    if (!shouldNotify()) return;
    $q.notify({
      type: 'info',
      message: `Channel is already ${isPublic ? 'public' : 'private'}.`,
    });
  }
  
  function notifyChannelPrivacyUpdated(isPublic: boolean) {
    if (!shouldNotify()) return;
    $q.notify({
      type: 'positive',
      message: `Channel is now ${isPublic ? 'public' : 'private'}`,
    });
  }
  
  function notifyChannelDeleted(name: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'info', message: `You deleted #${name}` });
  }
  
  function notifyLeftChannel(name: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'info', message: `You left #${name}` });
  }

  function notifyInviteSuccess(target: string, channel: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'positive', message: `Invited @${target} to #${channel}` });
  }

  function notifyRevokeSuccess(target: string, channel: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'warning', message: `Removed @${target} from #${channel}` });
  }

  function notifyInviteNotAllowedPrivate() {
    if (!shouldNotify()) return;
    $q.notify({ type: 'warning', message: 'Only the channel creator can invite to a private channel.' });
  }

  function notifyRevokeNotCreator() {
    if (!shouldNotify()) return;
    $q.notify({ type: 'warning', message: 'Only the channel creator can revoke members.' });
  }

  function notifyUserNotFound(identifier: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'negative', message: `User '${identifier}' not found.` });
  }

  function notifyAlreadyInChannel(target: string, channel: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'info', message: `@${target} is already in #${channel}` });
  }

  function notifyNotInChannel(target: string, channel: string) {
    if (!shouldNotify()) return;
    $q.notify({ type: 'info', message: `@${target} is not a member of #${channel}` });
  }
  
  return {
    notifyJoinedChannel,
    notifyAlreadyMember,
    notifyPrivateChannelBlocked,
    notifyChannelCreated,
    notifyCreatorOnlyPrivacy,
    notifyChannelAlreadyState,
    notifyChannelPrivacyUpdated,
    notifyChannelDeleted,
    notifyLeftChannel,
    notifyInviteSuccess,
    notifyRevokeSuccess,
    notifyInviteNotAllowedPrivate,
    notifyRevokeNotCreator,
    notifyUserNotFound,
    notifyAlreadyInChannel,
    notifyNotInChannel,
    notifyMessage,
  };
}