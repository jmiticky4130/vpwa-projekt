import { boot } from 'quasar/wrappers'
import axios, { type AxiosInstance } from 'axios'
import { authManager } from 'src/services'
import { useAuthStore } from 'src/stores/auth-store'

const API_URL = process.env.API_URL || 'http://localhost:3333'
const DEBUG = process.env.NODE_ENV === 'development'


declare module '@vue/runtime-core' {
  interface ComponentCustomProperties {
    $axios: AxiosInstance
    $api: AxiosInstance
  }
}

const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {}
})

// add interceptor to add authorization header for api calls
api.interceptors.request.use(
  (config) => {
    const authStore = useAuthStore()
    if (authStore.user?.status === 'offline') {
      return Promise.reject(new Error('Offline mode enabled'))
    }

    const token = authManager.getToken()

    if (token !== null) {
      config.headers.Authorization = `Bearer ${token}`
    }

    if (DEBUG) {
      console.info('-> ', config)
    }

    return config
  },
  (error) => {
    if (DEBUG) {
      console.error('-> ', error)
    }

    return Promise.reject(Error(error))
  }
)

// add interceptor for response to trigger logout
api.interceptors.response.use(
  (response) => {
    const authStore = useAuthStore()
    if (authStore.user?.status === 'offline') {
      return Promise.reject(new Error('Offline mode enabled'))
    }
    if (DEBUG) {
      console.info('<- ', response)
    }

    return response
  },
  (error) => {
    if (DEBUG) {
      console.error('<- ', error.response)
    }

    // server api request returned unathorized response so we trrigger logout
    if (error.response && error.response.status === 401 && !error.response.config.dontTriggerLogout) {
      authManager.logout()
    }

    let message = error.message
    if (error.response && error.response.data) {
      if (error.response.data.message) {
        message = error.response.data.message
      } else if (error.response.data.error) {
        message = error.response.data.error
      }
    }
    
    if (Array.isArray(message)) {
      message = message.join(', ')
    }

    return Promise.reject(new Error(message))
  }
)

export default boot(({ app }) => {
  // for use inside Vue files (Options API) through this.$axios and this.$api
  app.config.globalProperties.$axios = axios
  app.config.globalProperties.$api = api
})

export { api }