import { useRouter } from 'vue-router';
//import { storeToRefs } from 'pinia';
import { Notify } from 'quasar';
import { AppVisibility } from 'quasar';
import { Screen } from 'quasar';
//import { computed } from 'vue/dist/vue.js';
//import { useAuthStore } from 'src/stores/auth-store';

Notify.setDefaults({
  position: Screen.lt.sm ? 'top' : 'bottom-right',
});

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function useNotify() {
  const router = useRouter();

  //const authStore = storeToRefs(useAuthStore());
  //const currentUser = computed(() => authStore.user.value);

  function shouldNotify(rawMessage?: string) {
   /* const status = currentUser.value?.status ?? 'online';
    if (status === 'dnd') return false;

    const onlyDirected = currentUser.value?.showOnlyDirectedMessages ?? false;
    if (!onlyDirected) return true;

    const nick = currentUser.value?.nickname?.trim();
    if (!nick || !rawMessage) return false;
    const mention = `@${nick}`;*/
    //return rawMessage.includes(mention);
    return true;
  }

  async function notifySystemMessage(title: string, body: string, channelSlug: string) {
    if (!('Notification' in window)) return;

    if (Notification.permission !== 'granted') {
      const perm = await Notification.requestPermission();
      if (perm !== 'granted') return;
    }

    const options: NotificationOptions = {
      body,
      icon: '/icons/icon-128x128.png',
    };

    const reg = await navigator.serviceWorker?.getRegistration?.();
    if (reg && 'showNotification' in reg) {
      await reg.showNotification(title, options);
      return;
    }

    const n = new Notification(title, options);
    n.onclick = () => {
      window.focus();
      void router.push({ name: 'channel', params: { slug: channelSlug } });
    };
  }

  async function notifyMessage(userMessage: string, channelSlug: string, userNickname: string) {
    if (shouldNotify(userMessage) === false) {
      return;
    }

    await delay(2000);

    if (!AppVisibility.appVisible) {
      await notifySystemMessage(
        `Message from ${userNickname} in #${channelSlug}`,
        userMessage,
        channelSlug,
      );
    } else {
      let display = userMessage;
      if (display.length > 25) {
        display = display.substring(0, 25) + '...';
      }

      const message = `User: ${userNickname} in channel: ${channelSlug}: ${display}`;
      Notify.create({
        message,
        actions: [
          {
            label: 'View message',
            color: 'white',

            handler: () => {
              void router.push({ name: 'channel', params: { slug: channelSlug } });
            },
          },
          {
            label: 'Dismiss',
            color: 'white',
            handler: () => {
              const dismiss = Notify.create({});
              dismiss();
            },
          },
        ],
      });
    }
  }

  function notifyJoinedChannel(name: string) {
    Notify.create({ type: 'positive', message: `Joined #${name}` });
  }

  function notifyAlreadyMember(name: string) {
    Notify.create({ type: 'info', message: `You are already a member in channel #${name}` });
  }

  function notifyPrivateChannelBlocked(name: string) {
    Notify.create({ type: 'warning', message: `#${name} is private. You cannot join.` });
  }

  function notifyChannelCreated(name: string, visibility: 'public' | 'private') {
    Notify.create({ type: 'positive', message: `Created #${name} (${visibility})` });
  }

  function notifyCreatorOnlyPrivacy() {
    Notify.create({ type: 'warning', message: 'Only the channel creator can change privacy.' });
  }

  function notifyChannelAlreadyState(isPublic: boolean) {
    Notify.create({
      type: 'info',
      message: `Channel is already ${isPublic ? 'public' : 'private'}.`,
    });
  }

  function notifyChannelPrivacyUpdated(isPublic: boolean) {
    Notify.create({
      type: 'positive',
      message: `Channel is now ${isPublic ? 'public' : 'private'}`,
    });
  }

  function notifyChannelDeleted(name: string) {
    Notify.create({ type: 'info', message: `You deleted #${name}` });
  }

  function notifyLeftChannel(name: string) {
    Notify.create({ type: 'info', message: `You left #${name}` });
  }

  function notifyInviteSuccess(target: string, channel: string) {
    Notify.create({ type: 'positive', message: `Invited @${target} to #${channel}` });
  }

  function notifyRevokeSuccess(target: string, channel: string) {
    Notify.create({ type: 'warning', message: `Removed @${target} from #${channel}` });
  }

  function notifyInviteNotAllowedPrivate() {
    Notify.create({
      type: 'warning',
      message: 'Only the channel creator can invite to a private channel.',
    });
  }

  function notifyRevokeNotCreator() {
    Notify.create({ type: 'warning', message: 'Only the channel creator can revoke members.' });
  }

  function notifyKickNotAllowedPrivate() {
    Notify.create({
      type: 'warning',
      message: 'Kick voting is only available in public channels.',
    });
  }

  function notifyKickCannotKickCreator() {
    Notify.create({ type: 'warning', message: 'You cannot kick the channel creator.' });
  }

  function notifyKickCannotKickSelf() {
    Notify.create({ type: 'info', message: 'You cannot kick yourself.' });
  }

  function notifyKickVoteAdded(target: string, count: number) {
    const thresholdKick = 2;
    const remaining = Math.max(0, thresholdKick - count);
    const msg =
      remaining > 0
        ? `Kick vote for @${target} registered (${count}/${thresholdKick}). ${remaining} more needed.`
        : `Kick vote threshold reached for @${target}. User is now banned.`;
    Notify.create({ type: remaining > 0 ? 'info' : 'negative', message: msg });
  }

  function notifyKickVoteDuplicate(target: string) {
    Notify.create({ type: 'info', message: `You've already voted to kick @${target}.` });
  }

  function notifyKickedByAdmin(target: string, channel: string) {
    Notify.create({
      type: 'negative',
      message: `@${target} was kicked from #${channel} by the creator.`,
    });
  }

  function notifyBannedCannotJoin(name: string) {
    Notify.create({
      type: 'warning',
      message: `You are banned from #${name}. Contact the creator to be invited back.`,
    });
  }

  function notifyInviteBlockedBanned(target: string, channel: string) {
    Notify.create({
      type: 'warning',
      message: `@${target} is banned from #${channel}. Only the creator can invite them back.`,
    });
  }

  function notifyUserNotFound(identifier: string) {
    Notify.create({ type: 'negative', message: `User '${identifier}' not found.` });
  }

  function notifyAlreadyInChannel(target: string, channel: string) {
    Notify.create({ type: 'info', message: `@${target} is already in #${channel}` });
  }

  function notifyNotInChannel(target: string, channel: string) {
    Notify.create({ type: 'info', message: `@${target} is not a member of #${channel}` });
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
    notifyKickNotAllowedPrivate,
    notifyKickCannotKickCreator,
    notifyKickCannotKickSelf,
    notifyKickVoteAdded,
    notifyKickVoteDuplicate,
    notifyKickedByAdmin,
    notifyBannedCannotJoin,
    notifyInviteBlockedBanned,
    notifyUserNotFound,
    notifyAlreadyInChannel,
    notifyNotInChannel,
    notifyMessage,
  };
}
