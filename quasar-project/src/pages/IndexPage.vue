<template>
  <q-page class="q-pa-md column items-center">
    <q-card class="full-width" style="max-width: 640px">
      <q-card-section>
        <div class="text-h6">Create user</div>
        <div class="text-caption text-grey-7">Simple form that posts to Adonis</div>
      </q-card-section>

      <q-separator />

      <q-card-section class="q-gutter-md">
        <q-input v-model="firstName" label="First name" dense filled />
        <q-input v-model="lastName" label="Last name" dense filled />
        <q-input v-model="email" label="Email" type="email" dense filled />
        <q-input v-model="password" label="Password" type="password" dense filled />
        <div class="row q-gutter-sm">
          <q-btn color="primary" label="Create" @click="createUser" :loading="loading" />
          <q-btn flat label="Reset" @click="reset" />
        </div>
      </q-card-section>

      <q-separator />

      <q-card-section>
        <q-banner v-if="result" class="q-mb-sm" rounded dense :class="result.error ? 'bg-red-2 text-red-10' : 'bg-green-2 text-green-10'">
          {{ result.message }}
        </q-banner>
      </q-card-section>
    </q-card>
  </q-page>
  
</template>

<script setup lang="ts">
import { ref } from 'vue'

const firstName = ref('')
const lastName = ref('')
const email = ref('')
const password = ref('')
const loading = ref(false)
const result = ref<{ error?: boolean; message: string } | null>(null)

async function createUser() {
  result.value = null
  loading.value = true
  try {
    const res = await fetch('/api/users', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        firstName: firstName.value || undefined,
        lastName: lastName.value || undefined,
        email: email.value,
        password: password.value,
      }),
    })
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`)
    result.value = { message: `Created user with id ${data.id}` }
    reset()
  } catch (err) {
    result.value = { error: true, message: String(err) }
  } finally {
    loading.value = false
  }
}

function reset() {
  firstName.value = ''
  lastName.value = ''
  email.value = ''
  password.value = ''
}
</script>
