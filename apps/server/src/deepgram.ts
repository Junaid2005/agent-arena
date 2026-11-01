import { WebSocket } from 'ws';
import { COMMENTARY_SAMPLE_RATE } from '../../../packages/shared/src/constants.ts';

export const DEEPGRAM_AGENT_URL = 'wss://agent.deepgram.com/v1/agent/converse';

export type CasterLog = (message: string) => void;

/** The tiny part of a WebSocket this client needs. Fake sockets in tests implement the same shape. */
export type CasterSocket = {
  send(data: string | Uint8Array): void;
  close(): void;
  on(event: string, listener: (...args: unknown[]) => void): void;
};

export type DeepgramCasterOptions = {
  apiKey: string;
  model: string;
  voice: string;
  speed: number;
  temperature: number;
  prompt: string;
  onAudio: (pcm: Buffer) => void;
  onText: (text: string) => void;
  onAudioDone: () => void;
  onStateChange: (ready: boolean) => void;
  createSocket?: (url: string, protocols: string[]) => CasterSocket;
  log?: CasterLog;
};

const KEEP_ALIVE_MS = 8_000;
const MAX_CHUNK = 8_000;
const BASE_BACKOFF_MS = 2_000;
const MAX_BACKOFF_MS = 60_000;

export class DeepgramCaster {
  private options: DeepgramCasterOptions;
  private socket: CasterSocket | null = null;
  private keepAliveTimer: ReturnType<typeof setInterval> | null = null;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private started = false;
  private stopped = true;
  private isReady = false;
  private opened = false;
  private backoff = BASE_BACKOFF_MS;
  private pending: string[] = [];
  private oddByte: Buffer | null = null;

  constructor(options: DeepgramCasterOptions) {
    this.options = options;
  }

  get ready(): boolean {
    return this.isReady;
  }

  start() {
    this.stopped = false;
    if (this.started) return;
    this.started = true;
    this.connect();
  }

  stop() {
    this.started = false;
    this.stopped = true;
    this.clearKeepAlive();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.pending = [];
    this.oddByte = null;
    const socket = this.socket;
    this.socket = null;
    this.opened = false;
    if (this.isReady) {
      this.isReady = false;
      this.options.onStateChange(false);
    }
    if (socket) {
      try {
        socket.close();
      } catch {
        // A socket that is already closed needs no further handling.
      }
    }
  }

  inject(text: string) {
    if (!text) return;
    if (this.isReady && this.opened) {
      this.sendInjection(text);
      return;
    }
    this.pending.push(text);
    this.pending = this.pending.slice(-8);
  }

