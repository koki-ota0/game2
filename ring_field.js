import { soundEngine } from './sound.js';

export class RingFieldEngine {
  constructor(canvas, container, onChainResolved, onComboStep) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.container = container;
    this.onChainResolved = onChainResolved;
    this.onComboStep = onComboStep;

    // Ring Configuration
    // 3 Concentric Rings: Outer (Ring 2, 12 nodes), Middle (Ring 1, 8 nodes), Inner (Ring 0, 4 nodes) + 1 Apex Core Node
    this.ringDefs = [
      { radiusRatio: 0.22, count: 4, rotSpeed: 0.003 },
      { radiusRatio: 0.44, count: 8, rotSpeed: -0.002 },
      { radiusRatio: 0.68, count: 12, rotSpeed: 0.0015 }
    ];

    this.center = { x: 0, y: 0 };
    this.maxRadius = 150;
    this.nodes = [];
    this.activeChain = [];
    this.isDragging = false;
    this.currentColor = null;
    this.isRingClosed = false;

    // Elements
    this.colors = ['cyan', 'purple', 'gold', 'emerald'];
    this.elementNames = {
      cyan: '哀傷の星水 (Tears)',
      purple: '黄昏の重力 (Gravity)',
      gold: '黎明の閃光 (Dawn)',
      emerald: '記憶の風化 (Erosion)'
    };

    // Touch & Animation
    this.resize();
    window.addEventListener('resize', () => this.resize());
    this.spawnAllNodes();
    this.bindEvents();

