import { CHARACTER_DIALOGUES } from './dialogues.js';

// Live2D-Style Animated Character Companion with Interactive Physics & Eye Tracking
export class LapisCompanion {
  constructor(containerEl, onInteract) {
    this.container = containerEl;
    this.onInteract = onInteract;
    this.dialoguePool = CHARACTER_DIALOGUES.lapis;
    this.mount();
    this.bindMouseTracking();
  }

  mount() {
    this.companionEl = document.createElement('div');
    this.companionEl.id = 'lapis-live-companion';
    this.companionEl.innerHTML = `
      <div class="companion-speech-bubble" id="lapis-speech">
        「旅人さん、一緒に星脈を紡ぎましょう……」
      </div>
      <div class="companion-figure-wrap" id="lapis-figure">
        <div class="companion-wing-back left"></div>
        <div class="companion-wing-back right"></div>
        <img class="companion-body" id="lapis-body-img" src="/assets/lapis_full_live.png" alt="Lapis Companion" />
        <div class="companion-wing-front left"></div>
        <div class="companion-wing-front right"></div>
        <div class="companion-aura"></div>
      </div>
    `;
    this.container.appendChild(this.companionEl);

    this.speechEl = document.getElementById('lapis-speech');
    this.figureEl = document.getElementById('lapis-figure');

    // Tap character for voice interaction
    this.companionEl.addEventListener('click', (e) => {
      e.stopPropagation();
      this.triggerReaction('tap');
    });
  }

  bindMouseTracking() {
    window.addEventListener('pointermove', (e) => {
      if (!this.figureEl) return;
      const rect = this.companionEl.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dx = (e.clientX - cx) / window.innerWidth;
      const dy = (e.clientY - cy) / window.innerHeight;

      // Parallax Eye & Head Tilt
      const rotY = Math.max(-14, Math.min(14, dx * 30));
      const rotX = Math.max(-10, Math.min(10, -dy * 20));
      this.figureEl.style.transform = `perspective(600px) rotateY(${rotY}deg) rotateX(${rotX}deg) translateY(-4px)`;
    });
  }

  speak(text, duration = 3000) {
    if (!this.speechEl) return;
    this.speechEl.textContent = text;
    this.speechEl.classList.add('visible');
    clearTimeout(this.speechTimer);
    this.speechTimer = setTimeout(() => {
      this.speechEl.classList.remove('visible');
    }, duration);
  }

  triggerReaction(type = 'cheer') {
    if (!this.figureEl) return;

    if (type === 'cheer' || type === 'super') {
      this.figureEl.classList.remove('jump', 'shake');
      void this.figureEl.offsetWidth;
      this.figureEl.classList.add('jump');
      const pool = this.dialoguePool.combo;
      this.speak(pool[Math.floor(Math.random() * pool.length)], 3200);
    } else if (type === 'hit') {
      this.figureEl.classList.remove('jump', 'shake');
      void this.figureEl.offsetWidth;
      this.figureEl.classList.add('shake');
      const pool = this.dialoguePool.danger;
      this.speak(pool[Math.floor(Math.random() * pool.length)], 3500);
    } else if (type === 'victory') {
      this.figureEl.classList.add('jump');
      const pool = this.dialoguePool.burst_and_victory;
      this.speak(pool[Math.floor(Math.random() * pool.length)], 4000);
    } else if (type === 'tap') {
      this.figureEl.classList.add('blush');
      setTimeout(() => this.figureEl.classList.remove('blush'), 1200);
      const pool = this.dialoguePool.tap;
      this.speak(pool[Math.floor(Math.random() * pool.length)], 3600);
      if (this.onInteract) this.onInteract();
    }
  }
}
