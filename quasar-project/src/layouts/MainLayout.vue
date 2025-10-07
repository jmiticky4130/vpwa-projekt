<template>
	<q-layout view="lHh Lpr lFf" class="bg-dark">
		<q-header elevated class="bg-primary text-white">
			<q-toolbar>
				<q-toolbar-title class="text-weight-medium cursor-pointer" @click="goHome">App</q-toolbar-title>
				<div v-if="currentUser" class="row items-center q-gutter-sm">
					<q-badge color="white" text-color="primary">{{ currentUser.email }}</q-badge>
					<q-btn dense flat icon="logout" @click="logout" />
				</div>
				<div v-else class="row items-center q-gutter-sm">
					<q-btn dense flat label="Login" @click="goLogin" />
					<q-btn dense flat label="Sign up" @click="goSignup" />
				</div>
			</q-toolbar>
		</q-header>
		<q-page-container>
			<div class="layout-with-channels" style="display:flex">
				<ChannelNavigation v-if="currentUser" />
				<div style="flex:1">
					<router-view />
				</div>
			</div>
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { ref, onMounted, onUnmounted } from 'vue'
import ChannelNavigation from 'src/components/ChannelNavigation.vue'


const router = useRouter()
const currentUser = ref<{ email?: string } | null>(null)

function loadCurrentUser() {
	try {
		const raw = localStorage.getItem('frontend_current_user') || null
		if (raw) currentUser.value = JSON.parse(raw)
		else currentUser.value = null
	} catch {
		currentUser.value = null
	}
}

onMounted(() => {
	loadCurrentUser()
	window.addEventListener('user-login', loadCurrentUser)
})
onUnmounted(() => {
	window.removeEventListener('user-login', loadCurrentUser)
})

function goHome() { void router.push('/') }
function goLogin() { void router.push('/login') }
function goSignup() { void router.push('/signup') }
function logout() {
	try { localStorage.removeItem('frontend_current_user') } catch {
		console.error('Failed to remove frontend_current_user from localStorage')
	}
	try { sessionStorage.removeItem('frontend_current_user') } catch {
		console.error('Failed to remove frontend_current_user from sessionStorage')
	}
	currentUser.value = null
	void router.push('/login')
}
</script>

<style scoped>
.q-toolbar-title {
	user-select: none;
}
</style>
