// Web Audio API Procedural Synthesizer for Atmospheric Sound & SFX
// Musical Note System based on Natural Minor / Pentatonic Scale for Harmonic Constellation Weaving

class SoundEngine {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.bgmPlaying = false;
    this.timer = null;

    // Harmonic Minor Scale in Hz (A3, B3, C4, D4, E4, F4, G#4, A4, B4, C5, D5, E5)
    this.scale = [
      220.00, // A3
      246.94, // B3
      261.63, // C4
      293.66, // D4
      329.63, // E4
      349.23, // F4
      415.30, // G#4
      440.00, // A4
      493.88, // B4
      523.25, // C5
      587.33, // D5
      659.25  // E5
    ];

    this.ambientChords = [
      [220.00, 261.63, 329.63, 392.00], // Am7
      [174.61, 220.00, 261.63, 329.63], // Fmaj7
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
      filter.frequency.setValueAtTime(700 + idx * 180, now);

      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(0.02, now + 1.2 + idx * 0.2);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 4.5);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now + idx * 0.15);
      osc.stop(now + 4.6);
    });

    if (Math.random() > 0.4) {
      const bellFreq = [659.25, 783.99, 880.00, 1046.50, 1318.51][Math.floor(Math.random() * 5)];
      this.playGlassTone(bellFreq, 0.025, 3.0, now + 1.5);
    }
  }

  playGlassTone(freq, volume, duration, startTime = null) {
    if (!this.ctx || !this.enabled) return;
    const now = startTime || this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(freq, now);

    gain.gain.setValueAtTime(volume, now);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + duration + 0.1);
  }

  // Sound Effect: Voice Clip Player with Caching
  playVoice(name) {
    if (!this.enabled) return;
    try {
      const audio = new Audio(`/assets/audio/${name}.mp3`);
      audio.volume = 0.85;
      audio.play().catch(e => console.warn('Audio play prevented:', e));
    } catch (e) {
      console.warn('Voice play failed:', e);
    }
  }

  // Harmonic Node Link: Played when player drags a line connecting memory nodes
  playNodeLink(nodeIndex, chainLength = 1) {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const freq = this.scale[nodeIndex % this.scale.length];
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(freq, now);
    osc.frequency.exponentialRampToValueAtTime(freq * 1.02, now + 0.18);

    const vol = Math.min(0.04 + chainLength * 0.015, 0.14);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.4);

    // Harmonic bell overtone
    this.playGlassTone(freq * 2, vol * 0.4, 0.6, now + 0.02);
  }

  // Stellar Release: Grand chord resolution when user finishes an unbroken chain
  playChainComplete(chainCount, isLoop = false) {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    // Arpeggiate harmonic chord
    const baseIndex = isLoop ? 7 : (chainCount >= 5 ? 4 : 2);
    const chord = [
      this.scale[baseIndex % this.scale.length],
      this.scale[(baseIndex + 2) % this.scale.length],
      this.scale[(baseIndex + 4) % this.scale.length],
      this.scale[(baseIndex + 7) % this.scale.length]
    ];

    chord.forEach((freq, idx) => {
      this.playGlassTone(freq, 0.06, 1.2, now + idx * 0.06);
    });
  }

  // Boss Attack Incoming Warning
  playWarningDrone() {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(85, now);
    osc.frequency.linearRampToValueAtTime(65, now + 0.4);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.5);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.55);
  }

  // Boss Hit / Resonance Strike
  playHitSound(isCrit = false) {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = isCrit ? 'sawtooth' : 'triangle';
    osc.frequency.setValueAtTime(isCrit ? 220 : 140, now);
    osc.frequency.exponentialRampToValueAtTime(45, now + 0.22);

    gain.gain.setValueAtTime(isCrit ? 0.16 : 0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(now);
    osc.stop(now + 0.26);
  }

  // Ultimate Ephemeral Cut-In Fanfare
  playBurstFanfare() {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    const arpeggio = [440, 523.25, 659.25, 880, 1046.50, 1318.51, 1760];

    arpeggio.forEach((note, idx) => {
      this.playGlassTone(note, 0.09, 1.6, now + idx * 0.07);
    });
  }

  playUpgradeSound() {
    if (!this.ctx || !this.enabled) return;
    this.init();
    const now = this.ctx.currentTime;
    this.playGlassTone(523.25, 0.05, 0.3, now);
    this.playGlassTone(659.25, 0.06, 0.4, now + 0.08);
    this.playGlassTone(783.99, 0.08, 0.6, now + 0.16);
  }
}

export const soundEngine = new SoundEngine();
