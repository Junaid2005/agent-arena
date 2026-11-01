import { create } from 'zustand';
import { getAudioContext, playSound, setAudioMuted, spatialMix, unlockAudio } from './audio';
export { unlockAudio } from './audio';
import { connectArena, type ArenaConnection } from './arena-connection';
import type { Input, Player, Shot, Snapshot } from '../../../packages/shared/src/types';
import { movePlayer } from '../../../packages/shared/src/movement';
import { shoot, explode } from '../../../packages/shared/src/combat';
import { WEAPONS, isWeaponId, rollWeapon } from '../../../packages/shared/src/weapons';
import { DT, MATCH_MS } from '../../../packages/shared/src/constants';
import { isPetId, type PetId } from '../../../packages/shared/src/pets';
import { CommentaryPlayer } from './commentary';

export const controls = {
  x: 0,
  z: 0,
  yaw: 0,
  pitch: -0.08,
  jump: false,
  dive: false,
  stumble: false,
  fire: false,
};
export const runtime: {
  local: Player | null;
  pending: Input[];
  seq: number;
  clockOffset: number;
  lastShot: number;
} = { local: null, pending: [], seq: 0, clockOffset: 0, lastShot: 0 };
export const serverUrl =
  process.env.NEXT_PUBLIC_SERVER_URL ||
  (process.env.NODE_ENV === 'production' ? '' : 'http://localhost:3001');
