// src/composables/useNotify.ts
import { useQuasar } from 'quasar';
import { useRouter } from 'vue-router';

export function useNotify() {
  const $q = useQuasar();
  const router = useRouter();

  function notify(userMessage: string, channelSlug: string, userNickname: string) {
    // if the user message is long of empty stright trim it
    if (userMessage.length === 0) {
        return;
    }
    if (userMessage.length > 25) {
        userMessage = userMessage.substring(0, 25) + '...';
    }

    const message = `User: ${userNickname} in channel: ${channelSlug}: ${userMessage}`;

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

  return { notify };
}
