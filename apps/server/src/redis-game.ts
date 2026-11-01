import { randomBytes, randomUUID } from 'node:crypto';
import { Redis } from 'ioredis';
import { DT, MAX_PLAYERS, MAP_VERSION } from '../../../packages/shared/src/constants.ts';
import type { JoinReply, JoinRequest } from '../../../packages/shared/src/protocol.ts';
import type { Input, Snapshot } from '../../../packages/shared/src/types.ts';
import type { ServerPacket } from '../../../packages/shared/src/websocket.ts';
import { idleInput, snapshot, type Member, type Room } from './rooms.ts';
import { newPlayer } from './players.ts';
import { simulate } from './simulation.ts';
import { cleanName, validateInput } from './validation.ts';
import { Commentator, type CommentatorOptions } from './commentator.ts';
import { isPetId } from '../../../packages/shared/src/pets.ts';

// Renew ownership, save the complete authoritative state and broadcast one frame atomically.
// An expired owner can never overwrite a newer owner, even after a long GC/network pause.
const COMMIT = `
if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end
redis.call('PEXPIRE', KEYS[1], ARGV[2])
redis.call('SET', KEYS[2], ARGV[3], 'EX', 43200)
redis.call('PUBLISH', KEYS[3], ARGV[4])
return 1`;
const RELEASE = `if redis.call('GET', KEYS[1]) == ARGV[1] then return redis.call('DEL', KEYS[1]) end return 0`;
const LEASE_MS = 2_000;

export interface GamePeer {
  send(packet: ServerPacket): void;
  close(code: number, reason: string): void;
}
type LocalPeer = { peer: GamePeer; playerId?: string; rateStart: number; count: number };
type Command =
  | {
      type: 'join';
      requestId: string;
      connection: string;
      name: string;
      token: string;
      pet?: string;
    }
  | { type: 'input'; connection: string; input: Input }
  | { type: 'disconnect'; connection: string };
type Frame = {
  type: 'frame';
  snapshot: Snapshot;
  shots: ReturnType<typeof simulate>;
  replies: { requestId: string; connection: string; reply: JoinReply }[];
  kicks: string[];
  reconnects: string[];
};
type CommentaryPacket = Extract<ServerPacket, { event: 'commentaryAudio' | 'commentaryText' }>;
type BusMessage =
  | Frame
  | { type: 'commands'; commands: Command[] }
  | { type: 'commentary'; packet: CommentaryPacket };
const BROADCAST = `if redis.call('GET', KEYS[1]) ~= ARGV[1] then return 0 end return redis.call('PUBLISH', KEYS[2], ARGV[2])`;
type SavedRoom = Omit<Room, 'members'> & { members: [string, Member][] };

