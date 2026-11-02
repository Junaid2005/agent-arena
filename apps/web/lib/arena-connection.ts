import { io } from 'socket.io-client';
import type { Input, Shot, Snapshot } from '../../../packages/shared/src/types';
import type { JoinReply, JoinRequest, ServerEvents } from '../../../packages/shared/src/protocol';

export interface ArenaConnection {
  disconnect(): void;
  sendInput(input: Input): void;
}
interface Handlers {
  identity(): JoinRequest;
  joined(reply: JoinReply): void;
  snapshot(snapshot: Snapshot): void;
  shot(shot: Shot): void;
  disconnected(): void;
  error(message: string): void;
  replaced(): void;
  commentaryAudio?: ServerEvents['commentaryAudio'];
  commentaryText?: ServerEvents['commentaryText'];
}
export function connectArena(serverUrl: string, handlers: Handlers): ArenaConnection {
  if (!/^https?:/.test(serverUrl)) {
    queueMicrotask(() =>
      handlers.error('The arena server is not configured. Please reload later.'),
    );
    return { disconnect() {}, sendInput() {} };
  }
  const socket = io(serverUrl, {
    transports: ['websocket', 'polling'],
    tryAllTransports: true,
    timeout: 20_000,
    reconnectionAttempts: Infinity,
    reconnectionDelay: 1_000,
  });
  socket.on('connect', () => {
    socket
      .timeout(15_000)
      .emit('join', handlers.identity(), (error: Error | null, result: JoinReply) => {
        if (error || !result) handlers.error('The arena did not respond. Please retry.');
        else handlers.joined(result);
      });
  });
  socket.on('snapshot', handlers.snapshot);
  socket.on('shot', handlers.shot);
  if (handlers.commentaryAudio) socket.on('commentaryAudio', handlers.commentaryAudio);
  if (handlers.commentaryText) socket.on('commentaryText', handlers.commentaryText);
  socket.on('disconnect', (reason) => {
    if (reason === 'io server disconnect') handlers.replaced();
    else handlers.disconnected();
  });
  socket.on('connect_error', () => handlers.error('Cannot reach the arena. Reconnecting…'));
  return {
    disconnect: () => socket.disconnect(),
    sendInput: (input) => {
      socket.emit('input', input);
    },
  };
}
