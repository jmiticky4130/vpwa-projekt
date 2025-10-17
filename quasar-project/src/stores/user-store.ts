import { defineStore } from 'pinia'
import { ref } from 'vue'
import usersData from 'src/../users.json'
import type { User } from 'src/types/user'

export const useUserStore = defineStore('user', () => {
  const currentUser = ref<User | null>(null)
  const users = ref<User[]>(Array.isArray(usersData) ? (usersData as unknown as User[]) : [])
    console.log(users.value)
    console.log(currentUser.value)
  

  function setCurrentUser(user: User) {
    currentUser.value = user
  }

  function clearCurrentUser() {
    currentUser.value = null
  }

  function logout() {
    clearCurrentUser()
  }

  function setStatus(status: 'online' | 'dnd' | 'offline') {
    if (currentUser.value) {
      currentUser.value.status = status
    }
  }

  function findByEmail(email: string): User | undefined {
    return users.value.find((u) => u.email === email)
  }

  function createUser(payload: Omit<User, 'id'>): User {
    const nextId = users.value.reduce((m, v) => Math.max(m, v.id || 0), 0) + 1
    const newUser: User = { id: nextId, ...payload }
    users.value.push(newUser)
    return newUser
  }


  return {
    currentUser,
    users,
    setCurrentUser,
    clearCurrentUser,
    logout,
    setStatus,
    findByEmail,
    createUser,
  }
})
