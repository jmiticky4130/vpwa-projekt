<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 380px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Log In</div>
        <div class="text-caption text-grey-7">Access your account</div>
      </q-card-section>
      <q-separator />
      <q-form @submit.prevent="submit" novalidate>
        <q-card-section class="q-gutter-sm">
          <q-input
            v-model="email"
            label="Email"
            type="email"
            dense
            filled
            :error="!!fieldErrors.email"
            :error-message="fieldErrors.email || undefined"
          />
          <q-input
            v-model="password"
            :type="showPwd ? 'text' : 'password'"
            label="Password"
            dense
            filled
            :error="!!fieldErrors.password"
            :error-message="fieldErrors.password || undefined"
          >
            <template #append>
              <q-icon
                :name="showPwd ? 'visibility_off' : 'visibility'"
                class="cursor-pointer"
                @click="showPwd = !showPwd"
              />
            </template>
          </q-input>
          <q-btn
            type="submit"
            color="primary"
            class="full-width"
            label="Login"
            :loading="loading"
          />
          <q-btn
            type="button"
            flat
            dense
            no-caps
            class="q-mt-sm"
            label="Need an account? Sign up"
            @click="goSignup"
          />
          <q-banner v-if="error" class="bg-red-2 text-red-10" rounded dense>{{ error }}</q-banner>
        </q-card-section>
      </q-form>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue';
import { useRouter } from 'vue-router';
import { useAuthStore } from 'src/stores/auth-store';

const router = useRouter();
const auth = useAuthStore();

const email = ref('');
const password = ref('');
const showPwd = ref(false);
const loading = computed(() => auth.loading);
const error = computed<string | null>(() => (auth.errors[0]?.message ?? null));
const fieldErrors = ref<{ [k: string]: string | null }>({ email: null, password: null });

async function submit() {
  // reset auth errors

  Object.keys(fieldErrors.value).forEach((k) => (fieldErrors.value[k] = null));
  const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRe.test(email.value || '')) {
    fieldErrors.value.email = 'Please enter a valid email address';
  }
  if (!password.value) {
    fieldErrors.value.password = 'Password is required';
  }
  const hasFieldErrors = Object.values(fieldErrors.value).some((v) => !!v);
  if (hasFieldErrors) {
    return;
  }
  try {
    await auth.login({ email: email.value, password: password.value });
    // Redirect after login 
    await router.push('/');
  } catch (e) {
    console.error('Login failed', e);
    // auth store already captured errors
  }
}

function goSignup() {
  void router.push('/signup');
}
</script>
