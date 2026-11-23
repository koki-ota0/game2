import { GameState } from './state.js';
import { soundEngine } from './sound.js';
import { AmbientVisualizer } from './ambient.js';
import confetti from 'canvas-confetti';

class EphemereGame {
  constructor() {
    this.state = new GameState();
    this.visualizer = null;
    this.dom = {};
    this.orbSpawnerTimer = null;
    this.passiveDamageTimer = null;
    this.comboResetTimer = null;
  }

  init() {
    this.state.load();
    this.cacheDom();
    this.bindEvents();
    this.renderHeader();
    this.renderBoss();
    this.renderUpgrades();
    this.renderRelics();
    this.renderLore();

    // Setup ambient particle system
    const canvas = document.getElementById('ambient-canvas');
    if (canvas) {
      this.visualizer = new AmbientVisualizer(canvas);
    }

    // Start Loops
    this.startOrbSpawning();
    this.startPassiveLoop();
    this.updateSkillCooldowns();

    // Trigger initial tutorial dialogue if depth 1
    if (this.state.depth === 1 && this.state.memoryShards === 0) {
      this.showStoryModal(
        'ラピス',
        '/assets/character_lapis.png',
        '「旅人さん……目を覚まして。この世界は、人々の祈りと記憶が薄れゆく黄昏の果て。\n空中に漂う儚き想い（泡）に触れて、世界を調律してください……」'
      );
    }
  }

  cacheDom() {
    this.dom = {
      shardsCount: document.getElementById('memory-shards-count'),
      spiritLevel: document.getElementById('spirit-level'),
      bossName: document.getElementById('boss-name'),
      bossTitle: document.getElementById('boss-title'),
      currentDepth: document.getElementById('current-depth'),
      bossAvatar: document.getElementById('boss-avatar'),
      bossHpText: document.getElementById('boss-hp-text'),
      bossHpFill: document.getElementById('boss-hp-fill'),
      resonancePct: document.getElementById('resonance-pct'),
      resonanceFill: document.getElementById('resonance-fill'),
      interactiveField: document.getElementById('interactive-field'),
      floatLayer: document.getElementById('float-damage-layer'),
      upgradesList: document.getElementById('upgrades-list'),
      relicsList: document.getElementById('relics-list'),
      loreContainer: document.getElementById('lore-container'),
      storyModal: document.getElementById('story-modal'),
      modalSpeaker: document.getElementById('modal-speaker'),
      modalDialogue: document.getElementById('modal-dialogue'),
      modalCharImg: document.getElementById('modal-char-img'),
      btnModalNext: document.getElementById('btn-modal-next'),
      victoryModal: document.getElementById('victory-modal'),
      victoryTitle: document.getElementById('victory-title'),
      victoryDesc: document.getElementById('victory-desc'),
      victoryReward: document.getElementById('victory-reward'),
      btnNextDepth: document.getElementById('btn-next-depth'),
      btnSoundToggle: document.getElementById('btn-sound-toggle'),
      soundIcon: document.getElementById('sound-icon'),
      btnLore: document.getElementById('btn-lore'),
      btnReset: document.getElementById('btn-reset'),
      skillReversal: document.getElementById('skill-reversal'),
      skillCrystallize: document.getElementById('skill-crystallize'),
      skillBurst: document.getElementById('skill-burst'),
      skillReversalCd: document.getElementById('skill-reversal-cd'),
      skillCrystallizeCd: document.getElementById('skill-crystallize-cd')
    };
  }

