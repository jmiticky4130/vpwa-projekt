import { api } from 'src/boot/axios'
import type { Channel } from 'src/contracts/Channel'

export interface CreateChannelPayload {
  name: string
  isPublic: boolean
}

export interface ChannelNamePayload { name: string }

class ChannelService {
  async list(): Promise<Channel[]> {
    const resp = await api.get<Channel[]>('channel/list')
    return resp.data
  }

  async create(payload: CreateChannelPayload): Promise<Channel> {
    const resp = await api.post<Channel>('channel/create', payload)
    return resp.data
  }

  async remove(payload: ChannelNamePayload): Promise<void> {
    await api.post('channel/delete', payload)
  }

  async join(payload: ChannelNamePayload): Promise<void> {
    await api.post('channel/join', payload)
  }

  async leave(payload: ChannelNamePayload): Promise<void> {
    await api.post('channel/leave', payload)
  }

  async revoke(payload: { name: string; nickname: string }): Promise<void> {
    await api.post('channel/revoke', payload)
  }

  async setPrivacy(payload: { name: string; public: boolean }): Promise<void> {
    await api.patch('channel/privacy', payload)
  }
}

export default new ChannelService()
