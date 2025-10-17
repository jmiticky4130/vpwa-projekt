<template>
	<div class="user-status-bar">
		<q-btn
			round dense unelevated size="sm"
			:color="colorFor('online')"
			:outline="status !== 'online'"
			@click="set('online')"
			icon="lens"
			:aria-label="'Online'"
		/>
		<q-btn
			round dense unelevated size="sm"
			:color="colorFor('dnd')"
			:outline="status !== 'dnd'"
			@click="set('dnd')"
			icon="do_not_disturb_on"
			:aria-label="'Do not disturb'"
		/>
		<q-btn
			round dense unelevated size="sm"
			:color="colorFor('offline')"
			:outline="status !== 'offline'"
			@click="set('offline')"
			icon="trip_origin"
			:aria-label="'Offline'"
		/>
	</div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserStore } from 'src/stores/user-store'
import { storeToRefs } from 'pinia'

const userStore = useUserStore()
const { currentUser } = storeToRefs(userStore)

const status = computed(() => currentUser.value?.status ?? 'online')

function set(next: 'online' | 'dnd' | 'offline') {
	userStore.setStatus(next)
}

function colorFor(s: 'online' | 'dnd' | 'offline') {
	if (s === 'online') return 'green-6'
	if (s === 'dnd') return 'red-6'
	return 'grey-6'
}
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
	gap: 12px;
	padding: 8px 12px;
	background: rgba(0, 0, 0, 0.58);
	border-top: 1px solid #222;
}
</style>
