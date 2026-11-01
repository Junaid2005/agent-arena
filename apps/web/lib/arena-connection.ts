import { io } from 'socket.io-client';
import type { Input, Shot, Snapshot } from '../../../packages/shared/src/types';
import type { JoinReply, JoinRequest } from '../../../packages/shared/src/protocol';
import type { ServerPacket } from '../../../packages/shared/src/websocket';

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
}
export function connectArena(serverUrl: string, handlers: Handlers): ArenaConnection {
  // Keep the existing standalone development server usable; production uses same-origin WSS.
  if (/^https?:/.test(serverUrl)) {
    const socket = io(serverUrl, {
      transports: ['polling'],
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
    socket.on('disconnect', handlers.disconnected);
    socket.on('connect_error', () => handlers.error('Cannot reach the arena. Reconnecting…'));
    return {
      disconnect: () => socket.disconnect(),
      sendInput: (input) => {
        socket.emit('input', input);
      },
    };
  }
  const address =
    serverUrl || new URL('/api/arena', window.location.origin).href.replace(/^http/, 'ws');
  let socket: WebSocket | null = null,
    stopped = false,
    joined = false,
    attempt = 0;
  let retry: ReturnType<typeof setTimeout> | undefined;
  let watchdog: ReturnType<typeof setInterval> | undefined;
  let lastFrame = Date.now();
  const open = () => {
    if (stopped) return;
    joined = false;
    socket = new WebSocket(address);
    const current = socket;
    current.onopen = () => {
      lastFrame = Date.now();
      current.send(JSON.stringify({ event: 'join', data: handlers.identity() }));
    };
    current.onmessage = (event) => {
      if (stopped || current !== socket) return;
      lastFrame = Date.now();
      let packet: ServerPacket;
      try {
        packet = JSON.parse(event.data);
      } catch {
        return;
      }
      if (packet.event === 'joined') {
        joined = packet.data.ok;
        if (joined) attempt = 0;
        handlers.joined(packet.data);
        if (!joined) {
          stopped = true;
          current.close();
        }
      } else if (packet.event === 'snapshot' && joined) handlers.snapshot(packet.data);
      else if (packet.event === 'shot' && joined) handlers.shot(packet.data);
      else if (packet.event === 'error') handlers.error(packet.data);
    };
    current.onerror = () => handlers.error('Cannot reach the arena. Reconnecting…');
    current.onclose = (event) => {
      if (stopped || current !== socket) return;
      joined = false;
      if (event.code === 4001) {
        stopped = true;
        handlers.replaced();
        return;
      }
      handlers.disconnected();
      retry = setTimeout(open, Math.min(8_000, 250 * 2 ** attempt++) * (0.8 + Math.random() * 0.4));
    };
  };
  open();
  watchdog = setInterval(() => {
    if (socket?.readyState === WebSocket.OPEN && Date.now() - lastFrame > 10_000)
      socket.close(1012, 'Reconnect');
  }, 2_000);
  return {
    sendInput: (input) => {
      if (joined && socket?.readyState === WebSocket.OPEN && socket.bufferedAmount < 64_000) {
        socket.send(JSON.stringify({ event: 'input', data: input }));
      }
    },
    disconnect: () => {
      stopped = true;
      joined = false;
      if (retry) clearTimeout(retry);
      if (watchdog) clearInterval(watchdog);
      socket?.close();
    },
  };
}
