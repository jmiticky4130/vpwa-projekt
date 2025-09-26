<template>
	<q-layout view="lHh Lpr lFf" class="bg-dark">
		<q-header elevated class="bg-primary text-white">
			<q-toolbar>
				<q-toolbar-title class="text-weight-medium cursor-pointer" @click="goHome">App</q-toolbar-title>
				<div v-if="auth.user" class="row items-center q-gutter-sm">
					<q-badge color="white" text-color="primary">{{ auth.user.email }}</q-badge>
					<q-btn dense flat icon="logout" @click="logout" :loading="auth.loading" />
				</div>
				<div v-else class="row items-center q-gutter-sm">
					<q-btn dense flat label="Login" @click="goLogin" />
					<q-btn dense flat label="Sign up" @click="goSignup" />
				</div>
			</q-toolbar>
		</q-header>
		<q-page-container>
			<router-view />
		</q-page-container>
	</q-layout>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'
import { onMounted } from 'vue'

const auth = useAuthStore()
const router = useRouter()

onMounted(() => {
	if (!auth.user && auth.token) {
		void auth.fetchMe()
	}
})

function goHome() { void router.push('/') }
function goLogin() { void router.push('/login') }
function goSignup() { void router.push('/signup') }
async function logout() { await auth.logout(); void router.push('/login') }
</script>

<style scoped>
.q-toolbar-title { user-select: none; }
</style>
