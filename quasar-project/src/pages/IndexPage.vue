<template>
  <q-page class="q-pa-lg flex flex-center">
    <div class="column q-gutter-lg" style="max-width:640px; width:100%">
      <q-card>
        <q-card-section>
          <div class="text-h6">Welcome</div>
          <div class="text-caption text-grey-7">You are authenticated.</div>
        </q-card-section>
        <q-separator />
        <q-card-section>
          <div v-if="auth.user" class="q-gutter-xs">
            <div><strong>Email:</strong> {{ auth.user.email }}</div>
            <div v-if="auth.user.nickname"><strong>Nickname:</strong> {{ auth.user.nickname }}</div>
            <div v-if="auth.user.firstName || auth.user.lastName"><strong>Name:</strong> {{ auth.user.firstName }} {{ auth.user.lastName }}</div>
          </div>
          <q-banner v-else class="bg-orange-2 text-orange-10" rounded dense>Loading user...</q-banner>
        </q-card-section>
      </q-card>
    </div>
  </q-page>
</template>

<script setup lang="ts">
import { useAuthStore } from 'src/stores/auth-store'
import { onMounted } from 'vue'

const auth = useAuthStore()

onMounted(() => {
  if (!auth.user && auth.token) {
    void auth.fetchMe()
  }
})
</script>
