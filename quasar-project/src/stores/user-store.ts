import { defineStore } from 'pinia'
import { ref } from 'vue'
import usersData from 'src/../users.json'
import type { User } from 'src/types/user'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>(Array.isArray(usersData) ? (usersData as unknown as User[]) : [])
  ;(users.value as User[]).forEach((u) => {
    if (!Array.isArray(u.newchannels)) u.newchannels = []
  })
  

  function setCurrentUser(user: User) {
    if (!Array.isArray(user.newchannels)) user.newchannels = []
    currentUser.value = user
  }

  function logout() {
    setStatus('offline')
    currentUser.value = null
  }

  function setStatus(status: 'online' | 'dnd' | 'offline') {
    if (currentUser.value) {
      currentUser.value.status = status
    }
  }

  function findByEmail(email: string): User | undefined {
    return users.value.find((u) => u.email === email)
  }

  function createUser(payload: User): User {
    const nextId = users.value.reduce((m, v) => Math.max(m, v.id || 0), 0) + 1
    const newUser: User = { id: nextId, newchannels: [], ...payload }
    users.value.push(newUser)
    return newUser
  }

  function addNewChannel(userId: number, channelName: string) {
    const u = users.value.find((x) => x.id === userId)
    if (!u) return
    if (!Array.isArray(u.newchannels)) u.newchannels = []
    const slug = channelName.toLowerCase()
    if (!u.newchannels.includes(slug)) u.newchannels.unshift(slug)
  }

  function clearNewChannel(userId: number, channelName: string) {
    const u = users.value.find((x) => x.id === userId)
    if (!u || !Array.isArray(u.newchannels)) return
    const slug = channelName.toLowerCase()
    u.newchannels = u.newchannels.filter((s) => s !== slug)
  }


  return {
    currentUser,
    users,
    setCurrentUser,
    logout,
    setStatus,
    findByEmail,
    createUser,
    addNewChannel,
    clearNewChannel,
  }
})
