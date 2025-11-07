export interface InviteItem {
  id: number
  channelId: number
  channelName: string
  public: boolean
  creatorId: number
  status: 'pending' | 'accepted' | 'declined'
  createdAt: string
  expiresAt: string | null
}
