import { api } from 'src/boot/axios'
import type { User } from 'src/contracts'

class UsersService {
  async getByChannel(channelId: number): Promise<User[]> {
    const resp = await api.get<Pick<User,'id'|'nickname'|'firstName'|'lastName'|'email'>[]>('users/get', { params: { channelId } })
    return resp.data.map((u) => ({
      ...u,
      createdAt: '',
      updatedAt: '',
      newchannels: [],
    })) as User[]
  }
}

export default new UsersService()