  private connect() {
    if (this.stopped) return;
    let socket: CasterSocket;
    try {
      socket =
        this.options.createSocket?.(DEEPGRAM_AGENT_URL, ['token', this.options.apiKey]) ??
        (new WebSocket(DEEPGRAM_AGENT_URL, ['token', this.options.apiKey]) as unknown as CasterSocket);
    } catch (error) {
      this.log(`Deepgram could not open a socket: ${errorText(error)}`);
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;
    socket.on('open', () => {
      if (this.socket !== socket) return;
      this.opened = true;
      this.startKeepAlive();
    });
    socket.on('message', (...args: unknown[]) => {
      if (this.socket !== socket) return;
      // `ws` delivers text frames as Buffers too; only its isBinary flag tells them apart.
      const [data, isBinary] = args;
      if (isBinary === false) this.handleJson(String(data));
      else this.handleData(data);
    });
    socket.on('close', () => this.handleClose(socket));
    socket.on('error', (error: unknown) => {
      if (this.socket !== socket) return;
      this.log(`Deepgram socket error: ${errorText(error)}`);
      try {
        socket.close();
      } catch {
        // Closing an already broken socket is safe to ignore.
      }
    });
  }

  private handleData(data: unknown) {
    if (typeof data === 'string') {
      this.handleJson(data);
      return;
    }
    if (data instanceof ArrayBuffer) {
      this.handleBinary(Buffer.from(data));
      return;
    }
    if (Array.isArray(data)) {
      for (const part of data) this.handleData(part);
      return;
    }
    if (ArrayBuffer.isView(data)) {
      this.handleBinary(Buffer.from(data.buffer, data.byteOffset, data.byteLength));
    }
  }

  private handleJson(raw: string) {
    let message: Record<string, unknown>;
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!parsed || typeof parsed !== 'object') return;
      message = parsed as Record<string, unknown>;
    } catch {
      return;
    }
    const type = typeof message.type === 'string' ? message.type : '';
    if (type === 'Welcome') {
      this.sendSettings();
      return;
    }
    if (type === 'SettingsApplied') {
      this.isReady = true;
      this.backoff = BASE_BACKOFF_MS;
      this.options.onStateChange(true);
      const queued = this.pending;
      this.pending = [];
      for (const text of queued) this.sendInjection(text);
      return;
    }
    if (type === 'ConversationText') {
      if (message.role === 'assistant' && typeof message.content === 'string') {
        this.options.onText(message.content);
      }
      return;
    }
    if (type === 'AgentAudioDone') {
      this.options.onAudioDone();
      return;
    }
    if (type === 'Warning') {
      this.log(`Deepgram warning ${String(message.code ?? '')}: ${String(message.description ?? '')}`);
      return;
    }
    if (type === 'Error') {
      this.log(`Deepgram error ${String(message.code ?? '')}: ${String(message.description ?? '')}`);
      try {
        this.socket?.close();
      } catch {
        // Nothing else to do after a protocol error.
      }
    }
  }

  private sendSettings() {
    this.sendJson({
      type: 'Settings',
      audio: {
        input: { encoding: 'linear16', sample_rate: COMMENTARY_SAMPLE_RATE },
        output: {
          encoding: 'linear16',
          sample_rate: COMMENTARY_SAMPLE_RATE,
          container: 'none',
        },
      },
      agent: {
        think: {
          provider: {
            type: 'open_ai',
            model: this.options.model,
            temperature: this.options.temperature,
          },
          prompt: this.options.prompt,
        },
        speak: {
          provider: { type: 'deepgram', model: this.options.voice, speed: this.options.speed },
        },
      },
    });
  }

  private sendInjection(text: string) {
    this.sendJson({ type: 'InjectUserMessage', content: text });
  }

  private sendJson(value: unknown) {
    if (!this.socket || !this.opened) return;
    try {
      this.socket.send(JSON.stringify(value));
    } catch (error) {
      this.log(`Deepgram send failed: ${errorText(error)}`);
    }
  }

  private handleBinary(frame: Buffer) {
    if (!frame.length) return;
    let buffer = frame;
    if (this.oddByte) {
      buffer = Buffer.concat([this.oddByte, buffer]);
      this.oddByte = null;
    }
    if (buffer.length % 2 === 1) {
      this.oddByte = Buffer.from(buffer.subarray(buffer.length - 1));
      buffer = buffer.subarray(0, buffer.length - 1);
    }
    for (let offset = 0; offset < buffer.length; offset += MAX_CHUNK) {
      const chunk = Buffer.from(buffer.subarray(offset, Math.min(offset + MAX_CHUNK, buffer.length)));
      this.options.onAudio(chunk);
    }
  }

  private startKeepAlive() {
    this.clearKeepAlive();
    this.keepAliveTimer = setInterval(() => this.sendJson({ type: 'KeepAlive' }), KEEP_ALIVE_MS);
    unrefTimer(this.keepAliveTimer);
  }

  private clearKeepAlive() {
    if (!this.keepAliveTimer) return;
    clearInterval(this.keepAliveTimer);
    this.keepAliveTimer = null;
  }

  private handleClose(socket: CasterSocket) {
    if (this.socket !== socket) return;
    this.socket = null;
    this.opened = false;
    this.clearKeepAlive();
    if (this.isReady) {
      this.isReady = false;
      this.options.onStateChange(false);
    }
    if (this.stopped) return;
    this.scheduleReconnect();
  }

  private scheduleReconnect() {
    if (this.stopped || this.reconnectTimer) return;
    const delay = Math.min(this.backoff, MAX_BACKOFF_MS);
    this.backoff = Math.min(this.backoff * 2, MAX_BACKOFF_MS);
    this.log(`Deepgram reconnecting in ${Math.round(delay / 1000)}s.`);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, delay);
    unrefTimer(this.reconnectTimer);
  }

  private log(message: string) {
    (this.options.log ?? console.log)(message);
  }
}

function unrefTimer(timer: { unref?: () => void } | number) {
  if (typeof timer === 'object' && typeof timer.unref === 'function') timer.unref();
}

function errorText(error: unknown): string {
  return error instanceof Error ? error.message : 'unknown failure';
}
