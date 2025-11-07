import { api } from 'src/boot/axios'
import type { InviteItem } from 'src/contracts'

class InvitesService {
  async list(): Promise<InviteItem[]> {
    const resp = await api.get<InviteItem[]>('invites')
    return resp.data
  }

  async create(payload: { channelName: string; target: string }): Promise<{ success: boolean; id?: number }> {
    const resp = await api.post<{ success: boolean; id?: number }>('invites/create', payload)
    return resp.data
  }

  async respond(inviteId: number, action: 'accept' | 'decline'): Promise<{ success: boolean; status: string; channel?: { id: number; name: string } }> {
    const resp = await api.post<{ success: boolean; status: string; channel?: { id: number; name: string } }>('invites/respond', { inviteId, action })
    return resp.data
  }
}

export default new InvitesService()