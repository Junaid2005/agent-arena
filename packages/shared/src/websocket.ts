import type { JoinRequest, JoinReply } from './protocol.ts';
import type { Input, Snapshot, Shot } from './types.ts';

export type ClientPacket = { event: 'join'; data: JoinRequest } | { event: 'input'; data: Input };
export type ServerPacket =
  | { event: 'joined'; data: JoinReply }
  | { event: 'snapshot'; data: Snapshot }
  | { event: 'shot'; data: Shot }
  | { event: 'error'; data: string }
  | { event: 'commentaryAudio'; data: { turn: number; pcm: string } }
  | { event: 'commentaryText'; data: { turn: number; text: string } };