  bindEvents() {
    // Navigation tabs
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-screen').forEach(t => t.classList.remove('active'));
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        const screen = document.getElementById(tabId);
        if (screen) screen.classList.add('active');
        soundEngine.init();
      });
    });

    // Sound toggle
    this.dom.btnSoundToggle.addEventListener('click', () => {
      const enabled = soundEngine.toggle();
      this.dom.soundIcon.textContent = enabled ? '🔊' : '🔇';
    });

    // Reset button
    this.dom.btnReset.addEventListener('click', () => {
      if (confirm('記憶をすべて手放し、最初の黄昏へと還りますか？（リセット）')) {
        this.state.reset();
      }
    });

    // Lore quick shortcut
    this.dom.btnLore.addEventListener('click', () => {
      const loreNav = document.querySelector('[data-tab="tab-records"]');
      if (loreNav) loreNav.click();
    });

    // Modal dismiss
    this.dom.btnModalNext.addEventListener('click', () => {
      this.dom.storyModal.classList.add('hidden');
      soundEngine.startAmbientMusic();
    });

    // Victory next button
    this.dom.btnNextDepth.addEventListener('click', () => {
      this.advanceToNextDepth();
    });

    // Skills
    this.dom.skillReversal.addEventListener('click', () => this.useSkillReversal());
    this.dom.skillCrystallize.addEventListener('click', () => this.useSkillCrystallize());
    this.dom.skillBurst.addEventListener('click', () => this.useSkillBurst());

    // Field direct tap (fallback slight resonance)
    this.dom.interactiveField.addEventListener('pointerdown', (e) => {
      if (e.target === this.dom.interactiveField || e.target.id === 'field-hint' || e.target.classList.contains('pulse-text')) {
        this.handleDirectTap(e);
      }
    });
  }

  // Handle direct tap on void
  handleDirectTap(e) {
    soundEngine.init();
    soundEngine.startAmbientMusic();
    const stats = this.state.calcStats();
    const rect = this.dom.interactiveField.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const damage = Math.round(stats.tap * 0.4);
    this.dealDamage(damage, false, e.clientX, e.clientY);
    if (this.visualizer) {
      this.visualizer.createBurst(e.clientX, e.clientY, '#38bdf8', 8);
    }
  }

  // Spawns ephemeral memory bubbles that slowly decay and vanish if not popped
  startOrbSpawning() {
    this.orbSpawnerTimer = setInterval(() => {
      if (document.hidden) return;
      const count = document.querySelectorAll('.ephemera-orb').length;
      if (count < 6) {
        this.spawnOrb();
      }
    }, 1200);
  }

  spawnOrb() {
    const field = this.dom.interactiveField;
    const rect = field.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;

    // Orb types: blue (normal), purple (combo catalyst), gold (rare high yield)
    const rand = Math.random();
    let type = 'blue';
    let icon = '💧';
    let duration = 4000; // ephemeral lifespan in ms

    if (rand > 0.88) {
      type = 'gold';
      icon = '🌟';
      duration = 2600; // vanishes fast!
    } else if (rand > 0.65) {
      type = 'purple';
      icon = '🔮';
      duration = 3400;
    }

    const orb = document.createElement('div');
    orb.className = `ephemera-orb orb-${type}`;
    const size = type === 'gold' ? 52 : (type === 'purple' ? 48 : 44);

    const maxX = Math.max(20, rect.width - size - 20);
    const maxY = Math.max(40, rect.height - size - 70);
    const posX = Math.floor(Math.random() * maxX);
    const posY = Math.floor(Math.random() * maxY) + 30;

    orb.style.width = `${size}px`;
    orb.style.height = `${size}px`;
    orb.style.left = `${posX}px`;
    orb.style.top = `${posY}px`;

    orb.innerHTML = `
      <div class="orb-inner ${type}">
        <span>${icon}</span>
      </div>
    `;

    // Lifespan animation
    const startTime = Date.now();
    let isPopped = false;

    const popHandler = (e) => {
      e.stopPropagation();
      e.preventDefault();
      if (isPopped) return;
      isPopped = true;
      this.handleOrbPop(orb, type, e.clientX, e.clientY);
    };

    orb.addEventListener('pointerdown', popHandler);

    field.appendChild(orb);

    // Natural decay (if player misses it)
    setTimeout(() => {
      if (!isPopped && orb.parentElement) {
        orb.style.transition = 'all 0.4s ease-out';
        orb.style.opacity = '0';
        orb.style.transform = 'scale(0.3)';
        setTimeout(() => orb.remove(), 400);
      }
    }, duration);
  }

  handleOrbPop(orbEl, type, clientX, clientY) {
    soundEngine.init();
    soundEngine.startAmbientMusic();

    // Combo streak logic
    this.state.combo++;
    clearTimeout(this.comboResetTimer);
    this.comboResetTimer = setTimeout(() => {
      this.state.combo = 0;
    }, 2800);

    soundEngine.playOrbPop(type, this.state.combo);

    // Calculate damage & rewards
    const stats = this.state.calcStats();
    let baseDmg = stats.tap;
    let shardYield = 1 + Math.floor(this.state.depth * 0.8);

    if (type === 'purple') {
      baseDmg *= 1.8;
      shardYield *= 2;
    } else if (type === 'gold') {
      baseDmg *= 3.5;
      shardYield *= 5;
    }

    // Time-reversal skill active?
    if (Date.now() < this.state.skills.reversal.activeUntil) {
      baseDmg *= 3.0;
      shardYield *= 2;
    }

    // Combo multiplier
    const comboMult = 1 + Math.min(this.state.combo * 0.08, 1.5);
    baseDmg *= comboMult;

    // Critical roll
    const isCrit = Math.random() < stats.crit;
    if (isCrit) {
      baseDmg *= stats.critD;
    }

    baseDmg = Math.round(baseDmg);
    shardYield = Math.round(shardYield * stats.shardMult);

    // Add resonance gauge
    const resAdd = (type === 'gold' ? 12 : (type === 'purple' ? 7 : 4)) * stats.resMultiplier;
    this.state.resonance = Math.min(this.state.resonanceMax, this.state.resonance + resAdd);

    // Add memory shards
    this.state.memoryShards += shardYield;

    // Particle Burst
    const burstColor = type === 'gold' ? '#fde047' : (type === 'purple' ? '#c084fc' : '#38bdf8');
    if (this.visualizer) {
      this.visualizer.createBurst(clientX, clientY, burstColor, type === 'gold' ? 35 : 20);
    }

    // Boss damage deal & float number
    this.dealDamage(baseDmg, isCrit, clientX, clientY);

    // Pop element animation
    orbEl.remove();

    // Update UI
    this.renderHeader();
    this.renderResonance();
    this.updateUpgradesAvailability();
  }

  dealDamage(amount, isCrit, clientX, clientY) {
    this.state.bossHp = Math.max(0, this.state.bossHp - amount);
    soundEngine.playHitSound(isCrit);

    // Hit reaction on boss avatar
    const bossCard = document.querySelector('.boss-card');
    if (bossCard) {
      bossCard.classList.remove('hit');
      void bossCard.offsetWidth; // trigger reflow
      bossCard.classList.add('hit');
      setTimeout(() => bossCard.classList.remove('hit'), 200);
    }

    // Floating text
    this.showDamagePop(amount, isCrit, clientX, clientY);
    this.renderBoss();

    // Check boss defeat / Transcendence
    if (this.state.bossHp <= 0) {
      this.handleBossDefeat();
    }
  }

  showDamagePop(amount, isCrit, x, y) {
    const pop = document.createElement('div');
    pop.className = `damage-pop ${isCrit ? 'crit' : ''}`;
    pop.textContent = isCrit ? `CRIT! -${amount}` : `-${amount}`;
    pop.style.left = `${x - 20 + (Math.random() * 30 - 15)}px`;
    pop.style.top = `${y - 30}px`;

    this.dom.floatLayer.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  // Passive damage & cooldown tick
  startPassiveLoop() {
    this.passiveDamageTimer = setInterval(() => {
      if (document.hidden) return;
      const stats = this.state.calcStats();
      if (stats.auto > 0 && this.state.bossHp > 0) {
        this.state.bossHp = Math.max(0, this.state.bossHp - stats.auto);
        this.renderBoss();
        if (this.state.bossHp <= 0) {
          this.handleBossDefeat();
        }
      }
      this.updateSkillCooldowns();
    }, 1000);
  }

  // Skills Implementation
  useSkillReversal() {
    const now = Date.now();
    const sk = this.state.skills.reversal;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    sk.activeUntil = now + 6000; // 6s duration

    soundEngine.playGlassTone(880, 0.1, 0.8);
    this.dom.skillReversal.classList.add('active');
    setTimeout(() => this.dom.skillReversal.classList.remove('active'), 6000);

    this.updateSkillCooldowns();
  }

  useSkillCrystallize() {
    const now = Date.now();
    const sk = this.state.skills.crystallize;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    soundEngine.playGlassTone(1200, 0.12, 1.2);

    // Pop all orbs on the screen simultaneously!
    const orbs = Array.from(document.querySelectorAll('.ephemera-orb'));
    orbs.forEach((orb, idx) => {
      setTimeout(() => {
        const rect = orb.getBoundingClientRect();
        this.handleOrbPop(orb, 'gold', rect.left + rect.width / 2, rect.top + rect.height / 2);
      }, idx * 60);
    });

    this.updateSkillCooldowns();
  }

  useSkillBurst() {
    if (this.state.resonance < this.state.resonanceMax) return;
    this.state.resonance = 0;
    this.renderResonance();

    soundEngine.playBurstFanfare();

    // Epic Burst Damage: 40% of Boss Max HP
    const stats = this.state.calcStats();
    let burstDmg = Math.round(this.state.bossMaxHp * 0.4);
    if (this.state.relics[3].unlocked) { // mirror buff
      burstDmg *= 2;
    }

    const rect = this.dom.bossAvatar.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    this.dealDamage(burstDmg, true, cx, cy);

    // Confetti celebration
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.3 },
      colors: ['#38bdf8', '#c084fc', '#fde047']
    });

    if (this.visualizer) {
      this.visualizer.createBurst(cx, cy, '#fde047', 60);
    }
  }

  updateSkillCooldowns() {
    const now = Date.now();
    // Reversal CD
    const rev = this.state.skills.reversal;
    const revPassed = now - rev.lastUsed;
    if (revPassed < rev.cd) {
      const pct = 100 - (revPassed / rev.cd) * 100;
      this.dom.skillReversalCd.style.height = `${pct}%`;
      this.dom.skillReversal.disabled = true;
    } else {
      this.dom.skillReversalCd.style.height = '0%';
      this.dom.skillReversal.disabled = false;
    }

    // Crystallize CD
    const cry = this.state.skills.crystallize;
    const cryPassed = now - cry.lastUsed;
    if (cryPassed < cry.cd) {
      const pct = 100 - (cryPassed / cry.cd) * 100;
      this.dom.skillCrystallizeCd.style.height = `${pct}%`;
      this.dom.skillCrystallize.disabled = true;
    } else {
      this.dom.skillCrystallizeCd.style.height = '0%';
      this.dom.skillCrystallize.disabled = false;
    }

    // Burst Button State
    this.dom.skillBurst.disabled = (this.state.resonance < this.state.resonanceMax);
  }

  handleBossDefeat() {
    const bossData = this.state.bosses[(this.state.depth - 1) % this.state.bosses.length];
    const reward = Math.round(bossData.reward * Math.pow(1.3, this.state.depth - 1));
    this.state.memoryShards += reward;

    confetti({
      particleCount: 100,
      spread: 90,
      origin: { y: 0.4 },
      colors: ['#38bdf8', '#a855f7', '#fbbf24']
    });

    // Check unlocks
    this.state.relics.forEach(r => {
      if (r.reqDepth && this.state.depth + 1 >= r.reqDepth) {
        r.unlocked = true;
      }
    });

    this.state.lore.forEach(l => {
      if (this.state.depth + 1 >= l.depth) {
        l.unlocked = true;
      }
    });

    this.state.save();

    // Show Victory Modal
    this.dom.victoryTitle.textContent = `調律完了：深度 ${this.state.depth}m`;
    this.dom.victoryDesc.textContent = `「${bossData.name}」の残響は光の雨となり、あなたの魂に新たな祈りを遺しました。`;
    this.dom.victoryReward.textContent = `+${reward} 💎 記憶の雫`;
    this.dom.victoryModal.classList.remove('hidden');
  }

  advanceToNextDepth() {
    this.dom.victoryModal.classList.add('hidden');
    this.state.depth++;
    this.state.spiritLevel = Math.floor(this.state.depth * 1.5);
    this.state.setupBossForDepth();
    this.state.save();

    this.renderHeader();
    this.renderBoss();
    this.renderRelics();
    this.renderLore();

    // Show special narrative on key depths
    if (this.state.depth === 2) {
      this.showStoryModal(
        '薄暗がりの声',
        '/assets/character_echo.png',
        '「お前もまた、消えゆく記憶の幻影を追う者か……。立ち去れ、この先は永遠の沈黙が満ちている」'
      );
    } else if (this.state.depth === 3) {
      this.showStoryModal(
        'ステラ・ルミナス',
        '/assets/character_boss2.png',
        '「壊れた硝子のように美しい痛みを……あなたと分け合いましょう。終わりゆく世界へようこそ……」'
      );
    }
  }

  showStoryModal(speaker, avatar, text) {
    this.dom.modalSpeaker.textContent = speaker;
    this.dom.modalCharImg.src = avatar;
    this.dom.modalDialogue.textContent = text;
    this.dom.storyModal.classList.remove('hidden');
  }

  renderHeader() {
    this.dom.shardsCount.textContent = this.state.memoryShards.toLocaleString();
    this.dom.spiritLevel.textContent = `Lv.${this.state.spiritLevel}`;
  }

  renderBoss() {
    const bossData = this.state.bosses[(this.state.depth - 1) % this.state.bosses.length];
    this.dom.bossName.textContent = bossData.name;
    this.dom.bossTitle.textContent = bossData.title;
    this.dom.bossAvatar.src = bossData.avatar;
    this.dom.currentDepth.textContent = `深度: ${this.state.depth}.0m`;

    this.dom.bossHpText.textContent = `${Math.ceil(this.state.bossHp).toLocaleString()} / ${this.state.bossMaxHp.toLocaleString()}`;
    const pct = Math.max(0, Math.min(100, (this.state.bossHp / this.state.bossMaxHp) * 100));
    this.dom.bossHpFill.style.width = `${pct}%`;
  }

  renderResonance() {
    const pct = Math.round((this.state.resonance / this.state.resonanceMax) * 100);
    this.dom.resonancePct.textContent = `${pct}%`;
    this.dom.resonanceFill.style.width = `${pct}%`;
    this.updateSkillCooldowns();
  }

  renderUpgrades() {
    const list = this.dom.upgradesList;
    list.innerHTML = '';

    for (let key in this.state.upgrades) {
      const upg = this.state.upgrades[key];
      const card = document.createElement('div');
      card.className = 'upgrade-card';
      card.innerHTML = `
        <div class="upgrade-left">
          <div class="upgrade-icon-box">${upg.icon}</div>
          <div>
            <div class="upgrade-title">${upg.name}</div>
            <div class="upgrade-desc">${upg.desc}</div>
            <div class="upgrade-lvl">強化段階: Lv.${upg.lvl}</div>
          </div>
        </div>
        <button class="btn-buy-upgrade" data-id="${upg.id}">
          <span>強化</span>
          <span>${upg.cost} 💎</span>
        </button>
      `;

      const btn = card.querySelector('.btn-buy-upgrade');
      btn.addEventListener('click', () => this.buyUpgrade(upg.id));
      list.appendChild(card);
    }
    this.updateUpgradesAvailability();
  }

  updateUpgradesAvailability() {
    for (let key in this.state.upgrades) {
      const upg = this.state.upgrades[key];
      const btn = document.querySelector(`.btn-buy-upgrade[data-id="${upg.id}"]`);
      if (btn) {
        btn.disabled = this.state.memoryShards < upg.cost;
      }
    }
  }

  buyUpgrade(id) {
    const upg = this.state.upgrades[id];
    if (this.state.memoryShards >= upg.cost) {
      this.state.memoryShards -= upg.cost;
      upg.lvl++;
      upg.cost = Math.round(upg.cost * upg.mult);
      soundEngine.playUpgradeSound();

      this.renderHeader();
      this.renderUpgrades();
      this.state.save();
    }
  }

  renderRelics() {
    const list = this.dom.relicsList;
    list.innerHTML = '';

    this.state.relics.forEach(r => {
      const card = document.createElement('div');
      card.className = `relic-card ${r.unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="relic-icon">${r.icon}</div>
        <div class="relic-name">${r.unlocked ? r.name : '封印された遺物'}</div>
        <div class="relic-effect">${r.unlocked ? r.effect : `深度 ${r.reqDepth}m 到達で解放`}</div>
        <div class="relic-lore">${r.unlocked ? r.lore : '未だ光を見出せぬ世界の残滓。'}</div>
      `;
      list.appendChild(card);
    });
  }

  renderLore() {
    const list = this.dom.loreContainer;
    list.innerHTML = '';

    this.state.lore.forEach(l => {
      const card = document.createElement('div');
      card.className = `lore-card ${l.unlocked ? '' : 'locked'}`;
      card.innerHTML = `
        <div class="lore-card-header">
          <span>${l.unlocked ? l.title : '封印された記憶'}</span>
          <span>深度: ${l.depth}m</span>
        </div>
        <div class="lore-text">${l.unlocked ? l.text : 'まだ記憶は閉ざされている……より深き階層へ進むことで紐解かれる。'}</div>
      `;
      list.appendChild(card);
    });
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new EphemereGame();
  game.init();
  window.__EPHEMERE__ = game;
});
