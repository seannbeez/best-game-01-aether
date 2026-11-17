// AETHER FORGE — procedural WebAudio sound engine. Zero assets: every sound
// is synthesized (oscillators + filtered noise), and the music is a small
// step sequencer driving a low drone, a clockwork tick and a bass pulse.
// Overdrive raises the sequencer tempo and brightens the drone.

export class SoundEngine {
  constructor() {
    this.context = null;
    this.master = null;
    this.musicGain = null;
    this.muted = false;
    this.started = false;
    this.step = 0;
    this.nextStepTime = 0;
    this.stepInterval = 0.42;
    this.overdrive = false;
    this.timer = null;
  }

  // Browsers require a user gesture before audio starts; call from the first
  // click / keypress, never on page load.
  ensure() {
    if (this.context) {
      if (this.context.state === 'suspended') this.context.resume();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    this.context = new AudioContext();
    this.master = this.context.createGain();
    this.master.gain.value = this.muted ? 0 : 0.55;
    this.master.connect(this.context.destination);
    this.musicGain = this.context.createGain();
    this.musicGain.gain.value = 0.16;
    this.musicGain.connect(this.master);
    this.started = true;
    this.nextStepTime = this.context.currentTime + 0.1;
    this.timer = window.setInterval(() => this.scheduleMusic(), 90);
  }

  setMuted(muted) {
    this.muted = muted;
    if (this.master && this.context) {
      this.master.gain.setTargetAtTime(muted ? 0 : 0.55, this.context.currentTime, 0.02);
    }
  }

  setOverdrive(on) {
    this.overdrive = on;
    this.stepInterval = on ? 0.27 : 0.42;
  }

  stopMusic() {
    if (this.timer !== null) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
  }

  // --- music sequencer: 16-step loop, drone root + tick + bass pulse ---
  scheduleMusic() {
    if (!this.context || this.muted) return;
    const ahead = this.context.currentTime + 0.25;
    while (this.nextStepTime < ahead) {
      this.playStep(this.step, this.nextStepTime);
      this.step = (this.step + 1) % 16;
      this.nextStepTime += this.stepInterval;
    }
  }

  playStep(step, when) {
    const ctx = this.context;
    // Clockwork tick on every step, brighter on the beat.
    this.tick(when, step % 4 === 0 ? 1900 : 1200, step % 4 === 0 ? 0.05 : 0.03);
    // Bass pulse on steps 0, 4, 8, 12 — root note walks Am–F–C–G.
    if (step % 4 === 0) {
      const roots = [110, 87.31, 130.81, 98];
      this.bassNote(when, roots[(step / 4) | 0], 0.5);
    }
    // Drone shimmer on the off-beats while in Overdrive.
    if (this.overdrive && step % 2 === 1) {
      this.droneNote(when, 440 * (step % 8 === 3 ? 1.5 : 1.0), 0.22);
    }
  }

  tick(when, frequency, volume) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'square';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + 0.06);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + 0.08);
  }

  bassNote(when, frequency, duration) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(frequency, when);
    osc.frequency.exponentialRampToValueAtTime(frequency * 0.5, when + duration);
    gain.gain.setValueAtTime(0.5, when);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  droneNote(when, frequency, duration) {
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(0.0001, when);
    gain.gain.linearRampToValueAtTime(0.12, when + 0.05);
    gain.gain.exponentialRampToValueAtTime(0.0001, when + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(when);
    osc.stop(when + duration + 0.05);
  }

  // --- one-shot effects ---
  blip(frequency, duration, type, volume) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.value = frequency;
    gain.gain.setValueAtTime(volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + duration);
    osc.connect(gain);
    gain.connect(this.master);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.02);
  }

  noiseBurst(duration, filterFrequency, volume) {
    if (!this.context || this.muted) return;
    const ctx = this.context;
    const length = Math.max(1, Math.floor(ctx.sampleRate * duration));
    const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < length; i += 1) {
      data[i] = (Math.random() * 2 - 1) * (1 - i / length);
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFrequency;
    const gain = ctx.createGain();
    gain.gain.value = volume;
    source.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);
    source.start();
  }

  shoot() {
    this.blip(720, 0.09, 'square', 0.08);
    this.blip(1440, 0.05, 'sine', 0.05);
  }

  hit() {
    this.noiseBurst(0.08, 2400, 0.12);
  }

  explosion() {
    this.noiseBurst(0.45, 700, 0.5);
    this.blip(70, 0.4, 'sine', 0.5);
  }

  // Metallic parry ring: a bright inharmonic strike.
  parry() {
    this.blip(2093, 0.25, 'triangle', 0.22);
    this.blip(3136, 0.18, 'sine', 0.12);
    this.blip(1568, 0.3, 'sine', 0.1);
  }

  // Combo chime climbs a pentatonic ladder with the combo count.
  comboChime(combo) {
    const scale = [523.25, 587.33, 659.25, 783.99, 880, 1046.5, 1174.7, 1318.5];
    const note = scale[Math.min(combo, scale.length - 1)];
    this.blip(note, 0.22, 'sine', 0.16);
    this.blip(note * 2, 0.12, 'sine', 0.06);
  }

  draft() {
    this.blip(392, 0.15, 'triangle', 0.14);
    this.blip(523.25, 0.15, 'triangle', 0.14);
    this.blip(659.25, 0.3, 'triangle', 0.16);
  }

  relicPick() {
    [523.25, 659.25, 783.99, 1046.5].forEach((note, i) => {
      window.setTimeout(() => this.blip(note, 0.2, 'triangle', 0.15), i * 70);
    });
  }

  bossRoar() {
    this.blip(55, 0.8, 'sawtooth', 0.3);
    this.noiseBurst(0.7, 400, 0.35);
  }

  overdriveStart() {
    [440, 554.37, 659.25, 880].forEach((note, i) => {
      window.setTimeout(() => this.blip(note, 0.25, 'square', 0.1), i * 60);
    });
  }

  gameOver() {
    [392, 329.63, 261.63, 196].forEach((note, i) => {
      window.setTimeout(() => this.blip(note, 0.4, 'triangle', 0.16), i * 180);
    });
  }

  victory() {
    [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((note, i) => {
      window.setTimeout(() => this.blip(note, 0.35, 'triangle', 0.16), i * 120);
    });
  }
}
