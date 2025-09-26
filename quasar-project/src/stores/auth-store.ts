import { defineStore } from 'pinia';
import { ref } from 'vue';

interface UserShape {
  id: number;
  email: string;
  nickname: string;
  firstName: string;
  lastName: string;
}

interface AuthResponse {
  user: UserShape;
  token: { type: string; value: string; expiresIn: string };
}

function saveToken(token: string | null) {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
}

async function api(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('auth_token');
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    Accept: 'application/json',
    ...(options.headers as Record<string, string> | undefined),
  };
  if (token) headers.Authorization = `Bearer ${token}`;

  const res = await fetch(`/api${path}`, { ...options, headers });

  if (!res.ok) {
    // Try to parse JSON
    const body = await res.json().catch(() => ({}));
    const message = body.message || 'Unknown error';
    throw new Error(message);
  }

  // Detect unexpected redirects (often validation redirect when Accept header missing)
  if (res.type === 'basic' && res.redirected) {
    throw new Error(
      'Unexpected redirect (possible validation or CSRF redirect). Check server logs.',
    );
  }
  if (res.status === 401) {
    // let caller handle clearing if needed
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.message || `HTTP ${res.status}`);
  return data;
}




export const useAuthStore = defineStore('auth', () => {
  const user = ref<UserShape | null>(null);
  const token = ref<string | null>(localStorage.getItem('auth_token'));
  const loading = ref(false);
  const error = ref<string | null>(null);

  function setSession(u: UserShape, t: string) {
    user.value = u;
    token.value = t;
    saveToken(t);
  }

  function clearSession() {
    user.value = null;
    token.value = null;
    saveToken(null);
  }

  async function signup(payload: {
    email: string;
    password: string;
    nickname: string;
    firstName: string;
    lastName: string;
  }) {
    loading.value = true;
    error.value = null;
    try {
      const data: AuthResponse = await api('/users', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setSession(data.user, data.token.value);
      return data.user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      setTimeout(() => {
        if (error.value === msg) error.value = null;
      }, 3000);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function login(email: string, password: string) {
    loading.value = true;
    error.value = null;
    try {
      const data: AuthResponse = await api('/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      setSession(data.user, data.token.value);
      return data.user;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      error.value = msg;
      setTimeout(() => {
        if (error.value === msg) error.value = null;
      }, 3000);
      return null;
    } finally {
      loading.value = false;
    }
  }

  async function fetchMe() {
    if (!token.value) return null;
    try {
      const data = await api('/me');
      user.value = data;
      return data;
    } catch {
      // token invalid
      clearSession();
      return null;
    }
  }

  async function logout() {
    if (!token.value) return;
    try {
      await api('/logout', { method: 'POST' });
    } catch {
      // ignore
    } finally {
      clearSession();
    }
  }
  
  return { user, token, loading, error, signup, login, logout, fetchMe, clearSession };
});
