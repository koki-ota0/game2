// Particles & Ambient Star Dust Canvas Visualizer
export class AmbientVisualizer {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.initParticles(60);
    this.animate = this.animate.bind(this);
    requestAnimationFrame(this.animate);
  }

  resize() {
    this.width = this.canvas.width = this.canvas.parentElement.clientWidth;
    this.height = this.canvas.height = this.canvas.parentElement.clientHeight;
  }

  initParticles(count) {
    this.particles = [];
    for (let i = 0; i < count; i++) {
      this.particles.push({
        x: Math.random() * this.width,
        y: Math.random() * this.height,
        vx: (Math.random() - 0.5) * 0.4,
        vy: -0.2 - Math.random() * 0.6, // float upward like dissolving soul fragments
        radius: 1 + Math.random() * 2.5,
        alpha: 0.1 + Math.random() * 0.7,
        alphaSpeed: 0.005 + Math.random() * 0.01,
        color: ['#7dd3fc', '#d8b4fe', '#fde047', '#ffffff'][Math.floor(Math.random() * 4)]
      });
    }
  }

  // Burst effect when tapping or finishing boss
  createBurst(x, y, color = '#38bdf8', count = 25) {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1.5 + Math.random() * 4.5;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        radius: 1.5 + Math.random() * 3,
        alpha: 1,
        alphaSpeed: 0.02 + Math.random() * 0.03,
        color: color,
        ephemeral: true
      });
    }
  }

  animate() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;

      if (p.ephemeral) {
        p.alpha -= p.alphaSpeed;
        p.vy += 0.03; // slight gravity for burst sparks
        if (p.alpha <= 0) {
          this.particles.splice(i, 1);
          continue;
        }
      } else {
        p.alpha += p.alphaSpeed;
        if (p.alpha > 0.8 || p.alpha < 0.1) {
          p.alphaSpeed = -p.alphaSpeed;
        }
        if (p.y < 0) {
          p.y = this.height;
          p.x = Math.random() * this.width;
        }
        if (p.x < 0) p.x = this.width;
        if (p.x > this.width) p.x = 0;
      }

      this.ctx.save();
      this.ctx.globalAlpha = Math.max(0, p.alpha);
      this.ctx.fillStyle = p.color;
      this.ctx.shadowBlur = p.ephemeral ? 12 : 6;
      this.ctx.shadowColor = p.color;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }

    requestAnimationFrame(this.animate);
  }
}
