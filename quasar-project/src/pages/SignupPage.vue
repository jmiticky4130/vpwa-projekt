<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 420px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Create Account</div>
        <div class="text-caption text-grey-7">Sign up and you will be automatically logged in</div>
      </q-card-section>
      <q-separator />
      <q-card-section class="q-gutter-sm">
        <q-input v-model="form.nickname" label="Nickname" dense filled />
        <q-input v-model="form.firstName" label="First name" dense filled />
        <q-input v-model="form.lastName" label="Last name" dense filled />
        <q-input v-model="form.email" label="Email" type="email" dense filled />
        <q-input v-model="form.password" :type="showPwd ? 'text' : 'password'" label="Password" dense filled>
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
import { useAuthStore } from 'src/stores/auth-store'
import { storeToRefs } from 'pinia'

const router = useRouter()
const auth = useAuthStore()
const { loading, error } = storeToRefs(auth)

const form = reactive({
  nickname: '',
  firstName: '',
  lastName: '',
  email: '',
  password: '',
})
const showPwd = ref(false)

async function submit() {
  const payload = {
    email: form.email,
    password: form.password,
    nickname: form.nickname,
    firstName: form.firstName,
    lastName: form.lastName,
  }
  const user = await auth.signup(payload)
  if (user) {
    void router.push('/')
  }
}

function goLogin() {
  void router.push('/login')
}
</script>