import { createFrame, clearFrame, createFx, composite, PAL } from './pixelfx/core/index.js';
import * as critHit from './pixelfx/fx/impacts/crit-hit.js';
import * as manaBurst from './pixelfx/fx/arcane/mana-burst.js';
import * as sunburst from './pixelfx/fx/holy/sunburst.js';
import * as frostNova from './pixelfx/fx/ice/frost-nova.js';
import * as snowflakeBurst from './pixelfx/fx/ice/snowflake-burst.js';
import * as chargeUp from './pixelfx/fx/lightning/charge-up.js';

export class PixelFxBridge {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { willReadFrequently: true });

    // Low-res retro internal buffer for true crisp pixel-art aesthetic
    this.internalW = 384;
    this.internalH = 216;
    this.frame = createFrame(this.internalW, this.internalH);
    this.img = new ImageData(this.internalW, this.internalH);

    this.activeFxs = [];
    this.lastTime = performance.now();

    this.resize();
    window.addEventListener('resize', () => this.resize());

    this.tick = this.tick.bind(this);
    requestAnimationFrame(this.tick);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width = rect.width;
    this.canvas.height = rect.height;
    this.width = rect.width;
    this.height = rect.height;
  }

  // Trigger Critical / Hit Sparkle
  playHit(screenX, screenY, isCrit = false) {
    const rx = (screenX / this.width) * this.internalW;
    const ry = (screenY / this.height) * this.internalH;

    const fx = createFx(critHit, {
      x: rx,
      y: ry,
      palette: isCrit ? PAL.ember : PAL.ice,
      light: isCrit ? 1.5 : 1.0
    });
    this.activeFxs.push(fx);
  }

  // Trigger Skill 1: 刻の逆行 (Arcane Chrono Reversal Burst)
  playChronoBurst(screenX, screenY) {
    const rx = (screenX / this.width) * this.internalW;
    const ry = (screenY / this.height) * this.internalH;

    const fx = createFx(manaBurst, {
      x: rx,
      y: ry,
      palette: PAL.arcane,
      light: 1.4
    });
    this.activeFxs.push(fx);
  }

  // Trigger Skill 2: 天球調相 (Cosmic Sunburst & Alignment Wave)
  playAlignSunburst(screenX, screenY) {
    const rx = (screenX / this.width) * this.internalW;
    const ry = (screenY / this.height) * this.internalH;

    const fx = createFx(sunburst, {
      x: rx,
      y: ry,
      palette: PAL.gold,
      light: 1.6
    });
    this.activeFxs.push(fx);
    setTimeout(() => {
      fx.stop();
    }, 1800);
  }

  // Trigger Skill 3: 儚き絶唱 (Supernova Frost Nova & Lightning Burst)
  playUltimateBurst(screenX, screenY) {
    const rx = (screenX / this.width) * this.internalW;
    const ry = (screenY / this.height) * this.internalH;

    const fx1 = createFx(frostNova, {
      x: rx,
      y: ry,
      palette: PAL.ice,
      light: 2.0
    });
    const fx2 = createFx(chargeUp, {
      x: rx,
      y: ry,
      palette: PAL.neon,
      light: 2.2
    });
    const fx3 = createFx(manaBurst, {
      x: rx,
      y: ry,
      palette: PAL.cyber,
      light: 1.8
    });

    this.activeFxs.push(fx1, fx2, fx3);
  }

  // Trigger Eclipse Loop (COSMIC ECLIPSE!)
  playEclipseNova(screenX, screenY) {
    const rx = (screenX / this.width) * this.internalW;
    const ry = (screenY / this.height) * this.internalH;

    const fx = createFx(snowflakeBurst, {
      x: rx,
      y: ry,
      palette: PAL.blood,
      light: 1.8
    });
    this.activeFxs.push(fx);
  }

  tick(now) {
    const dt = Math.min(0.1, (now - this.lastTime) / 1000);
    this.lastTime = now;

    // Update pixelfx instances
    for (let i = this.activeFxs.length - 1; i >= 0; i--) {
      const fx = this.activeFxs[i];
      fx.update(dt);
      if (fx.done()) {
        this.activeFxs.splice(i, 1);
      }
    }

    if (this.activeFxs.length > 0) {
      clearFrame(this.frame);
      for (const fx of this.activeFxs) {
        fx.draw(this.frame, "back");
        fx.draw(this.frame, "front");
      }
      composite(this.frame, this.img.data, null); // Transparent background

      // Render crisp pixel art scaled to screen with smoothing disabled
      this.ctx.save();
      this.ctx.imageSmoothingEnabled = false;
      this.ctx.clearRect(0, 0, this.width, this.height);

      // We create a temporary offscreen canvas or putImageData into an offscreen to drawImage scale
      if (!this.offscreenCanvas) {
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.internalW;
        this.offscreenCanvas.height = this.internalH;
        this.offCtx = this.offscreenCanvas.getContext('2d');
      }

      this.offCtx.putImageData(this.img, 0, 0);
      this.ctx.drawImage(this.offscreenCanvas, 0, 0, this.width, this.height);
      this.ctx.restore();
    } else {
      this.ctx.clearRect(0, 0, this.width, this.height);
    }

    requestAnimationFrame(this.tick);
  }
}
