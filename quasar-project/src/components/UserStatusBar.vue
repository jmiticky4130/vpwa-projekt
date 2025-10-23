<template>
	<div class="user-status-bar">
		<q-btn
			round dense unelevated size="md"
			:color="colorFor('online')"
			:outline="status !== 'online'"
			@click="setStatus('online')"
			icon="lens"
			:aria-label="'Online'"
		>
			<q-tooltip class="text-body2 " anchor="top middle" self="bottom start">
				Set status to Online
				<br />
				Current: {{ status }}
			</q-tooltip>
		</q-btn>
		<q-btn
			round dense unelevated size="md"
			:color="colorFor('dnd')"
			:outline="status !== 'dnd'"
			@click="setStatus('dnd')"
			icon="do_not_disturb_on"
			:aria-label="'Do not disturb'"
		>
			<q-tooltip class="text-body2">
				Set status to Do Not Disturb
				<br />
				Current: {{ status }}
			</q-tooltip>
		</q-btn>
		<q-btn
			round dense unelevated size="md"
			:color="colorFor('offline')"
			:outline="status !== 'offline'"
			@click="setStatus('offline')"
			icon="trip_origin"
			:aria-label="'Offline'"
		>
			<q-tooltip class="text-body2">
				Set status to Offline
				<br />
				Current: {{ status }}
			</q-tooltip>
		</q-btn>
		<q-btn
			round dense unelevated size="md"
			:color="colorFor('directed')"
			:outline="directedOnly !== false"
			@click="toggleShowOnlyDirectedMessages"
			icon="trip_origin"
			:aria-label="'Directed Messages'"
		>
			<q-tooltip class="text-body2">
				Toggle: Show only messages directed at you
				<br />
				Currently: {{ directedOnly ? 'Only directed messages' : 'All messages' }}
			</q-tooltip>
		</q-btn>
	</div>
</template>

<script setup lang="ts">
import { computed, onBeforeMount } from 'vue'
import { useUserStore } from 'src/stores/user-store'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)

const status = computed(() => currentUser.value?.status ?? 'online')
const directedOnly = computed(() => currentUser.value?.showOnlyDirectedMessages ?? false)

function setStatus(status: 'online' | 'dnd' | 'offline') {
	userStore.setStatus(status)
}
function toggleShowOnlyDirectedMessages() {
  if (currentUser.value) {
	const newValue = !currentUser.value.showOnlyDirectedMessages;
	userStore.setShowOnlyDirectedMessages(newValue);
  }
}

function colorFor(s: 'online' | 'dnd' | 'offline' | 'directed') {
	if (s === 'offline') return 'grey-6'
	if (s === 'dnd') return 'red-6'
	if (s === 'directed') return 'blue-6'
	return 'green-6'
}

onBeforeMount(() => {
	userStore.setStatus('online')
})

</script>

<style scoped>
.user-status-bar {
	position: fixed;
	left: 0;
	bottom: 0;
	width: 220px;
	height: 61px;
	display: flex;
	align-items: center;
	justify-content: center;
	gap: 16px;
	padding: 8px 6px;
	background: rgba(0, 0, 0, 0.58);
	border-top: 1px solid #222;
}
</style>