let socket: ArenaConnection | null = null;
let connectionVersion = 0;
let timer: ReturnType<typeof setInterval> | null = null;
let identity: { name: string; room?: string; token?: string; pet: PetId } | null = null;
const clone = (p: Player): Player => ({ ...p, position: { ...p.position } });
interface State {
  screen: 'lobby' | 'game';
  status: 'idle' | 'connecting' | 'online' | 'reconnecting' | 'practice';
  error: string;
  id: string;
  room: string;
  snapshot: Snapshot | null;
  shots: Shot[];
  hitAt: number;
  hurtAt: number;
  weaponChangedAt: number;
  muted: boolean;
  casterOn: boolean;
  caption: { text: string; at: number };
  selectedPet: PetId;
  selectPet: (pet: PetId) => void;
  join: (name: string, pet: PetId) => void;
  practice: (name: string, pet?: PetId) => void;
  leave: () => void;
  toggleMute: () => void;
  toggleCaster: () => void;
}
export const useGame = create<State>((set, get) => ({
  screen: 'lobby',
  status: 'idle',
  error: '',
  id: '',
  room: '',
  snapshot: null,
  shots: [],
  hitAt: 0,
  hurtAt: 0,
  weaponChangedAt: 0,
  muted: false,
  casterOn: storedCasterPreference(),
  caption: { text: '', at: 0 },
  selectedPet: 'codex',
  selectPet: (pet) => {
    if (isPetId(pet)) set({ selectedPet: pet });
  },
  toggleMute: () => {
    const muted = !get().muted;
    setAudioMuted(muted);
    if (!muted) unlockAudio();
    set({ muted });
    applyCasterVolume();
  },
  toggleCaster: () => {
    const casterOn = !get().casterOn;
    set({ casterOn });
    try {
      localStorage.setItem('ghost:caster', casterOn ? '1' : '0');
    } catch {}
    applyCasterVolume();
  },
  join: (name, pet) => {
    const version = ++connectionVersion;
    socket?.disconnect();
    if (timer) clearInterval(timer);
    commentaryPlayer?.stopAll();
    set({ status: 'connecting', error: '', selectedPet: pet, caption: { text: '', at: 0 } });
    const saved = sessionStorage.getItem('ghost:LIVE');
    identity = { name, pet, token: saved || undefined };
    socket = connectArena(serverUrl, {
      identity: () => identity!,
      joined: (result) => {
        if (version !== connectionVersion) return;
        if (!result.ok) {
          set({ error: result.error, status: 'idle' });
          socket?.disconnect();
          return;
        }
        const joined = result.snapshot.players.find((p) => p.id === result.id);
        if (joined?.pet !== pet || !isWeaponId(joined.weapon)) {
          set({
            screen: 'lobby',
            status: 'idle',
            error: 'The arena is updating its loadouts. Please try again shortly.',
          });
          socket?.disconnect();
          return;
        }
        identity = { name, pet, room: result.snapshot.room, token: result.token };
        sessionStorage.setItem(`ghost:${identity.room}`, result.token);
        runtime.local = clone(joined);
        runtime.pending = [];
        runtime.seq = Math.max(runtime.seq, runtime.local.seq + 1);
        runtime.clockOffset = result.snapshot.time - Date.now();
        controls.yaw = runtime.local.yaw;
        controls.pitch = -0.08;
        set({
          screen: 'game',
          status: 'online',
          id: result.id,
          room: result.snapshot.room,
          snapshot: result.snapshot,
          error: '',
          weaponChangedAt: 0,
        });
        window.history.replaceState({}, '', '/');
      },
      snapshot: (snapshot) => {
        if (version !== connectionVersion) return;
        const me = snapshot.players.find((p) => p.id === get().id);
        if (me) {
          const previous = get().snapshot?.players.find((p) => p.id === me.id);
          if (previous && previous.weapon !== me.weapon) {
            set({ weaponChangedAt: performance.now() });
            playSound('swap');
          }
          if (previous && me.hp < previous.hp) {
            set({ hurtAt: performance.now() });
            playSound(me.hp === 0 ? 'out' : 'hurt');
          } else if (previous?.hp === 0 && me.hp > 0) {
            playSound('respawn');
          }
          runtime.clockOffset = snapshot.time - Date.now();
          runtime.pending = runtime.pending.filter((i) => i.seq > me.seq);
          const next = clone(me);
          // Reconcile acknowledged input; render correction is eased by the character/camera.
          for (const input of runtime.pending) movePlayer(next, input, DT, snapshot.time);
          runtime.local = next;
        }
        set({ snapshot });
      },
      shot: (shot) => {
        if (version === connectionVersion) receiveShot(shot);
      },
      commentaryAudio: ({ pcm }) => {
        if (version !== connectionVersion) return;
        const ctx = getAudioContext();
        if (!ctx || ctx.state !== 'running') return;
        const player = commentaryFor(ctx);
        player.setVolume(!get().muted && get().casterOn);
        player.enqueue(pcm);
      },
      commentaryText: ({ text }) => {
        if (version === connectionVersion) set({ caption: { text, at: Date.now() } });
      },
      error: (message) => {
        if (version === connectionVersion)
          set({ error: message, status: get().screen === 'game' ? 'reconnecting' : 'idle' });
      },
      disconnected: () => {
        if (version === connectionVersion && get().screen === 'game')
          set({ status: 'reconnecting' });
      },
      replaced: () => {
        if (version === connectionVersion) {
          get().leave();
          set({ error: 'This player was opened in another tab. Enter again to play here.' });
        }
      },
    });
    startLoop();
  },
  practice: (name, pet = get().selectedPet) => {
    ++connectionVersion;
    socket?.disconnect();
    if (timer) clearInterval(timer);
    commentaryPlayer?.stopAll();
    const now = Date.now();
    const p: Player = {
      id: 'practice',
      name: name || 'Rookie',
      color: '#b9fa44',
      position: { x: 0, y: 0, z: 10 },
      vy: 0,
      yaw: 0,
      pitch: 0,
      hp: 3,
      score: 0,
      deaths: 0,
      seq: -1,
      moving: false,
      grounded: true,
      knockUntil: 0,
      diveUntil: 0,
      respawnAt: 0,
      protectedUntil: 0,
      pet,
      weapon: rollWeapon(),
    };
    runtime.local = p;
    runtime.pending = [];
    runtime.clockOffset = 0;
    controls.yaw = 0;
    controls.pitch = -0.08;
    set({
      screen: 'game',
      status: 'practice',
      id: p.id,
      room: 'PRACTICE',
      shots: [],
      weaponChangedAt: 0,
      snapshot: {
        room: 'PRACTICE',
        players: [p],
        time: now,
        endsAt: now + MATCH_MS,
        round: 1,
        phase: 'playing',
        feed: [],
      },
      error: '',
      caption: { text: '', at: 0 },
    });
    startLoop();
  },
  leave: () => {
    ++connectionVersion;
    set({
      screen: 'lobby',
      status: 'idle',
      snapshot: null,
      shots: [],
      error: '',
      caption: { text: '', at: 0 },
    });
    commentaryPlayer?.stopAll();
    socket?.disconnect();
    socket = null;
    if (timer) clearInterval(timer);
    runtime.local = null;
    runtime.pending = [];
    controls.fire = false;
    controls.x = 0;
    controls.z = 0;
    document.exitPointerLock?.();
    window.history.replaceState({}, '', '/');
  },
}));
function receiveShot(shot: Shot) {
  const s = useGame.getState();
  useGame.setState({
    shots: [
      ...s.shots.filter((q) => shot.at - q.at < Math.max(950, (q.travelMs || 0) + 200)),
      shot,
    ].slice(-256),
    hitAt: shot.shooter === s.id && shot.hit ? performance.now() : s.hitAt,
  });
  const me = runtime.local;
  if (!me) return;
  const local = shot.shooter === s.id;
  if (!shot.impact) {
    const origin = local ? { volume: 1, pan: 0 } : spatialMix(shot.from, me.position, controls.yaw);
    playSound(WEAPONS[shot.weapon].sound, origin.volume, origin.pan);
  }
  if (!shot.travelMs) {
    const impact = spatialMix(shot.to, me.position, controls.yaw);
    playSound(shot.impact ? 'explosion' : 'splat', impact.volume * 0.7, impact.pan);
  }
  if (local && shot.hit) playSound(shot.killed ? 'elimination' : 'hit');
}
function startLoop() {
  let stride = 0;
  let projectiles: Shot[] = [];
  if (timer) clearInterval(timer);
  timer = setInterval(() => {
    const s = useGame.getState(),
      p = runtime.local;
    if (!p || (s.status !== 'online' && s.status !== 'practice')) return;
    const input: Input = { seq: ++runtime.seq, ...controls };
    const before = {
      x: p.position.x,
      z: p.position.z,
      grounded: p.grounded,
      vy: p.vy,
      diveUntil: p.diveUntil,
      knockUntil: p.knockUntil,
    };
    const now = Date.now() + runtime.clockOffset;
    movePlayer(p, input, DT, now);
    // Emit movement cues only during prediction, never when replaying reconciled inputs.
    if (p.hp > 0) {
      if (before.grounded && !p.grounded && p.vy > 0) playSound('jump');
      if (!before.grounded && p.grounded && before.vy < -2) playSound('land');
      if (p.diveUntil > before.diveUntil) playSound('dive');
      if (p.knockUntil > before.knockUntil) playSound('stumble');
      if (p.grounded && now >= p.diveUntil && now >= p.knockUntil) {
        stride += Math.hypot(p.position.x - before.x, p.position.z - before.z);
        if (stride >= 1.8) {
          playSound('step');
          stride = 0;
        }
      } else stride = 0;
    } else stride = 0;
    if (s.status === 'online') {
      runtime.pending.push(input);
      runtime.pending = runtime.pending.slice(-60);
      socket?.sendInput(input);
    } else {
      const now = Date.now();
      projectiles = projectiles.filter((flight) => {
        if (now < flight.at + (flight.travelMs || 0)) return true;
        receiveShot(explode(flight, p, [], now));
        return false;
      });
      if (input.fire) {
        const shot = shoot(p, [], now, runtime.lastShot);
        if (shot) {
          runtime.lastShot = now;
          receiveShot(shot);
          if (shot.travelMs) projectiles.push(shot);
        }
      }
      useGame.setState({ snapshot: { ...s.snapshot!, players: [clone(p)], time: now } });
    }
    controls.jump = false;
    controls.dive = false;
    controls.stumble = false;
  }, DT * 1000);
}
let commentaryPlayer: CommentaryPlayer | null = null;
let commentaryContext: AudioContext | null = null;
function commentaryFor(ctx: AudioContext) {
  if (!commentaryPlayer || commentaryContext !== ctx) {
    commentaryPlayer = new CommentaryPlayer(ctx);
    commentaryContext = ctx;
  }
  return commentaryPlayer;
}
function applyCasterVolume() {
  if (!commentaryPlayer) return;
  const s = useGame.getState();
  commentaryPlayer.setVolume(!s.muted && s.casterOn);
}
function storedCasterPreference() {
  try {
    if (typeof window === 'undefined') return true;
    const saved = localStorage.getItem('ghost:caster');
    return saved === null ? true : saved === '1';
  } catch {
    return true;
  }
}