function freshRoom(): Room {
  return {
    code: 'LIVE',
    members: new Map(),
    endsAt: 0,
    round: 1,
    feed: [],
    finishedAt: 0,
    createdAt: Date.now(),
    projectiles: [],
  };
}
export function redisUrl() {
  const url = process.env.REDIS_URL || process.env.KV_URL;
  if (!url || !/^rediss?:\/\//.test(url)) throw new Error('Managed Redis is not configured.');
  return url;
}
export function statePrefix() {
  const env = process.env.VERCEL_ENV || 'development';
  const branch = env === 'preview' ? `:${process.env.VERCEL_GIT_COMMIT_REF || 'preview'}` : '';
  const prefix = process.env.GHOST_STATE_PREFIX || `ghost-arena:v2:${env}${branch}`;
  // Old arena positions and in-flight rockets cannot be restored into new geometry.
  return `${prefix}:${MAP_VERSION}`;
}
function client(url: string) {
  return new Redis(url, {
    lazyConnect: true,
    maxRetriesPerRequest: 1,
    connectTimeout: 5_000,
    retryStrategy: (attempt) => (attempt > 3 ? null : Math.min(200 * attempt, 1_000)),
    enableOfflineQueue: false,
  });
}

export class RedisGame {
  readonly owner = randomUUID();
  private redis: Redis;
  private subscriber: Redis;
  private leaseKey: string;
  private stateKey: string;
  private channel: string;
  private room = freshRoom();
  private peers = new Map<string, LocalPeer>();
  private controlQueue: Command[] = [];
  private inputQueue = new Map<string, Command>();
  private outgoing: Command[] = [];
  private outgoingInputs = new Map<string, Command>();
  private requests = new Map<
    string,
    { resolve: (r: JoinReply) => void; reject: (e: Error) => void }
  >();
  private timer?: ReturnType<typeof setInterval>;
  private idleTimer?: ReturnType<typeof setTimeout>;
  private busy = false;
  private stopped = false;
  private leader = false;
  private nextElection = 0;
  private ready: Promise<void>;
  private commentator?: Commentator;
  private createCommentator: (options: CommentatorOptions) => Commentator;

  constructor(
    url = redisUrl(),
    prefix = statePrefix(),
    createCommentator = (options: CommentatorOptions) => new Commentator(options),
  ) {
    this.createCommentator = createCommentator;
    this.redis = client(url);
    this.subscriber = client(url);
    this.leaseKey = `${prefix}:owner`;
    this.stateKey = `${prefix}:state`;
    this.channel = `${prefix}:bus`;
    this.redis.on('error', () => {});
    this.subscriber.on('error', () => {});
    this.ready = this.start();
    // A route may construct the coordinator before registering its first handler.
    void this.ready.catch(() => {});
  }
  get isLeader() {
    return this.leader;
  }
  get closed() {
    return this.stopped;
  }

  private async start() {
    await Promise.all([this.redis.connect(), this.subscriber.connect()]);
    this.subscriber.on('message', (_channel, raw) => {
      try {
        this.receive(JSON.parse(raw) as BusMessage);
      } catch {
        /* Ignore malformed internal data. */
      }
    });
    await this.subscriber.subscribe(this.channel);
    if (this.stopped) return;
    this.timer = setInterval(() => {
      void this.tick().catch(() => this.fail());
    }, DT * 1000);
  }
  attach(connection: string, peer: GamePeer) {
    if (this.stopped) throw new Error('Arena instance is restarting.');
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.peers.set(connection, { peer, rateStart: Date.now(), count: 0 });
  }
  async join(connection: string, raw: JoinRequest): Promise<void> {
    await this.ready;
    const local = this.peers.get(connection);
    if (!local) return;
    const name = cleanName(raw?.name);
    if (!name) {
      local.peer.send({ event: 'joined', data: { ok: false, error: 'Enter a player name.' } });
      return;
    }
    if (local.playerId) return;
    const token =
      typeof raw.token === 'string' && /^[a-f0-9]{48}$/.test(raw.token)
        ? raw.token
        : randomBytes(24).toString('hex');
    const requestId = randomUUID();
    const command: Command = {
      type: 'join',
      requestId,
      connection,
      name,
      token,
      pet: isPetId(raw.pet) ? raw.pet : undefined,
    };
    const reply = await new Promise<JoinReply>((resolve, reject) => {
      this.requests.set(requestId, { resolve, reject });
      const retry = setInterval(() => {
        this.outgoing.push(command);
      }, 400);
      const timeout = setTimeout(() => {
        clearInterval(retry);
        this.requests.delete(requestId);
        reject(new Error('Arena join timed out.'));
      }, 12_000);
      this.requests.set(requestId, {
        resolve: (result) => {
          clearInterval(retry);
          clearTimeout(timeout);
          this.requests.delete(requestId);
          resolve(result);
        },
        reject: (error) => {
          clearInterval(retry);
          clearTimeout(timeout);
          this.requests.delete(requestId);
          reject(error);
        },
      });
      this.outgoing.push(command);
    });
    const current = this.peers.get(connection);
    if (!current) return;
    if (reply.ok) current.playerId = reply.id;
    current.peer.send({ event: 'joined', data: reply });
  }
  input(connection: string, raw: unknown) {
    const local = this.peers.get(connection);
    if (!local?.playerId) return;
    const now = Date.now();
    if (now - local.rateStart >= 1_000) {
      local.rateStart = now;
      local.count = 0;
    }
    if (++local.count > 90) return;
    const input = validateInput(raw);
    if (!input) return;
    const previous = this.outgoingInputs.get(connection);
    if (previous?.type === 'input' && previous.input.seq >= input.seq) return;
    // Preserve one-shot buttons if several commands arrive in a single network frame.
    this.outgoingInputs.set(connection, {
      type: 'input',
      connection,
      input: {
        ...input,
        jump: input.jump || (previous?.type === 'input' && previous.input.jump) || false,
        dive: input.dive || (previous?.type === 'input' && previous.input.dive) || false,
        stumble: input.stumble || (previous?.type === 'input' && previous.input.stumble) || false,
      },
    });
  }
  detach(connection: string) {
    this.peers.delete(connection);
    this.outgoingInputs.delete(connection);
    if (!this.stopped) this.outgoing.push({ type: 'disconnect', connection });
    if (this.peers.size === 0 && !this.idleTimer) {
      // Flush the disconnect and relinquish ownership before this invocation becomes idle.
      this.idleTimer = setTimeout(() => {
        void this.close();
      }, 800);
    }
  }
  private receive(message: BusMessage) {
    if (message.type === 'commentary') {
      for (const local of this.peers.values()) if (local.playerId) local.peer.send(message.packet);
      return;
    }
    if (message.type === 'commands') {
      if (!this.leader) return;
      for (const command of message.commands) {
        if (command.type === 'input') {
          const old = this.inputQueue.get(command.connection);
          if (old?.type === 'input' && old.input.seq >= command.input.seq) continue;
          this.inputQueue.set(command.connection, {
            ...command,
            input: {
              ...command.input,
              jump: command.input.jump || (old?.type === 'input' && old.input.jump) || false,
              dive: command.input.dive || (old?.type === 'input' && old.input.dive) || false,
              stumble:
                command.input.stumble || (old?.type === 'input' && old.input.stumble) || false,
            },
          });
        } else if (this.controlQueue.length < 500) this.controlQueue.push(command);
      }
      return;
    }
    for (const connection of message.reconnects || [])
      this.peers.get(connection)?.peer.close(1012, 'Refresh arena session.');
    for (const kick of message.kicks)
      this.peers.get(kick)?.peer.close(4001, 'Opened in another tab.');
    for (const { requestId, reply } of message.replies)
      this.requests.get(requestId)?.resolve(reply);
    for (const local of this.peers.values()) {
      if (!local.playerId) continue;
      local.peer.send({ event: 'snapshot', data: message.snapshot });
      for (const shot of message.shots) local.peer.send({ event: 'shot', data: shot });
    }
  }
  private async tick() {
    if (this.busy || this.stopped) return;
    this.busy = true;
    try {
      const now = Date.now();
      if (!this.leader && this.peers.size > 0 && now >= this.nextElection) {
        this.nextElection = now + 400;
        const won = await this.redis.set(this.leaseKey, this.owner, 'PX', LEASE_MS, 'NX');
        if (won) {
          const saved = await this.redis.get(this.stateKey);
          if (saved) {
            const parsed = JSON.parse(saved) as SavedRoom;
            this.room = {
              ...parsed,
              projectiles: parsed.projectiles || [],
              members: new Map(parsed.members),
            };
            for (const member of this.room.members.values()) {
              if (!member.player.weapon) member.player.weapon = 'pistol';
            }
          }
          this.leader = true;
        }
      }
      const outgoing = [...this.outgoing.splice(0), ...this.outgoingInputs.values()];
      this.outgoingInputs.clear();
      if (outgoing.length)
        await this.redis.publish(
          this.channel,
          JSON.stringify({ type: 'commands', commands: outgoing }),
        );
      if (!this.leader) return;
      const replies: Frame['replies'] = [],
        kicks: string[] = [],
        reconnects: string[] = [];
      for (const [id, member] of this.room.members) {
        if (member.socketId && now - member.lastInputAt > 10_000) {
          member.socketId = null;
          member.disconnectedAt = member.lastInputAt + 10_000;
          member.input = idleInput();
        }
        if (!member.socketId && now - member.disconnectedAt > 30_000) this.room.members.delete(id);
      }
      for (const command of [...this.controlQueue.splice(0), ...this.inputQueue.values()]) {
        if (command.type === 'join') {
          let member = [...this.room.members.values()].find((m) => m.token === command.token);
          if (!member && this.room.members.size >= MAX_PLAYERS) {
            replies.push({
              requestId: command.requestId,
              connection: command.connection,
              reply: { ok: false, error: 'The arena is full. Try again shortly.' },
            });
            continue;
          }
          if (!member) {
            const player = newPlayer(randomUUID(), command.name, this.room.members.size, now);
            member = {
              player,
              token: command.token,
              socketId: command.connection,
              disconnectedAt: 0,
              input: idleInput(),
              lastInputAt: now,
              lastShot: 0,
              lastReceivedSeq: -1,
              rateStart: now,
              rateCount: 0,
            };
            this.room.members.set(player.id, member);
          } else if (member.socketId && member.socketId !== command.connection)
            kicks.push(member.socketId);
          member.socketId = command.connection;
          member.disconnectedAt = 0;
          member.lastInputAt = now;
          member.input = idleInput();
          if (isPetId(command.pet)) member.player.pet = command.pet;
          replies.push({
            requestId: command.requestId,
            connection: command.connection,
            reply: {
              ok: true,
              id: member.player.id,
              token: member.token,
              snapshot: snapshot(this.room, now),
            },
          });
        } else {
          const member = [...this.room.members.values()].find(
            (m) => m.socketId === command.connection,
          );
          if (!member) {
            if (command.type === 'input') reconnects.push(command.connection);
            continue;
          }
          if (command.type === 'disconnect') {
            member.socketId = null;
            member.disconnectedAt = now;
            member.input = idleInput();
          } else {
            const input = validateInput(command.input);
            if (!input || input.seq <= member.lastReceivedSeq) continue;
            if (now - member.rateStart >= 1000) {
              member.rateStart = now;
              member.rateCount = 0;
            }
            if (++member.rateCount > 90) continue;
            member.lastReceivedSeq = input.seq;
            member.lastInputAt = now;
            member.input = {
              ...input,
              jump: input.jump || member.input.jump,
              dive: input.dive || member.input.dive,
              stumble: input.stumble || member.input.stumble,
            };
          }
        }
      }
      this.inputQueue.clear();
      const shots = simulate(this.room, now);
      const frame: Frame = {
        type: 'frame',
        snapshot: snapshot(this.room, now),
        shots,
        replies,
        kicks,
        reconnects,
      };
      // Join replies use the same committed frame as movement and health updates.
      for (const reply of replies) if (reply.reply.ok) reply.reply.snapshot = frame.snapshot;
      const saved: SavedRoom = { ...this.room, members: [...this.room.members] };
      const committed = await this.redis.eval(
        COMMIT,
        3,
        this.leaseKey,
        this.stateKey,
        this.channel,
        this.owner,
        LEASE_MS,
        JSON.stringify(saved),
        JSON.stringify(frame),
      );
      if (committed !== 1) {
        this.stopCommentary();
        this.leader = false;
        this.controlQueue = [];
        this.inputQueue.clear();
      } else {
        if (!this.commentator) {
          this.commentator = this.createCommentator({
            env: process.env,
            emitAudio: ({ turn, pcm }) =>
              this.broadcastCommentary({
                event: 'commentaryAudio',
                data: {
                  turn,
                  pcm: Buffer.from(pcm instanceof Uint8Array ? pcm : new Uint8Array(pcm)).toString(
                    'base64',
                  ),
                },
              }),
            emitText: (data) => this.broadcastCommentary({ event: 'commentaryText', data }),
          });
          console.log(
            'Arena commentary:',
            this.commentator.status.enabled
              ? 'enabled'
              : 'disabled (missing key or disabled setting)',
          );
        }
        try {
          this.commentator.tick(
            [...this.room.members.values()].filter((m) => m.socketId).map((m) => m.player),
            shots,
            now,
          );
        } catch {
          console.error('Arena commentary tick failed.');
        }
      }
    } finally {
      this.busy = false;
    }
  }
  private broadcastCommentary(packet: CommentaryPacket) {
    if (!this.leader || this.stopped) return;
    void this.redis
      .eval(
        BROADCAST,
        2,
        this.leaseKey,
        this.channel,
        this.owner,
        JSON.stringify({ type: 'commentary', packet }),
      )
      .catch(() => console.error('Arena commentary delivery failed.'));
  }
  private stopCommentary() {
    this.commentator?.stop();
    this.commentator = undefined;
  }
  private fail() {
    if (this.stopped) return;
    for (const local of this.peers.values()) local.peer.close(1013, 'Arena reconnecting.');
    void this.close();
  }
  async closeIfIdle() {
    if (this.peers.size === 0) await this.close();
  }
  async close() {
    if (this.stopped) return;
    this.stopped = true;
    this.stopCommentary();
    if (this.timer) clearInterval(this.timer);
    if (this.idleTimer) clearTimeout(this.idleTimer);
    for (const request of this.requests.values())
      request.reject(new Error('Arena instance restarted.'));
    // Drain an in-flight commit before a final, fenced disconnect checkpoint.
    const deadline = Date.now() + 1000;
    while (this.busy && Date.now() < deadline)
      await new Promise((resolve) => setTimeout(resolve, 10));
    const connections = [
      ...new Set([
        ...this.peers.keys(),
        ...this.outgoing
          .filter((command) => command.type === 'disconnect')
          .map((command) => command.connection),
      ]),
    ];
    if (this.leader && this.redis.status === 'ready') {
      for (const member of this.room.members.values()) {
        if (member.socketId && connections.includes(member.socketId)) {
          member.socketId = null;
          member.disconnectedAt = Date.now();
          member.input = idleInput();
        }
      }
      const saved: SavedRoom = { ...this.room, members: [...this.room.members] };
      const frame: Frame = {
        type: 'frame',
        snapshot: snapshot(this.room, Date.now()),
        shots: [],
        replies: [],
        kicks: [],
        reconnects: [],
      };
      try {
        await this.redis.eval(
          COMMIT,
          3,
          this.leaseKey,
          this.stateKey,
          this.channel,
          this.owner,
          LEASE_MS,
          JSON.stringify(saved),
          JSON.stringify(frame),
        );
      } catch {
        /* Another instance can recover from the last successful checkpoint. */
      }
    } else if (connections.length && this.redis.status === 'ready') {
      try {
        await this.redis.publish(
          this.channel,
          JSON.stringify({
            type: 'commands',
            commands: connections.map((connection) => ({ type: 'disconnect', connection })),
          }),
        );
      } catch {}
    }
    for (const local of this.peers.values()) local.peer.close(1012, 'Arena restarting.');
    this.peers.clear();
    try {
      if (this.leader) await this.redis.eval(RELEASE, 1, this.leaseKey, this.owner);
    } catch {
      /* Expiry releases it. */
    }

    this.leader = false;
    this.redis.disconnect();
    this.subscriber.disconnect();
  }
}

export async function arenaHealth(url = redisUrl(), prefix = statePrefix()) {
  const redis = client(url);
  try {
    await redis.connect();
    const saved = await redis.get(`${prefix}:state`);
    const room = saved ? (JSON.parse(saved) as SavedRoom) : null;
    return {
      ok: true,
      service: 'agent-arena',
      hosting: 'vercel',
      rooms: 1,
      players:
        room?.members.filter(([, m]) => m.socketId && Date.now() - m.lastInputAt < 10_000).length ||
        0,
    };
  } finally {
    redis.disconnect();
  }
}
