// a short two-note "join" chime synthesized with the Web Audio API, so no audio
// asset is needed. the audio context is created lazily and reused; if the
// browser blocks playback (no prior user gesture) it fails silently.

let ctx: AudioContext | null = null;

function getCtx(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function playJoinSound(): void {
  const audio = getCtx();
  if (!audio) return;
  try {
    if (audio.state === "suspended") void audio.resume();
    const now = audio.currentTime;
    // two rising notes for a friendly "ding-ding".
    const notes: [number, number][] = [
      [660, 0],
      [880, 0.12],
    ];
    for (const [freq, offset] of notes) {
      const osc = audio.createOscillator();
      const gain = audio.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const start = now + offset;
      gain.gain.setValueAtTime(0.0001, start);
      gain.gain.exponentialRampToValueAtTime(0.14, start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(gain).connect(audio.destination);
      osc.start(start);
      osc.stop(start + 0.2);
    }
  } catch {
    // autoplay blocked or audio unavailable; ignore.
  }
}
