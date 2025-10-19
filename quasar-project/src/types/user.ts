export interface User {
  id?: number;
  nickname?: string;
  firstName?: string;
  lastName?: string;
  email: string;
  password?: string;
  status?: 'online' | 'dnd' | 'offline';
  newchannels?: string[];
}