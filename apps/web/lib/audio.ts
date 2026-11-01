import type { Vec3 } from '../../../packages/shared/src/types';

export type Sound = 'shot' | 'pet' | 'splat' | 'hit' | 'elimination' | 'hurt' | 'out' |
  'respawn' | 'jump' | 'land' | 'dive' | 'stumble' | 'step';
let audio: AudioContext | null = null;
let master: GainNode | null = null;
let noise: AudioBuffer | null = null;
let muted = false;
let voices = 0;

// Call only from a user gesture: browsers suspend audio until the player interacts.
export function unlockAudio() {
  if (typeof window === 'undefined') return;
  try {
    if (!audio || audio.state === 'closed') {
      audio = new AudioContext();
      master = audio.createGain();
      master.gain.value = muted ? 0 : 0.65;
      const limiter = audio.createDynamicsCompressor();
      master.connect(limiter);
      limiter.connect(audio.destination);
      noise = audio.createBuffer(1, Math.ceil(audio.sampleRate * 0.3), audio.sampleRate);
      const samples = noise.getChannelData(0);
      for (let i = 0; i < samples.length; i++) samples[i] = Math.random() * 2 - 1;
    }
    void audio.resume().catch(() => {});
  } catch {
    // Audio support is optional; gameplay still works without it.
  }
}

export function setAudioMuted(value: boolean) {
  muted = value;
  if (audio && master) {
    master.gain.cancelScheduledValues(audio.currentTime);
    master.gain.setValueAtTime(value ? 0 : 0.65, audio.currentTime);
  }
}

// Remote effects fade over 28 metres and pan relative to the player's aim.
export function spatialMix(source: Vec3, listener: Vec3, yaw: number) {
  const dx = source.x - listener.x, dz = source.z - listener.z;
  const distance = Math.hypot(dx, source.y - listener.y, dz);
  return {
    volume: Math.max(0, 1 - distance / 28) ** 2,
    pan: Math.max(-1, Math.min(1, (dx * Math.cos(yaw) - dz * Math.sin(yaw)) / Math.max(1, distance))),
  };
}

export function playSound(kind: Sound, volume = 1, pan = 0) {
  if (muted || typeof document === 'undefined' || document.hidden ||
      !audio || !master || audio.state !== 'running' || volume <= 0 || voices >= 32) return;
  const ctx = audio;
  const at = ctx.currentTime;
  const output = ctx.createGain();
  const stereo = ctx.createStereoPanner();
  output.gain.value = Math.min(1, volume);
  stereo.pan.value = pan;
  output.connect(stereo);
  stereo.connect(master);
  let remaining = 0;
  const connect = (source: AudioScheduledSourceNode, gain: GainNode, end: number, filter?: BiquadFilterNode) => {
    remaining++;
    voices++;
    if (filter) { source.connect(filter); filter.connect(gain); }
    else source.connect(gain);
    gain.connect(output);
    source.onended = () => {
      source.disconnect();
      filter?.disconnect();
      gain.disconnect();
      voices--;
      if (--remaining === 0) { output.disconnect(); stereo.disconnect(); }
    };
    source.start(at);
    source.stop(at + end);
  };
  const tone = (from: number, to: number, duration: number, level: number, type: OscillatorType = 'sine') => {
    const osc = ctx.createOscillator(), gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(from, at);
    osc.frequency.exponentialRampToValueAtTime(to, at + duration);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    connect(osc, gain, duration + 0.01);
  };
  const burst = (frequency: number, duration: number, level: number) => {
    if (!noise) return;
    const source = ctx.createBufferSource(), filter = ctx.createBiquadFilter(), gain = ctx.createGain();
    source.buffer = noise;
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(frequency, at);
    filter.frequency.exponentialRampToValueAtTime(150, at + duration);
    gain.gain.setValueAtTime(level, at);
    gain.gain.exponentialRampToValueAtTime(0.0001, at + duration);
    connect(source, gain, duration + 0.01, filter);
  };
  switch (kind) {
    case 'shot': burst(2400, 0.09, 0.28); tone(210, 55, 0.1, 0.18, 'triangle'); break;
    case 'pet': tone(580, 170, 0.13, 0.13, 'triangle'); burst(1600, 0.06, 0.12); break;
    case 'splat': burst(1300, 0.13, 0.22); tone(140, 45, 0.08, 0.1); break;
    case 'hit': tone(880, 1320, 0.1, 0.14); break;
    case 'elimination': tone(660, 1320, 0.23, 0.16); tone(990, 1980, 0.23, 0.08); break;
    case 'hurt': burst(750, 0.16, 0.25); tone(160, 60, 0.19, 0.16); break;
    case 'out': tone(240, 45, 0.45, 0.22, 'triangle'); burst(600, 0.25, 0.2); break;
    case 'respawn': tone(330, 990, 0.35, 0.16); tone(495, 1485, 0.35, 0.08); break;
    case 'jump': tone(180, 420, 0.13, 0.09, 'triangle'); break;
    case 'land': burst(500, 0.12, 0.18); tone(95, 40, 0.1, 0.1); break;
    case 'dive': burst(2600, 0.25, 0.19); break;
    case 'stumble': burst(600, 0.18, 0.22); tone(130, 45, 0.16, 0.12); break;
    case 'step': burst(650 + Math.random() * 250, 0.055, 0.1); break;
  }
}

export function getAudioContext() {
  return audio;
}
