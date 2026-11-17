import { Chatroom } from '@/src/lib/types';

export function isDirectChatroom(room?: Chatroom | null) {
  return room?.type === 'DIRECT' || room?.type === 'DM';
}
