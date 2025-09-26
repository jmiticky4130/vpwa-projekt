<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 380px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Log In</div>
        <div class="text-caption text-grey-7">Access your account</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-sm">
        <q-input v-model="email" label="Email" type="email" dense filled />
        <q-input v-model="password" :type="showPwd ? 'text' : 'password'" label="Password" dense filled>
          <template #append>
            <q-icon :name="showPwd ? 'visibility_off' : 'visibility'" class="cursor-pointer" @click="showPwd = !showPwd" />
          </template>
        </q-input>
        <q-btn color="primary" class="full-width" label="Login" :loading="loading" @click="submit" />
        <q-btn flat dense no-caps class="q-mt-sm" label="Need an account? Sign up" @click="goSignup" />
        <q-banner v-if="error" class="bg-red-2 text-red-10" rounded dense>{{ error }}</q-banner>
      </q-card-section>
    </q-card>
  </q-page>
</template>


<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useAuthStore } from 'src/stores/auth-store'
import { storeToRefs } from 'pinia'

const router = useRouter()
const auth = useAuthStore()

const email = ref('')
const password = ref('')
const showPwd = ref(false)
const { loading, error } = storeToRefs(auth)

async function submit() {
  try {
    await auth.login(email.value, password.value)
    void router.push('/')
  } catch {
    // error handled in store
  }
}

function goSignup() { void router.push('/signup') }
</script>
