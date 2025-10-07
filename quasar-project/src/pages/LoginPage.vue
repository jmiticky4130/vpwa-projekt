<template>
  <q-page class="q-pa-md flex flex-center">
    <q-card style="width: 380px; max-width: 95vw">
      <q-card-section>
        <div class="text-h6">Log In</div>
        <div class="text-caption text-grey-7">Access your account</div>
      </q-card-section>
      <q-separator />
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
          color="primary"
          class="full-width"
          label="Login"
          :loading="loading"
          @click="submit"
        />
        <q-btn
          flat
          dense
          no-caps
          class="q-mt-sm"
          label="Need an account? Sign up"
          @click="goSignup"
        />
        <q-banner v-if="error" class="bg-red-2 text-red-10" rounded dense>{{ error }}</q-banner>
      </q-card-section>
    </q-card>
  </q-page>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { useRouter } from 'vue-router';
import { useUserStore } from 'src/stores/user-store';

const router = useRouter();
const userStore = useUserStore();

const email = ref('');
const password = ref('');
const showPwd = ref(false);
const loading = ref(false);
const error = ref<string | null>(null);
const fieldErrors = ref<{ [k: string]: string | null }>({ email: null, password: null });

function submit() {
  loading.value = true;
  error.value = null;
  // reset field errors
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
    loading.value = false;
    // show per-field errors only
    error.value = null;
    return;
  }
  try {
    const found = userStore.findByEmail(email.value);
    if (!found || found.password !== password.value) {
      // attach generic invalid message to both fields so user sees where to fix
      fieldErrors.value.email = 'Invalid email or password';
      fieldErrors.value.password = 'Invalid email or password';
      loading.value = false;
      error.value = null;
      return;
    }
    // persist session via user store
    userStore.setCurrentUser(found);
    void router.push('/');
  } catch (e) {
    console.error('Login failed', e);
    error.value = 'An unexpected error occurred';
  } finally {
    loading.value = false;
  }
}

function goSignup() {
  void router.push('/signup');
}
</script>
