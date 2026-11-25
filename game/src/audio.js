// All sound is synthesised with WebAudio — short oscillator blips and filtered noise —
// so the game ships no audio files and never touches the network. The context is created
// on the first user gesture; every call before that is a silent no-op.

function makeNoiseBuffer(context) {
  const length = context.sampleRate;
  const buffer = context.createBuffer(1, length, context.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < length; i += 1) data[i] = Math.random() * 2 - 1;
  return buffer;
}

export function createSound() {
  let context = null;
  let noise = null;
  let muted = false;
  let sizzle = null;

  function ensure() {
    if (context !== null) return true;
    try {
      const AudioContext = window.AudioContext ?? window.webkitAudioContext;
      if (!AudioContext) return false;
      context = new AudioContext();
      noise = makeNoiseBuffer(context);
    } catch {
      return false;
    }
    return true;
  }

  function tone(frequency, duration, type, volume, when = 0) {
    if (!ensure() || muted) return;
    const start = context.currentTime + when;
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    oscillator.type = type;
    oscillator.frequency.setValueAtTime(frequency, start);
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    oscillator.connect(gain).connect(context.destination);
    oscillator.start(start);
    oscillator.stop(start + duration + 0.02);
  }

  function burst(duration, volume, filterFrequency) {
    if (!ensure() || muted) return;
    const start = context.currentTime;
    const source = context.createBufferSource();
    source.buffer = noise;
    const filter = context.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = filterFrequency;
    const gain = context.createGain();
    gain.gain.setValueAtTime(volume, start);
    gain.gain.exponentialRampToValueAtTime(0.001, start + duration);
    source.connect(filter).connect(gain).connect(context.destination);
    source.start(start);
    source.stop(start + duration + 0.02);
  }

  return {
    unlock() {
      if (ensure() && context.state === 'suspended') context.resume().catch(() => {});
    },
    toggleMute() {
      muted = !muted;
      if (muted) this.stopSizzle();
      return muted;
    },
    get muted() {
      return muted;
    },
    pickup() {
      tone(520, 0.07, 'sine', 0.12);
    },
    place() {
      tone(220, 0.08, 'triangle', 0.14);
    },
    chop() {
      burst(0.09, 0.25, 1800);
    },
    chopped() {
      tone(660, 0.06, 'sine', 0.12);
      tone(880, 0.09, 'sine', 0.1, 0.06);
    },
    ding() {
      tone(880, 0.12, 'sine', 0.16);
      tone(1174, 0.16, 'sine', 0.16, 0.09);
      tone(1568, 0.22, 'sine', 0.14, 0.18);
    },
    buzz() {
      tone(140, 0.18, 'sawtooth', 0.12);
      tone(110, 0.22, 'sawtooth', 0.1, 0.05);
    },
    pop() {
      tone(740, 0.06, 'sine', 0.1);
      tone(990, 0.08, 'sine', 0.1, 0.05);
    },
    tick() {
      tone(980, 0.04, 'square', 0.05);
    },
    startSizzle() {
      if (!ensure() || muted || sizzle !== null) return;
      const source = context.createBufferSource();
      source.buffer = noise;
      source.loop = true;
      const filter = context.createBiquadFilter();
      filter.type = 'highpass';
      filter.frequency.value = 3200;
      const gain = context.createGain();
      gain.gain.value = 0.035;
      source.connect(filter).connect(gain).connect(context.destination);
      source.start();
      sizzle = { source, gain };
    },
    stopSizzle() {
      if (sizzle === null) return;
      try {
        sizzle.gain.gain.setTargetAtTime(0, context.currentTime, 0.05);
        sizzle.source.stop(context.currentTime + 0.2);
      } catch {
        // Already stopped: nothing to clean up.
      }
      sizzle = null;
    },
  };
}
