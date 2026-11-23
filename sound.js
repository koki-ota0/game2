// Web Audio API Procedural Synthesizer for Atmospheric Sound & SFX
// Gives a profound, ethereal, melancholic music and responsive tactile audio without heavy external audio files

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmPlaying = false;
    this.timer = null;
    this.ambientChords = [
      [220.00, 261.63, 329.63, 392.00], // Am7 (La, Do, Mi, Sol)
      [174.61, 220.00, 261.63, 329.63], // Fmaj7 (Fa, La, Do, Mi)
      [196.00, 246.94, 293.66, 349.23], // G7
      [164.81, 196.00, 246.94, 293.66], // Em7
      [146.83, 174.61, 220.00, 261.63]  // Dm7
    ];
    this.chordIndex = 0;
  }

  init() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  toggle() {
    this.enabled = !this.enabled;
    if (!this.enabled && this.timer) {
      clearInterval(this.timer);
      this.timer = null;
      this.bgmPlaying = false;
    } else if (this.enabled) {
      this.init();
      this.startAmbientMusic();
    }
    return this.enabled;
  }

  startAmbientMusic() {
    if (!this.enabled || this.bgmPlaying) return;
    this.init();
    this.bgmPlaying = true;
    
    // Play an ambient music progression every 4.8 seconds
    this.playAmbientChord();
    this.timer = setInterval(() => {
      if (this.enabled) {
        this.playAmbientChord();
      }
    }, 4800);
  }

  playAmbientChord() {
    if (!this.ctx || !this.enabled) return;
    const now = this.ctx.currentTime;
    const chord = this.ambientChords[this.chordIndex % this.ambientChords.length];
    this.chordIndex++;

    chord.forEach((freq, idx) => {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const filter = this.ctx.createBiquadFilter();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * (1 + (Math.random() - 0.5) * 0.005), now);

      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(800 + idx * 200, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.025, now + 1.2 + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + 4.6);
    });

    // Melancholy high chime randomly
    if (Math.random() > 0.4) {
      const bellFreq = [659.25, 783.99, 880.00, 1046.50, 1318.51][Math.floor(Math.random() * 5)];
      this.playGlassTone(bellFreq, 0.03, 3.0, now + 1.5);
    }
  }

  playGlassTone(freq, volume, duration, startTime = null) {
    if (!this.ctx || !this.enabled) return;
    const now = startTime || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  // Sound Effect: Fragile Tap on Memory Bubble
  playOrbPop(type = 'blue', combo = 1) {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const basePitches = {
      blue: 440,
      purple: 554.37,
      gold: 659.25
    };
    const base = basePitches[type] || 440;
    // Semitone pitch step up with combo
    const pitch = base * Math.pow(1.05946, Math.min(combo, 12));

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(pitch, now);
    osc.frequency.exponentialRampToValueAtTime(pitch * 1.5, now + 0.12);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.16);

    // Subtle water drop / crystal chime layer
    this.playGlassTone(pitch * 2, 0.03, 0.4, now + 0.02);
  }

  // Sound Effect: Boss Hit / Resonance Strike
  playHitSound(isCrit = false) {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 180 : 130, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + 0.2);

    gain.gain.setValueAtTime(isCrit ? 0.15 : 0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.25);
  }

  // Sound Effect: Burst / Ephemeral Transcendence
  playBurstFanfare() {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const arpeggio = [440, 554.37, 659.25, 880, 1108.73, 1318.51, 1760];

    arpeggio.forEach((note, idx) => {
      this.playGlassTone(note, 0.08, 1.2, now + idx * 0.08);
    });
  }

  // Sound Effect: Upgrade purchased
  playUpgradeSound() {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    this.playGlassTone(523.25, 0.06, 0.3, now);
    this.playGlassTone(659.25, 0.06, 0.4, now + 0.08);
    this.playGlassTone(783.99, 0.08, 0.6, now + 0.16);
  }
}

export const soundEngine = new SoundEngine();
