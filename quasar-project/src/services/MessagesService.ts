import { api } from 'src/boot/axios'

export interface MessageDto {
  id: number
  channelId: number
  authorId: number
  body: string
  createdAt: string | null
}

class MessagesService {
  async getByChannel(channelId: number): Promise<MessageDto[]> {
    const resp = await api.get<MessageDto[]>('messages/get', { params: { channelId } })
    return resp.data
  }
}

export default new MessagesService()
