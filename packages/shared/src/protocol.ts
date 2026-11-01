import type { Input, Shot, Snapshot } from './types.ts';
import type { PetId } from './pets.ts';
export type JoinRequest = { name: string; room?: string; token?: string; pet?: PetId };
export type JoinReply =
  | { ok: true; id: string; token: string; snapshot: Snapshot }
  | { ok: false; error: string };
export interface ClientEvents {
  join: (data: JoinRequest, reply: (result: JoinReply) => void) => void;
  input: (input: Input) => void;
}
export interface ServerEvents {
  snapshot: (snapshot: Snapshot) => void;
  shot: (shot: Shot) => void;
  notice: (text: string) => void;
  commentaryAudio: (c: { turn: number; pcm: ArrayBuffer | Uint8Array }) => void;
  commentaryText: (c: { turn: number; text: string }) => void;
}
