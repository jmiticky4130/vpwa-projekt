<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 420px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Create Account</div>
        <div class="text-caption text-grey-7">Sign up and you will be automatically logged in</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-sm">
        <q-input
          v-model="form.nickname"
          label="Nickname"
          dense
          filled
          :error="!!fieldErrors.nickname"
          :error-message="fieldErrors.nickname || undefined"
        />
        <q-input
          v-model="form.firstName"
          label="First name"
          dense
          filled
          :error="!!fieldErrors.firstName"
          :error-message="fieldErrors.firstName || undefined"
        />
        <q-input
          v-model="form.lastName"
          label="Last name"
          dense
          filled
          :error="!!fieldErrors.lastName"
          :error-message="fieldErrors.lastName || undefined"
        />
        <q-input
          v-model="form.email"
          label="Email"
          type="email"
          dense
          filled
          :error="!!fieldErrors.email"
          :error-message="fieldErrors.email || undefined"
        />
  <q-input v-model="form.password" :type="showPwd ? 'text' : 'password'" label="Password" dense filled :error="!!fieldErrors.password" :error-message="fieldErrors.password || undefined">
          <template #append>
            <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPwd = !showPwd" />
          </template>
        </q-input>
        <q-btn color="primary" class="full-width" label="Sign up" :loading="loading" @click="submit" />
        <q-btn flat dense no-caps class="q-mt-sm" label="Already have an account? Log in" @click="goLogin" />
        <q-banner v-if="error" class="bg-red-2 text-red-10" rounded dense>{{ error }}</q-banner>
      </q-card-section>
    </q-card>
  </q-page>
</template>


<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import usersData from 'src/../Users.json'

const router = useRouter()

const form = reactive({
  nickname: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
})
const showPwd = ref(false)
const loading = ref(false)
const error = ref<string | null>(null)
const fieldErrors = ref<{ [k: string]: string | null }>({
  nickname: null,
  firstName: null,
  lastName: null,
  email: null,
  password: null,
})

function ensureUsersInitialized() {
  try {
    const raw = localStorage.getItem('frontend_users')
    if (!raw) {
      localStorage.setItem('frontend_users', JSON.stringify(usersData || []))
    }
  } catch {
    console.error('Failed to initialize frontend_users in localStorage')
  }
}

function submit() {
  loading.value = true
  error.value = null
  // reset field errors
  Object.keys(fieldErrors.value).forEach((k) => (fieldErrors.value[k] = null))
  // basic client-side validation
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  if (!form.nickname.trim()) {
    fieldErrors.value.nickname = 'Nickname is required'
  }
  if (!form.firstName.trim()) {
    fieldErrors.value.firstName = 'First name is required'
  }
  if (!form.lastName.trim()) {
    fieldErrors.value.lastName = 'Last name is required'
  }
  if (!emailRe.test(form.email || '')) {
    fieldErrors.value.email = 'Please enter a valid email address'
  }
  if (!form.password || form.password.length < 6) {
    fieldErrors.value.password = 'Password must be at least 6 characters'
  }
  const hasFieldErrors = Object.values(fieldErrors.value).some((v) => !!v)
  if (hasFieldErrors) {
    // show per-field hints only; clear shared banner so it doesn't always appear
    loading.value = false
    error.value = null
    return
  }
  try {
    ensureUsersInitialized()
    const raw = localStorage.getItem('frontend_users') || '[]'
    const users = JSON.parse(raw) as Array<{ id: number; nickname: string; firstName: string; lastName: string; email: string; password: string; }>
    const existing = users.find((u) => u.email === form.email)
    if (existing) {
      // flag the email field specifically
      fieldErrors.value.email = 'Email already in use'
      loading.value = false
      error.value = null
      return
    }
    const nextId = users.reduce((m, v) => Math.max(m, v.id || 0), 0) + 1
    const newUser = {
      id: nextId,
      nickname: form.nickname,
      firstName: form.firstName,
      lastName: form.lastName,
      email: form.email,
      password: form.password,
    }
    users.push(newUser)
    try {
      localStorage.setItem('frontend_users', JSON.stringify(users))
    } catch (e) {
      console.error('Failed to save frontend_users', e)
      error.value = 'Unable to save user list locally'
      return
    }
    try {
      localStorage.setItem('frontend_current_user', JSON.stringify(newUser))
    } catch (e) {
      console.error('Failed to save frontend_current_user', e)
      error.value = 'Unable to save session locally'
      return
    }
    window.dispatchEvent(new Event('user-login'))
    void router.push('/')
  } catch (e) {
    console.error('Signup failed', e)
    error.value = 'An unexpected error occurred'
  } finally {
    loading.value = false
  }
}

function goLogin() {
  void router.push('/login')
}
</script>