export interface ApiToken {
  type: 'bearer'
  token: string
  expires_at?: string
  expires_in?: number
}

export interface RegisterData {
  email: string
  nickname: string
  firstName: string
  lastName: string
  password: string
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface User {
  id: number
  nickname: string
  firstName: string
  lastName: string
  email: string
  createdAt: string,
  updatedAt: string
  // Client-side UI fields appended after login
  status?: 'online' | 'dnd' | 'offline'
  showOnlyDirectedMessages?: boolean
  // Server-provided list of new channels (placeholder for now)
  newchannels: string[]
}