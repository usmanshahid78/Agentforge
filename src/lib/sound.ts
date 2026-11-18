import { useUi } from '@/store/ui';

type Sfx = 'click' | 'success' | 'alert';

let ctx: AudioContext | undefined;

/**
 * Subtle UI sounds synthesised with Web Audio (no audio files). Off by
 * default; only plays when the owner enables "Interface sounds" in Settings.
 */
export function sfx(kind: Sfx) {
  if (!useUi.getState().sound || typeof window === 'undefined' || !('AudioContext' in window)) return;
  ctx ??= new AudioContext();
  const now = ctx.currentTime;
  const notes: Record<Sfx, number[]> = { click: [880], success: [660, 990], alert: [440, 330] };
  notes[kind].forEach((freq, i) => {
    const osc = ctx!.createOscillator();
    const gain = ctx!.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    const t = now + i * 0.09;
    gain.gain.setValueAtTime(0.0001, t);
    gain.gain.exponentialRampToValueAtTime(0.06, t + 0.01);
    gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);
    osc.connect(gain).connect(ctx!.destination);
    osc.start(t);
    osc.stop(t + 0.18);
  });
}
