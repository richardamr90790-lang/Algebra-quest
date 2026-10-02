// Sound effects, synthesized with the Web Audio API so there are no audio files to download and they work
// offline. `planFor` describes each sound as a list of notes (pure data); `createSoundPlayer` turns a plan
// into oscillators on whatever audio context it is given, so it can be tested with a fake one.

const NOTE = { E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1567.98 };

const arpeggio = (freqs, gap, last = 0.3) =>
  freqs.map((freq, i) => ({ freq, at: i * gap, dur: i === freqs.length - 1 ? last : gap * 1.6, type: "sine", gain: 1 }));

const PLANS = {
  // a bright two-note "ding"
  correct: [
    { freq: NOTE.E5, at: 0, dur: 0.12, type: "sine", gain: 1 },
    { freq: NOTE.A5, at: 0.09, dur: 0.22, type: "sine", gain: 1 },
  ],
  // soft and low, never harsh
  wrong: [
    { freq: NOTE.A4, at: 0, dur: 0.16, type: "triangle", gain: 0.7 },
    { freq: NOTE.E4, at: 0.13, dur: 0.26, type: "triangle", gain: 0.7 },
  ],
  streak: arpeggio([NOTE.G5, NOTE.C6, NOTE.E6], 0.07, 0.3),
  levelup: arpeggio([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6], 0.1, 0.45),
  mastered: arpeggio([NOTE.C5, NOTE.E5, NOTE.G5, NOTE.C6, NOTE.E6, NOTE.G6], 0.08, 0.5),
  badge: [
    { freq: NOTE.G5, at: 0, dur: 0.1, type: "sine", gain: 1 },
    { freq: NOTE.C6, at: 0.1, dur: 0.12, type: "sine", gain: 1 },
    { freq: NOTE.E6, at: 0.2, dur: 0.4, type: "sine", gain: 0.9 },
  ],
  buy: [
    { freq: NOTE.E6, at: 0, dur: 0.08, type: "square", gain: 0.5 },
    { freq: NOTE.G6, at: 0.07, dur: 0.3, type: "square", gain: 0.5 },
  ],
  fanfare: [
    { freq: NOTE.C5, at: 0, dur: 0.12, type: "triangle", gain: 1 },
    { freq: NOTE.C5, at: 0.14, dur: 0.12, type: "triangle", gain: 1 },
    { freq: NOTE.C5, at: 0.28, dur: 0.12, type: "triangle", gain: 1 },
    { freq: NOTE.G5, at: 0.42, dur: 0.32, type: "triangle", gain: 1 },
    { freq: NOTE.E5, at: 0.76, dur: 0.14, type: "triangle", gain: 1 },
    { freq: NOTE.G5, at: 0.9, dur: 0.5, type: "triangle", gain: 1 },
  ],
};

export const SOUND_NAMES = Object.keys(PLANS);
export const planFor = (name) => PLANS[name] || null;

// makeContext: () => AudioContext-like (created lazily on first use, after a user gesture).
// isMuted: () => boolean, read on every call so a mute takes effect immediately.
export function createSoundPlayer({ makeContext, isMuted, volume = 0.15 }) {
  let ctx = null;
  return {
    // Returns true if a sound was scheduled. Never throws: a device without audio just stays silent.
    play(name) {
      if (isMuted()) return false;
      const plan = planFor(name);
      if (!plan) return false;
      try {
        ctx = ctx || makeContext();
        if (!ctx) return false;
        if (ctx.state === "suspended" && ctx.resume) ctx.resume();
        const t0 = ctx.currentTime;
        for (const n of plan) {
          const osc = ctx.createOscillator();
          const amp = ctx.createGain();
          const start = t0 + n.at;
          osc.type = n.type;
          osc.frequency.value = n.freq;
          amp.gain.setValueAtTime(0.0001, start);
          amp.gain.exponentialRampToValueAtTime(volume * n.gain, start + 0.012);
          amp.gain.exponentialRampToValueAtTime(0.0001, start + n.dur);
          osc.connect(amp);
          amp.connect(ctx.destination);
          osc.start(start);
          osc.stop(start + n.dur + 0.03);
        }
        return true;
      } catch {
        return false;
      }
    },
  };
}
