import { COMMENTARY_SAMPLE_RATE } from '../../../packages/shared/src/constants';

/** Gapless PCM player for the 16 kHz mono commentary stream. */
export class CommentaryPlayer {
  private ctx: AudioContext | null;
  private gain: GainNode | null = null;
  private nextStart = 0;
  private sources = new Set<AudioBufferSourceNode>();

  constructor(ctx: AudioContext | null) {
    this.ctx = ctx;
    if (!ctx) return;
    try {
      this.gain = ctx.createGain();
      this.gain.gain.value = 1;
      this.gain.connect(ctx.destination);
    } catch {
      this.gain = null;
    }
  }

  enqueue(pcm: ArrayBuffer | Uint8Array) {
    const ctx = this.ctx;
    if (!ctx || ctx.state !== 'running' || !this.gain) return;
    try {
      const bytes =
        pcm instanceof Uint8Array
          ? new Uint8Array(pcm.buffer, pcm.byteOffset, pcm.byteLength)
          : new Uint8Array(pcm);
      const samples = Math.floor(bytes.byteLength / 2);
      if (!samples) return;
      const view = new DataView(bytes.buffer, bytes.byteOffset, samples * 2);
      const buffer = ctx.createBuffer(1, samples, COMMENTARY_SAMPLE_RATE);
      const channel = buffer.getChannelData(0);
      for (let i = 0; i < samples; i++) channel[i] = view.getInt16(i * 2, true) / 32768;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(this.gain);
      const start = Math.max(this.nextStart, ctx.currentTime + 0.12);
      source.start(start);
      this.nextStart = start + buffer.duration;
      this.sources.add(source);
      source.onended = () => this.sources.delete(source);
    } catch {
      // Dropping audio is always preferable to breaking the game loop.
    }
  }

  setVolume(on: boolean) {
    try {
      if (this.gain) this.gain.gain.value = on ? 1 : 0;
    } catch {
      // A closed context is silent already.
    }
  }

  stopAll() {
    for (const source of this.sources) {
      try {
        source.stop();
      } catch {
        // Already stopped sources are harmless.
      }
    }
    this.sources.clear();
    this.nextStart = 0;
  }
}