    this.animLoop = this.animLoop.bind(this);
    requestAnimationFrame(this.animLoop);
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.width = this.canvas.width = rect.width;
    this.height = this.canvas.height = rect.height;
    this.center = { x: this.width / 2, y: this.height / 2 - 15 };
    this.maxRadius = Math.min(this.width, this.height) * 0.44;
  }

  spawnAllNodes() {
    this.nodes = [];
    let idCounter = 0;

    // Apex Core Node (at the center of time)
    this.nodes.push({
      id: idCounter++,
      ringIdx: -1,
      angle: 0,
      baseRadius: 0,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      isCore: true,
      x: this.center.x,
      y: this.center.y,
      pulse: 0
    });

    // Concentric Ring Nodes
    this.ringDefs.forEach((ring, rIdx) => {
      const radius = this.maxRadius * ring.radiusRatio;
      for (let i = 0; i < ring.count; i++) {
        const angle = (i / ring.count) * Math.PI * 2;
        this.nodes.push({
          id: idCounter++,
          ringIdx: rIdx,
          angle: angle,
          baseRadius: radius,
          color: this.colors[Math.floor(Math.random() * this.colors.length)],
          isCore: false,
          x: this.center.x + Math.cos(angle) * radius,
          y: this.center.y + Math.sin(angle) * radius,
          pulse: 0
        });
      }
    });
  }

  bindEvents() {
    const el = this.canvas;
    el.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    el.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', () => this.handlePointerUp());
    window.addEventListener('pointercancel', () => this.handlePointerUp());
  }

  // Haptic Feedback for Mobile Touch Vibration
  triggerHaptic(type = 'light') {
    if (navigator.vibrate) {
      if (type === 'light') navigator.vibrate(12);
      else if (type === 'medium') navigator.vibrate(28);
      else if (type === 'heavy') navigator.vibrate([40, 30, 60]);
    }
  }

  handlePointerDown(e) {
    soundEngine.init();
    soundEngine.startAmbientMusic();

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const touched = this.findNearestNode(x, y, 48);
    if (!touched) return;

    this.isDragging = true;
    this.activeChain = [touched];
    this.currentColor = touched.color;
    this.isRingClosed = false;

    this.triggerHaptic('light');
    soundEngine.playNodeLink(0, 1);
    if (this.onComboStep) this.onComboStep(1, false, touched.color);
  }

  handlePointerMove(e) {
    if (!this.isDragging || this.activeChain.length === 0) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = this.findNearestNode(x, y, 46);
    if (hovered) {
      const last = this.activeChain[this.activeChain.length - 1];

      // Undo step
      if (this.activeChain.length >= 2 && hovered === this.activeChain[this.activeChain.length - 2]) {
        this.activeChain.pop();
        this.isRingClosed = false;
        this.triggerHaptic('light');
        soundEngine.playNodeLink(this.activeChain.length - 1, this.activeChain.length);
        if (this.onComboStep) this.onComboStep(this.activeChain.length, false, this.currentColor);
      }
      // Check Ring Orbit Close (Loop back to 1st node)
      else if (hovered === this.activeChain[0] && this.activeChain.length >= 4 && !this.isRingClosed) {
        this.isRingClosed = true;
        this.triggerHaptic('heavy');
        soundEngine.playNodeLink(this.activeChain.length, this.activeChain.length + 3);
        if (this.onComboStep) this.onComboStep(this.activeChain.length, true, this.currentColor);
      }
      // Check Valid Link: Same color (or core wildcard), connected by orbit or radial beam
      else if (!this.activeChain.includes(hovered) && this.canLinkNodes(last, hovered)) {
        if (hovered.color === this.currentColor || hovered.isCore || this.currentColor === 'all') {
          this.activeChain.push(hovered);
          this.triggerHaptic('medium');
          soundEngine.playNodeLink(this.activeChain.length - 1, this.activeChain.length);
          if (this.onComboStep) this.onComboStep(this.activeChain.length, false, this.currentColor);
        }
      }
    }
  }

  handlePointerUp() {
    if (!this.isDragging) return;
    this.isDragging = false;

    const count = this.activeChain.length;
    if (count >= 3 || (this.isRingClosed && count >= 4)) {
      this.resolveChain();
    } else {
      this.activeChain = [];
      this.isRingClosed = false;
      if (this.onComboStep) this.onComboStep(0, false, null);
    }
  }

  canLinkNodes(n1, n2) {
    // 1. Core links with anything on the inner ring
    if (n1.isCore || n2.isCore) {
      const nonCore = n1.isCore ? n2 : n1;
      return nonCore.ringIdx === 0;
    }

    // 2. Nodes in the same ring: must be angular neighbors
    if (n1.ringIdx === n2.ringIdx) {
      const ringDef = this.ringDefs[n1.ringIdx];
      const angleDiff = Math.abs(this.normalizeAngle(n1.angle - n2.angle));
      const step = (Math.PI * 2) / ringDef.count;
      return Math.abs(angleDiff - step) < 0.45 || Math.abs(angleDiff - (Math.PI * 2 - step)) < 0.45;
    }

    // 3. Radial beam: adjacent rings with similar angular direction
    if (Math.abs(n1.ringIdx - n2.ringIdx) === 1) {
      const angleDiff = Math.abs(this.normalizeAngle(n1.angle - n2.angle));
      return angleDiff < 0.65; // Forgiving ray tolerance for smooth linking
    }

    return false;
  }

  normalizeAngle(angle) {
    while (angle > Math.PI) angle -= Math.PI * 2;
    while (angle < -Math.PI) angle += Math.PI * 2;
    return angle;
  }

  findNearestNode(x, y, maxDist = 48) {
    let best = null;
    let minD = maxDist;
    for (const n of this.nodes) {
      const d = Math.hypot(n.x - x, n.y - y);
      if (d < minD) {
        minD = d;
        best = n;
      }
    }
    return best;
  }

  resolveChain() {
    const chainCopy = [...this.activeChain];
    const isClosed = this.isRingClosed;
    const color = this.currentColor;

    soundEngine.playChainComplete(chainCopy.length, isClosed);

    if (this.onChainResolved) {
      this.onChainResolved({
        count: chainCopy.length,
        isClosed: isClosed,
        color: color,
        nodes: chainCopy
      });
    }

    // Respawn cleared nodes with fresh cosmic star colors
    chainCopy.forEach(n => {
      n.pulse = 1.0;
      setTimeout(() => {
        n.color = this.colors[Math.floor(Math.random() * this.colors.length)];
      }, 200);
    });

    this.activeChain = [];
    this.isRingClosed = false;
  }

  // Active Skill: Rotate Ring clockwise/counter-clockwise or scramble
  rotateRing(ringIdx, angleDelta) {
    this.nodes.forEach(n => {
      if (n.ringIdx === ringIdx) {
        n.angle += angleDelta;
      }
    });
  }

  // Animation & Rendering Loop
  animLoop() {
    this.ctx.clearRect(0, 0, this.width, this.height);

    // Slowly rotate rings in opposing celestial orbits
    this.nodes.forEach(n => {
      if (n.ringIdx >= 0) {
        const ringDef = this.ringDefs[n.ringIdx];
        n.angle += ringDef.rotSpeed;
        n.x = this.center.x + Math.cos(n.angle) * n.baseRadius;
        n.y = this.center.y + Math.sin(n.angle) * n.baseRadius;
      }
      if (n.pulse > 0) {
        n.pulse = Math.max(0, n.pulse - 0.04);
      }
    });

    this.renderOrbits();
    this.renderActiveChainLines();
    this.renderNodes();

    requestAnimationFrame(this.animLoop);
  }

  renderOrbits() {
    this.ctx.save();
    this.ctx.strokeStyle = 'rgba(56, 189, 248, 0.22)';
    this.ctx.lineWidth = 1.6;
    this.ctx.shadowBlur = 10;
    this.ctx.shadowColor = 'rgba(56, 189, 248, 0.4)';
    this.ctx.setLineDash([4, 6]);

    this.ringDefs.forEach(r => {
      const radius = this.maxRadius * r.radiusRatio;
      this.ctx.beginPath();
      this.ctx.arc(this.center.x, this.center.y, radius, 0, Math.PI * 2);
      this.ctx.stroke();
    });

    // Cyber Data Bus Lines (Ray Alignment)
    for (let i = 0; i < 8; i++) {
      const rad = (i / 8) * Math.PI * 2;
      this.ctx.strokeStyle = 'rgba(168, 85, 247, 0.18)';
      this.ctx.lineWidth = 1.0;
      this.ctx.setLineDash([2, 4]);
      this.ctx.beginPath();
      this.ctx.moveTo(this.center.x, this.center.y);
      this.ctx.lineTo(this.center.x + Math.cos(rad) * this.maxRadius * 0.72,
                      this.center.y + Math.sin(rad) * this.maxRadius * 0.72);
      this.ctx.stroke();
    }
    this.ctx.restore();
  }

  renderActiveChainLines() {
    if (this.activeChain.length === 0) return;

    this.ctx.save();
    const hex = this.isRingClosed ? '#f43f5e' : this.getColorHex(this.currentColor);
    this.ctx.strokeStyle = hex;
    this.ctx.lineWidth = this.isRingClosed ? 5 : 3.5;
    this.ctx.lineCap = 'round';
    this.ctx.lineJoin = 'round';
    this.ctx.shadowBlur = 16;
    this.ctx.shadowColor = hex;

    this.ctx.beginPath();
    this.activeChain.forEach((n, idx) => {
      if (idx === 0) this.ctx.moveTo(n.x, n.y);
      else this.ctx.lineTo(n.x, n.y);
    });

    if (this.isRingClosed && this.activeChain.length > 0) {
      this.ctx.lineTo(this.activeChain[0].x, this.activeChain[0].y);
    }
    this.ctx.stroke();
    this.ctx.restore();
  }

  renderNodes() {
    this.nodes.forEach(n => {
      const isSelected = this.activeChain.includes(n);
      const isCore = n.isCore;
      const baseR = isCore ? 17 : 13;
      const r = baseR + (isSelected ? 4 : 0) + (n.pulse * 10);
      const hex = this.getColorHex(n.color);

      this.ctx.save();
      this.ctx.shadowBlur = isSelected ? 20 : (isCore ? 14 : 8);
      this.ctx.shadowColor = hex;

      // Outer glow circle
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, r, 0, Math.PI * 2);
      this.ctx.fillStyle = hex;
      this.ctx.fill();

      // Inner Core Gradient
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, r * 0.7, 0, Math.PI * 2);
      this.ctx.fillStyle = '#0f172a';
      this.ctx.fill();

      // Core Rune / Center
      this.ctx.fillStyle = isCore ? '#ffffff' : hex;
      this.ctx.beginPath();
      this.ctx.arc(n.x, n.y, isCore ? 4.5 : 2.5, 0, Math.PI * 2);
      this.ctx.fill();

      // Distinct Rune Symbol on each node for crystal clear accessibility
      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 11px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      const runeSymbols = {
        cyan: '❄',      // Ice snowflake for Cyan
        emerald: '✦',   // 4-point cross star for Emerald Green
        gold: '✹',      // 8-point sunburst for Gold
        purple: '▲'     // Triangle prism for Purple
      };
      const symbol = isCore ? 'Ω' : (runeSymbols[n.color] || '•');
      this.ctx.fillText(symbol, n.x, n.y);

      // Selected Orbit Ring
      if (isSelected) {
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 1.8;
        this.ctx.beginPath();
        this.ctx.arc(n.x, n.y, r + 4, 0, Math.PI * 2);
        this.ctx.stroke();
      }

      this.ctx.restore();
    });
  }

  getColorHex(color) {
    const map = {
      cyan: '#00e5ff',     // Electric Ice Cyan
      emerald: '#10b981',  // True Emerald Bright Green
      gold: '#fbbf24',     // Radiant Amber Gold
      purple: '#c084fc'    // Deep Astral Purple
    };
    return map[color] || '#00e5ff';
  }
}
