import type { Player, Shot } from '../../../packages/shared/src/types.ts';
import {
  CASTER_PROMPT,
  CommentaryDirector,
  EventDetector,
  situation,
  speakableName,
  type CommentaryEvent,
} from './commentary.ts';
import { DeepgramCaster, type DeepgramCasterOptions } from './deepgram.ts';

export type CasterLike = {
  readonly ready: boolean;
  start(): void;
  stop(): void;
  inject(text: string): void;
};

export type CommentatorOptions = {
  emitAudio: (payload: { turn: number; pcm: ArrayBuffer | Uint8Array }) => void;
  emitText: (payload: { turn: number; text: string }) => void;
  env: Record<string, string | undefined>;
  createCaster?: (options: DeepgramCasterOptions) => CasterLike;
};

type CommentatorConfig = {
  apiKey: string;
  model: string;
  voice: string;
  speed: number;
  temperature: number;
  idleMs: number;
  sessionMs: number;
};

export class Commentator {
  private options: CommentatorOptions;
  private config: CommentatorConfig;
  private enabled: boolean;
  private caster: CasterLike | null = null;
  private director = new CommentaryDirector();
  private detector = new EventDetector();
  private positions = new Map<string, { x: number; y: number; z: number }>();
  private lastActiveAt = 0;
  private sessionStartedAt = 0;
  private openingDone = false;
  private closed = false;

  constructor(options: CommentatorOptions) {
    this.options = options;
    const env = options.env;
    const key = (env.DEEPGRAM_API_KEY ?? '').trim();
    const enabled = (env.COMMENTARY_ENABLED ?? 'true') !== 'false';
    this.enabled = Boolean(key) && enabled;
    this.config = {
      apiKey: key,
      model: env.COMMENTARY_THINK_MODEL || 'gpt-4.1-mini',
      voice: env.COMMENTARY_VOICE || 'aura-2-atlas-en',
      speed: numberEnv(env.COMMENTARY_SPEED, 1.1),
      temperature: numberEnv(env.COMMENTARY_TEMPERATURE, 1),
      idleMs: numberEnv(env.COMMENTARY_IDLE_MS, 45_000),
      sessionMs: numberEnv(env.COMMENTARY_SESSION_MS, 1_200_000),
    };
    if (!this.enabled) {
      console.log(
        'Live commentary is disabled; set DEEPGRAM_API_KEY in the server environment to enable it.',
      );
    }
  }

  get status(): { enabled: boolean; live: boolean } {
    return { enabled: this.enabled, live: this.caster?.ready ?? false };
  }

  tick(players: Player[], shots: Shot[], now: number) {
    if (!this.enabled || this.closed) return;
    this.director.setPlayerCount(players.length, now);
    if (!players.length) {
      if (this.caster) this.closeSession();
      this.positions.clear();
      this.lastActiveAt = 0;
      return;
    }
    if (this.hasActivity(players, shots)) this.lastActiveAt = now;
    if (now - this.lastActiveAt > this.config.idleMs) {
      if (this.caster) this.closeSession();
      return;
    }
    if (!this.caster) {
      this.startSession(now, players.length);
    } else if (
      now - this.sessionStartedAt >= this.config.sessionMs &&
      !this.director.busy(now)
    ) {
      this.caster.stop();
      this.caster = null;
      this.director.reset();
      this.detector = new EventDetector();
      this.startSession(now, players.length);
    }
    const caster = this.caster;
    if (!caster) return;

    if (caster.ready && !this.openingDone) {
      this.openingDone = true;
      this.director.add([openingEvent(players, now)], now);
      this.director.setPlayerCount(players.length, now);
    }
    const events = this.detector.observe(players, shots, now);
    this.director.add(events, now);
    if (this.director.needsLull(now)) {
      this.director.add([situation(players, now)], now);
    }
    if (!caster.ready) return;
    const line = this.director.next(now);
    if (line) caster.inject(line);
  }

  stop() {
    this.closed = true;
    this.caster?.stop();
    this.caster = null;
    this.director.reset();
    this.detector = new EventDetector();
    this.positions.clear();
    this.lastActiveAt = 0;
    this.sessionStartedAt = 0;
    this.openingDone = false;
  }

  private hasActivity(players: Player[], shots: Shot[]): boolean {
    let active = shots.length > 0;
    const live = new Set<string>();
    for (const player of players) {
      live.add(player.id);
      const previous = this.positions.get(player.id);
      // A first sighting only establishes a baseline. Opening a billed session
      // still requires a real position change or a shot.
      if (
        previous &&
        (previous.x !== player.position.x ||
          previous.y !== player.position.y ||
          previous.z !== player.position.z)
      ) {
        active = true;
      }
      this.positions.set(player.id, {
        x: player.position.x,
        y: player.position.y,
        z: player.position.z,
      });
    }
    for (const id of this.positions.keys()) if (!live.has(id)) this.positions.delete(id);
    return active;
  }

  private startSession(now: number, playerCount: number) {
    this.director.reset();
    this.detector = new EventDetector();
    this.sessionStartedAt = now;
    this.openingDone = false;
    const create =
      this.options.createCaster ?? ((options: DeepgramCasterOptions) => new DeepgramCaster(options));
    const caster = create({
      apiKey: this.config.apiKey,
      model: this.config.model,
      voice: this.config.voice,
      speed: this.config.speed,
      temperature: this.config.temperature,
      prompt: CASTER_PROMPT,
      onAudio: (pcm) => {
        const at = Date.now();
        this.director.onAudio(pcm.length, at);
        this.options.emitAudio({ turn: this.director.turn, pcm });
      },
      onText: (text) => this.options.emitText({ turn: this.director.turn, text }),
      onAudioDone: () => this.director.onAudioDone(Date.now()),
      onStateChange: (ready) => {
        if (!ready) {
          this.director.reset();
          this.openingDone = false;
        }
      },
      log: (message) => console.log(message),
    });
    this.caster = caster;
    this.director.setPlayerCount(playerCount, now);
    caster.start();
  }

  private closeSession() {
    this.caster?.stop();
    this.caster = null;
    this.director.reset();
    this.detector = new EventDetector();
    this.sessionStartedAt = 0;
    this.openingDone = false;
  }
}

function openingEvent(players: Player[], now: number): CommentaryEvent {
  const names = players.map((player) => speakableName(player.name));
  const list =
    names.length <= 1
      ? (names[0] ?? 'nobody')
      : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`;
  return {
    kind: 'opening',
    priority: 3,
    at: now,
    text: `We are live at GHOST ARENA with ${list}.`,
  };
}

function numberEnv(raw: string | undefined, fallback: number): number {
  if (raw === undefined || raw.trim() === '') return fallback;
  const value = Number(raw);
  return Number.isFinite(value) ? value : fallback;
}
