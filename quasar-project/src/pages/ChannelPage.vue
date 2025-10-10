<template>
	<q-page class="q-pa-md column" :style="pageStyle">
		<div v-if="channel" class="row items-center q-gutter-sm full-width">
			<q-badge :color="channel.public ? 'green-7' : 'deep-orange-6'" class="text-white">
				{{ channel.public ? 'Public' : 'Private' }}
			</q-badge>
			<h4 class="q-ma-none text-white"> {{ channel.name }}</h4>
		</div>

		<div v-else class="column items-start q-gutter-sm">
			<h5 class="q-ma-none text-negative">Channel not found</h5>
			<q-btn color="primary" label="Back to home" :to="{ path: '/' }" />
		</div>

		<q-separator dark />

		<div v-if="channel" class="text-grey-4">
			<p>
				You are viewing the <strong>{{ channel.name }}</strong> channel.
			</p>
		</div>

    <!-- Message list occupies remaining space -->
    <ChannelMessageList
      v-if="channel"
      ref="msgListRef"
      :channel-key="channelKey"
    />

		<ChannelComposer
			v-if="channel"
			:channel-name="channel.name"
			@submit="handleSubmit"
		/>
	</q-page>
  
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'
import channelsData from 'src/../channels.json'
import ChannelComposer from 'src/components/ChannelTextField.vue'
import ChannelMessageList from 'src/components/ChannelMessageList.vue'
import { useUserStore } from 'src/stores/user-store'
import { storeToRefs } from 'pinia'

interface Channel {
	id: number
	name: string
	public: boolean
}

const route = useRoute()

const allChannels = Array.isArray(channelsData) ? (channelsData as Channel[]) : []

// find by slug (name)
const channel = computed<Channel | undefined>(() => {
	const slug = String(route.params.slug || '').toLowerCase()
	return allChannels.find((c) => c.name.toLowerCase() === slug)
})

// Make the page a proper flex column and pad bottom so content isn't hidden behind the fixed composer
const pageStyle = computed(() => ({
	gap: '12px',
	paddingBottom: channel.value ? '84px' : '16px',
	display: 'flex',
	flexDirection: 'column',
	minHeight: '0',
	height: '100%',
}))


// Channel key for storage (based on slug/name)
const channelKey = computed(() => (channel.value ? channel.value.name.toLowerCase() : ''))

// Access list methods
const msgListRef = ref<InstanceType<typeof ChannelMessageList> | null>(null)

function appendToList(text: string) {
	const userStore = useUserStore()
	const { currentUser } = storeToRefs(userStore)
	const displayName = currentUser.value?.nickname || currentUser.value?.email || 'Anonymous'
	msgListRef.value?.appendMessage(text, { name: displayName, sent: true })
}

// Hook submit to append
function handleSubmit(value: string) {
	appendToList(value)
}
</script>

<style scoped>
h4 {
	line-height: 1.2;
    width: 100%; /* prevent growing on long names */
}
</style>

