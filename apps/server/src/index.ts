import { createServer } from 'node:http';
import { randomBytes } from 'node:crypto';
import { Server } from 'socket.io';
import { MAX_PLAYERS, TICK_RATE } from '../../../packages/shared/src/constants.ts';
import type {
  ClientEvents,
  ServerEvents,
  JoinRequest,
  JoinReply,
} from '../../../packages/shared/src/protocol.ts';
import { rooms, publicRoom, snapshot, idleInput, type Room, type Member } from './rooms.ts';
import { cleanName, validateInput } from './validation.ts';
import { newPlayer } from './players.ts';
import { simulate } from './simulation.ts';
import { isPetId } from '../../../packages/shared/src/pets.ts';
import { Commentator } from './commentator.ts';

const origins = (process.env.CORS_ORIGIN || 'http://localhost:3000,http://127.0.0.1:3000')
  .split(',')
  .map((s) => s.trim());
const allowed = (origin: string | undefined) => !origin || origins.includes(origin);
const http = createServer((req, res) => {
  const origin = req.headers.origin;
  if (origin && allowed(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
  }
  res.setHeader('Content-Type', 'application/json');
  if (req.url === '/health') {
    res.end(
      JSON.stringify({
        ok: true,
        service: 'ghost-arena',
        rooms: rooms.size,
        players: [...rooms.values()].reduce(
          (n, r) => n + [...r.members.values()].filter((m) => m.socketId).length,
          0,
        ),
        uptime: Math.floor(process.uptime()),
        commentary: commentator.status,
      }),
    );
    return;
  }
  res.writeHead(404);
  res.end(JSON.stringify({ error: 'Not found' }));
});
const io = new Server<ClientEvents, ServerEvents>(http, {
  cors: { origin: (origin, cb) => cb(null, allowed(origin)), methods: ['GET', 'POST'] },
  allowRequest: (req, cb) => cb(null, allowed(req.headers.origin)),
  maxHttpBufferSize: 16384,
  pingTimeout: 25000,
  pingInterval: 10000,
});
const liveRoom = publicRoom(Date.now());
const commentator = new Commentator({
  emitAudio: (payload) => io.to(liveRoom.code).emit('commentaryAudio', payload),
  emitText: (payload) => io.to(liveRoom.code).emit('commentaryText', payload),
  env: process.env,
});
const sessions = new Map<string, { room: Room; member: Member }>();
const joins = new Map<string, { start: number; count: number }>();
io.on('connection', (socket) => {
  socket.on('join', (raw: JoinRequest, reply: (r: JoinReply) => void) => {
    if (typeof reply !== 'function') return;
    if (sessions.has(socket.id)) {
      reply({ ok: false, error: 'Already joined.' });
      return;
    }
    const ip = socket.handshake.address,
      now = Date.now();
    let rate = joins.get(ip);
    if (!rate || now - rate.start > 60000) {
      rate = { start: now, count: 0 };
      joins.set(ip, rate);
    }
    if (++rate.count > 120) {
      reply({ ok: false, error: 'Too many join attempts. Try again shortly.' });
      return;
    }
    if (!raw || typeof raw !== 'object') {
      reply({ ok: false, error: 'Invalid join request.' });
      return;
    }
    const name = cleanName(raw.name);
    if (!name) {
      reply({ ok: false, error: 'Enter a player name.' });
      return;
    }
    const room = publicRoom(now);
    let member =
      typeof raw.token === 'string'
        ? [...room.members.values()].find((m) => m.token === raw.token)
        : undefined;
    if (member?.socketId) {
      io.sockets.sockets.get(member.socketId)?.disconnect(true);
    }
    if (!member) {
      if (room.members.size >= MAX_PLAYERS) {
        reply({ ok: false, error: 'This room is full.' });
        return;
      }
      const id = crypto.randomUUID();
      member = {
        player: newPlayer(id, name, room.members.size, now),
        token: randomBytes(24).toString('hex'),
        socketId: socket.id,
        disconnectedAt: 0,
        input: idleInput(),
        lastInputAt: now,
        lastShot: 0,
        lastReceivedSeq: -1,
        rateStart: now,
        rateCount: 0,
      };
      room.members.set(id, member);
    } else {
      member.socketId = socket.id;
      member.input = idleInput();
      member.lastInputAt = now;
    }
    if (isPetId(raw.pet)) member.player.pet = raw.pet;
    sessions.set(socket.id, { room, member });
    socket.join(room.code);
    reply({ ok: true, id: member.player.id, token: member.token, snapshot: snapshot(room, now) });
  });
  socket.on('input', (raw) => {
    const session = sessions.get(socket.id);
    if (!session) return;
    const m = session.member,
      now = Date.now();
    if (now - m.rateStart >= 1000) {
      m.rateStart = now;
      m.rateCount = 0;
    }
    if (++m.rateCount > 90) return;
    const input = validateInput(raw);
    if (!input || input.seq <= m.lastReceivedSeq) return;
    m.lastReceivedSeq = input.seq;
    m.lastInputAt = now;
    m.input = {
      ...input,
      jump: input.jump || m.input.jump,
      dive: input.dive || m.input.dive,
      stumble: input.stumble || m.input.stumble,
    };
  });
  socket.on('disconnect', () => {
    const s = sessions.get(socket.id);
    if (s) {
      s.member.socketId = null;
      s.member.disconnectedAt = Date.now();
      s.member.input = idleInput();
      sessions.delete(socket.id);
    }
  });
});
publicRoom(Date.now());
const tick = setInterval(() => {
  const now = Date.now();
  for (const [code, room] of rooms) {
    if (
      code !== 'LIVE' &&
      ![...room.members.values()].some((m) => m.socketId) &&
      now - room.createdAt > 60000
    ) {
      rooms.delete(code);
      continue;
    }
    const shots = simulate(room, now);
    for (const shot of shots) io.to(code).emit('shot', shot);
    if (code === liveRoom.code) {
      const players = [...room.members.values()]
        .filter((m) => m.socketId)
        .map((m) => m.player);
      try {
        commentator.tick(players, shots, now);
      } catch (error) {
        console.error('Commentary tick failed:', error);
      }
    }
    io.to(code).emit('snapshot', snapshot(room, now));
  }
  for (const [ip, rate] of joins) if (now - rate.start > 60000) joins.delete(ip);
}, 1000 / TICK_RATE);
const port = Number(process.env.PORT || 3001);
http.listen(port, '0.0.0.0', () =>
  console.log(`GHOST ARENA authoritative server listening on :${port}`),
);
function shutdown() {
  clearInterval(tick);
  commentator.stop();
  io.close();
  http.close(() => process.exit(0));
}
process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);
