import type { User } from "./Auth";

export type RawMessage = string;

export interface SerializedMessage {
  createdBy: number;
  body: string;
  channelId: number;
  createdAt: string;
  updatedAt: string;
  id: number;
  author: User;
}