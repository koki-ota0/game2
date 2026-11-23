import { GameState } from './state.js';
import { soundEngine } from './sound.js';
import { AmbientVisualizer } from './ambient.js';
import { GameRecorder } from './recorder.js';
import { RingFieldEngine } from './ring_field.js';
import confetti from 'canvas-confetti';

class EphemereGame {
  constructor() {
    this.state = new GameState();
    this.visualizer = null;
    this.recorder = null;
    this.ringEngine = null;
    this.dom = {};

    this.bossTimerInterval = null;
  }

  init() {
    this.state.load();
    this.cacheDom();
    this.bindEvents();
    this.renderHeader();
    this.renderBoss();
    this.renderTranscendence();
    this.renderUpgrades();
    this.renderRelics();

    // Mount Concentric Astral Dial Field
    const dialCanvas = document.getElementById('dial-canvas');
    const astralArena = document.getElementById('astral-arena');
    if (dialCanvas && astralArena) {
      this.ringEngine = new RingFieldEngine(
        dialCanvas,
        astralArena,
        (result) => this.handleRingChainResolved(result),
        (count, isClosed, color) => this.handleRingComboStep(count, isClosed, color)
      );
    }

    // Setup ambient background visualizer
    const ambCanvas = document.getElementById('ambient-canvas');
    if (ambCanvas) {
      this.visualizer = new AmbientVisualizer(ambCanvas);
    }

    // Mount recorder UI
    this.recorder = new GameRecorder(document.getElementById('app-container'));
    this.recorder.mountUI();

    // Boss Countdown Loop
    this.startBossTimer();

    // Initial Story modal
    if (this.state.depth === 1 && this.state.memoryShards === 0) {
      this.showStoryModal(
        'ラピス',
        '/assets/character_lapis.png',
        '「旅人さん……目を覚まして。\n天球に浮かぶ同心円の軌道をなぞり、星脈を紡いでください。\n星々を一周させて環を閉じると、【日蝕解放（COSMIC ECLIPSE）】が巻き起こります……」'
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
      bossAttackTimer: document.getElementById('boss-attack-timer'),
      bossAttackFill: document.getElementById('boss-attack-fill'),
      resonancePct: document.getElementById('resonance-pct'),
      resonanceFill: document.getElementById('resonance-fill'),
      chainIndicator: document.getElementById('chain-indicator'),
      chainCount: document.getElementById('chain-count'),
      loopBadge: document.getElementById('loop-badge'),
      floatLayer: document.getElementById('float-damage-layer'),
      cutinLayer: document.getElementById('cutin-layer'),
      transcendenceGainVal: document.getElementById('transcendence-gain-val'),
      transcendenceOwnedVal: document.getElementById('transcendence-owned-val'),
      btnDoTranscendence: document.getElementById('btn-do-transcendence'),
      transcendenceTree: document.getElementById('transcendence-tree'),
      upgradesList: document.getElementById('upgrades-list'),
      relicsList: document.getElementById('relics-list'),
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
      btnReset: document.getElementById('btn-reset'),
      skillReversal: document.getElementById('skill-reversal'),
      skillAlign: document.getElementById('skill-align'),
      skillBurst: document.getElementById('skill-burst'),
      skillReversalCd: document.getElementById('skill-reversal-cd'),
      skillCrystallizeCd: document.getElementById('skill-crystallize-cd')
    };
  }

  bindEvents() {
    document.querySelectorAll('.nav-item').forEach(button => {
      button.addEventListener('click', () => {
        document.querySelectorAll('.nav-item').forEach(b => b.classList.remove('active'));
        document.querySelectorAll('.tab-screen').forEach(t => t.classList.remove('active'));
        button.classList.add('active');
        const tabId = button.getAttribute('data-tab');
        const screen = document.getElementById(tabId);
        if (screen) screen.classList.add('active');
        soundEngine.init();
        if (tabId === 'tab-transcendence') {
          this.renderTranscendence();
        }
      });
    });

    this.dom.btnSoundToggle.addEventListener('click', () => {
      const enabled = soundEngine.toggle();
      this.dom.soundIcon.textContent = enabled ? '🔊' : '🔇';
    });

    this.dom.btnReset.addEventListener('click', () => {
      if (confirm('記憶をすべて手放し、最初の黄昏へと還りますか？')) {
        this.state.reset();
      }
    });

    this.dom.btnModalNext.addEventListener('click', () => {
      this.dom.storyModal.classList.add('hidden');
      soundEngine.startAmbientMusic();
    });

    this.dom.btnNextDepth.addEventListener('click', () => {
      this.advanceToNextDepth();
    });

    // Transcendence button
    this.dom.btnDoTranscendence.addEventListener('click', () => {
      const gain = this.state.calcTranscendenceGain();
      if (confirm(`世界を再誕させ、${gain} 個の「昇華の星種⭐」を受け取りますか？（現在の階層と雫はリセットされますが、永続強化が手に入ります）`)) {
        this.state.doTranscendence();
        soundEngine.playBurstFanfare();
        this.renderHeader();
        this.renderBoss();
        this.renderTranscendence();
        this.renderUpgrades();
        document.querySelector('[data-tab="tab-battle"]').click();
      }
    });

    // Skills
    this.dom.skillReversal.addEventListener('click', () => this.useSkillReversal());
    this.dom.skillAlign.addEventListener('click', () => this.useSkillAlign());
    this.dom.skillBurst.addEventListener('click', () => this.useSkillBurst());
  }

  handleRingComboStep(count, isClosed, color) {
    if (count > 1) {
      this.dom.chainIndicator.classList.add('visible');
      this.dom.chainCount.textContent = count;
      if (isClosed) {
        this.dom.loopBadge.classList.add('active');
      } else {
        this.dom.loopBadge.classList.remove('active');
      }
    } else {
      this.dom.chainIndicator.classList.remove('visible');
    }
  }

  handleRingChainResolved({ count, isClosed, color, nodes }) {
    const stats = this.state.calcStats();
    let damage = stats.baseDmg * count * Math.pow(stats.chainPow, count - 1);
    let shardReward = Math.round(count * 3.0 * stats.shardMult);

    if (isClosed) {
      damage *= stats.loopPow;
      shardReward *= 2.5;
      this.state.bossAttackTimer = Math.min(this.state.bossAttackMax, this.state.bossAttackTimer + 4.5);
    }

    damage = Math.round(damage);
    shardReward = Math.round(shardReward);

    const resAdd = (count * 5 + (isClosed ? 20 : 0)) * (1 + (this.state.upgrades.tapPower.lvl - 1) * 0.1);
    this.state.resonance = Math.min(this.state.resonanceMax, this.state.resonance + resAdd);

    this.state.memoryShards += shardReward;

    const midNode = nodes[Math.floor(nodes.length / 2)];
    const arenaRect = document.getElementById('astral-arena').getBoundingClientRect();
    this.dealDamage(damage, isClosed, arenaRect.left + midNode.x, arenaRect.top + midNode.y, isClosed);

    if (this.visualizer) {
      nodes.forEach(n => {
        this.visualizer.createBurst(arenaRect.left + n.x, arenaRect.top + n.y, '#38bdf8', 12);
      });
    }

    this.dom.chainIndicator.classList.remove('visible');
    this.dom.loopBadge.classList.remove('active');
    this.renderHeader();
    this.renderResonance();
    this.updateUpgradesAvailability();
  }

  startBossTimer() {
    clearInterval(this.bossTimerInterval);
    this.bossTimerInterval = setInterval(() => {
      if (document.hidden) return;
      this.state.bossAttackTimer -= 0.1;

      if (this.state.bossAttackTimer <= 2.0 && this.state.bossAttackTimer > 1.8) {
        soundEngine.playWarningDrone();
      }

      if (this.state.bossAttackTimer <= 0) {
        this.triggerBossOblivionWave();
        this.state.bossAttackTimer = this.state.bossAttackMax;
      }

      this.renderBoss();
      this.updateSkillCooldowns();
    }, 100);
  }

  triggerBossOblivionWave() {
    soundEngine.playHitSound(true);

    const arena = document.getElementById('astral-arena');
    if (arena) {
      arena.style.animation = 'shake 0.4s both';
      setTimeout(() => arena.style.animation = '', 400);
    }

    const lostShards = Math.min(this.state.memoryShards, Math.round(15 + this.state.depth * 8));
    this.state.memoryShards -= lostShards;
    this.state.resonance = Math.max(0, this.state.resonance - 25);

    const rect = this.dom.bossAvatar.getBoundingClientRect();
    this.showDamagePop(`忘却波: -${lostShards}💎`, true, rect.left + rect.width / 2, rect.top + rect.height / 2, true);

    this.renderHeader();
    this.renderResonance();
  }

  dealDamage(amount, isCrit, clientX, clientY, isSupernova = false) {
    this.state.bossHp = Math.max(0, this.state.bossHp - amount);
    soundEngine.playHitSound(isCrit);

    const card = document.getElementById('boss-card');
    if (card) {
      card.classList.remove('hit');
      void card.offsetWidth;
      card.classList.add('hit');
      setTimeout(() => card.classList.remove('hit'), 250);
    }

    this.showDamagePop(amount, isCrit, clientX, clientY, isSupernova);
    this.renderBoss();

    if (this.state.bossHp <= 0) {
      this.handleBossDefeat();
    }
  }

  showDamagePop(text, isCrit, x, y, isSupernova = false) {
    const pop = document.createElement('div');
    pop.className = `damage-pop ${isCrit ? 'crit' : ''} ${isSupernova ? 'supernova' : ''}`;
    pop.textContent = typeof text === 'number' ? (isSupernova ? `ECLIPSE! -${text}` : (isCrit ? `CRIT! -${text}` : `-${text}`)) : text;
    pop.style.left = `${x - 30 + (Math.random() * 40 - 20)}px`;
    pop.style.top = `${y - 40}px`;

    this.dom.floatLayer.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  // Skills
  useSkillReversal() {
    const now = Date.now();
    const sk = this.state.skills.reversal;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    sk.activeUntil = now + 6000;

    soundEngine.playGlassTone(880, 0.1, 0.8);
    this.dom.skillReversal.classList.add('active');

    setTimeout(() => {
      this.dom.skillReversal.classList.remove('active');
    }, 6000);

    this.updateSkillCooldowns();
  }

  useSkillAlign() {
    const now = Date.now();
    const sk = this.state.skills.crystallize;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    soundEngine.playGlassTone(1200, 0.12, 1.2);

    if (this.ringEngine) {
      this.ringEngine.rotateRing(1, Math.PI / 4);
      this.ringEngine.rotateRing(2, -Math.PI / 6);
    }

    this.updateSkillCooldowns();
  }

  useSkillBurst() {
    if (this.state.resonance < this.state.resonanceMax) return;
    this.state.resonance = 0;
    this.renderResonance();

    soundEngine.playBurstFanfare();

    this.dom.cutinLayer.classList.remove('hidden');
    setTimeout(() => {
      this.dom.cutinLayer.classList.add('hidden');
    }, 1800);

    let burstDmg = Math.round(this.state.bossMaxHp * 0.55);
    if (this.state.relics[3].unlocked) burstDmg *= 2;

    const rect = this.dom.bossAvatar.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    this.dealDamage(burstDmg, true, cx, cy, true);

    confetti({
      particleCount: 140,
      spread: 85,
      origin: { y: 0.35 },
      colors: ['#38bdf8', '#c084fc', '#fde047', '#2dd4bf']
    });

    if (this.visualizer) {
      this.visualizer.createBurst(cx, cy, '#fde047', 80);
    }
  }

  updateSkillCooldowns() {
    const now = Date.now();
    const rev = this.state.skills.reversal;
    const revPassed = now - rev.lastUsed;
    if (revPassed < rev.cd) {
      this.dom.skillReversalCd.style.height = `${100 - (revPassed / rev.cd) * 100}%`;
      this.dom.skillReversal.disabled = true;
    } else {
      this.dom.skillReversalCd.style.height = '0%';
      this.dom.skillReversal.disabled = false;
    }

    const cry = this.state.skills.crystallize;
    const cryPassed = now - cry.lastUsed;
    if (cryPassed < cry.cd) {
      this.dom.skillCrystallizeCd.style.height = `${100 - (cryPassed / cry.cd) * 100}%`;
      this.dom.skillAlign.disabled = true;
    } else {
      this.dom.skillCrystallizeCd.style.height = '0%';
      this.dom.skillAlign.disabled = false;
    }

    this.dom.skillBurst.disabled = (this.state.resonance < this.state.resonanceMax);
  }

  handleBossDefeat() {
    const bossData = this.state.bosses[(this.state.depth - 1) % this.state.bosses.length];
    const reward = Math.round(bossData.reward * Math.pow(1.35, this.state.depth - 1));
    this.state.memoryShards += reward;

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.4 },
      colors: ['#38bdf8', '#a855f7', '#fbbf24', '#2dd4bf']
    });

    this.state.relics.forEach(r => {
      if (r.reqDepth && this.state.depth + 1 >= r.reqDepth) {
        r.unlocked = true;
      }
    });

    this.state.save();

    this.dom.victoryTitle.textContent = `星盤調律完了：深度 ${this.state.depth}m`;
    this.dom.victoryDesc.textContent = `「${bossData.name}」の忘却は解かれ、光の記憶となって心に宿りました。`;
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
    if (this.ringEngine) {
      this.ringEngine.spawnAllNodes();
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
    const hpPct = Math.max(0, Math.min(100, (this.state.bossHp / this.state.bossMaxHp) * 100));
    this.dom.bossHpFill.style.width = `${hpPct}%`;

    this.dom.bossAttackTimer.textContent = `${Math.max(0, this.state.bossAttackTimer).toFixed(1)}s`;
    const attackPct = Math.max(0, Math.min(100, (1 - this.state.bossAttackTimer / this.state.bossAttackMax) * 100));
    this.dom.bossAttackFill.style.width = `${attackPct}%`;
  }

  renderResonance() {
    const pct = Math.round((this.state.resonance / this.state.resonanceMax) * 100);
    this.dom.resonancePct.textContent = `${pct}%`;
    this.dom.resonanceFill.style.width = `${pct}%`;
    this.updateSkillCooldowns();
  }

  renderTranscendence() {
    const gain = this.state.calcTranscendenceGain();
    this.dom.transcendenceGainVal.textContent = `+${gain} ⭐`;
    this.dom.transcendenceOwnedVal.textContent = `${this.state.astralSeeds} ⭐`;

    const tree = this.dom.transcendenceTree;
    tree.innerHTML = '';

    for (let k in this.state.perks) {
      const perk = this.state.perks[k];
      const card = document.createElement('div');
      card.className = 'perk-card';
      card.innerHTML = `
        <div class="perk-left">
          <div class="perk-icon">${perk.icon}</div>
          <div>
            <div class="perk-title">${perk.name}</div>
            <div class="perk-desc">${perk.desc}</div>
            <div class="perk-lvl">習得ランク: Rank ${perk.lvl}</div>
          </div>
        </div>
        <button class="btn-buy-perk" data-id="${perk.id}">
          <span>習得</span>
          <span>${perk.cost} ⭐</span>
        </button>
      `;

      const btn = card.querySelector('.btn-buy-perk');
      btn.disabled = this.state.astralSeeds < perk.cost;
      btn.addEventListener('click', () => {
        if (this.state.astralSeeds >= perk.cost) {
          this.state.astralSeeds -= perk.cost;
          perk.lvl++;
          perk.cost = Math.round(perk.cost * 1.8);
          soundEngine.playUpgradeSound();
          this.renderTranscendence();
          this.state.save();
        }
      });
      tree.appendChild(card);
    }
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

      card.querySelector('.btn-buy-upgrade').addEventListener('click', () => this.buyUpgrade(upg.id));
      list.appendChild(card);
    }
    this.updateUpgradesAvailability();
  }

  updateUpgradesAvailability() {
    for (let key in this.state.upgrades) {
      const upg = this.state.upgrades[key];
      const btn = document.querySelector(`.btn-buy-upgrade[data-id="${upg.id}"]`);
      if (btn) btn.disabled = this.state.memoryShards < upg.cost;
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
}

window.addEventListener('DOMContentLoaded', () => {
  const game = new EphemereGame();
  game.init();
  window.__EPHEMERE__ = game;
});


  init() {
    this.state.load();
    this.cacheDom();
    this.bindEvents();
    this.initCanvas();
    this.renderHeader();
    this.renderBoss();
    this.renderUpgrades();
    this.renderRelics();
    this.renderLore();

    // Spawn initial constellation grid
    this.initConstellationGrid();

    // Setup ambient particle visualizer
    const ambCanvas = document.getElementById('ambient-canvas');
    if (ambCanvas) {
      this.visualizer = new AmbientVisualizer(ambCanvas);
    }

    // Mount in-game quick recorder UI
    this.recorder = new GameRecorder(document.getElementById('app-container'));
    this.recorder.mountUI();

    // Start Boss Attack Countdown
    this.startBossTimer();

    // Initial Story modal on new start
    if (this.state.depth === 1 && this.state.memoryShards === 0) {
      this.showStoryModal(
        'ラピス',
        '/assets/character_lapis.png',
        '「旅人さん……目を覚まして。\n空に浮かぶ想いの星を指先でなぞり、星座（星脈）を紡いでください。\n星々を一周させて輪を作ると、神秘の星脈解放が巻き起こります……」'
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
      bossAttackTimer: document.getElementById('boss-attack-timer'),
      bossAttackFill: document.getElementById('boss-attack-fill'),
      resonancePct: document.getElementById('resonance-pct'),
      resonanceFill: document.getElementById('resonance-fill'),
      constellationArena: document.getElementById('constellation-arena'),
      nodesContainer: document.getElementById('nodes-container'),
      chainIndicator: document.getElementById('chain-indicator'),
      chainCount: document.getElementById('chain-count'),
      loopBadge: document.getElementById('loop-badge'),
      floatLayer: document.getElementById('float-damage-layer'),
      cutinLayer: document.getElementById('cutin-layer'),
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

  initCanvas() {
    this.lineCanvas = document.getElementById('line-canvas');
    if (!this.lineCanvas) return;
    this.lineCtx = this.lineCanvas.getContext('2d');
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  resizeCanvas() {
    if (!this.lineCanvas) return;
    const arena = this.dom.constellationArena;
    this.lineCanvas.width = arena.clientWidth;
    this.lineCanvas.height = arena.clientHeight;
  }

  bindEvents() {
    // Navigation
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

    // Reset
    this.dom.btnReset.addEventListener('click', () => {
      if (confirm('記憶をすべて手放し、最初の黄昏へと還りますか？（リセット）')) {
        this.state.reset();
      }
    });

    // Lore shortcut
    this.dom.btnLore.addEventListener('click', () => {
      const loreNav = document.querySelector('[data-tab="tab-records"]');
      if (loreNav) loreNav.click();
    });

    // Modal dismiss
    this.dom.btnModalNext.addEventListener('click', () => {
      this.dom.storyModal.classList.add('hidden');
      soundEngine.startAmbientMusic();
    });

    // Victory next depth
    this.dom.btnNextDepth.addEventListener('click', () => {
      this.advanceToNextDepth();
    });

    // Skills
    this.dom.skillReversal.addEventListener('click', () => this.useSkillReversal());
    this.dom.skillCrystallize.addEventListener('click', () => this.useSkillCrystallize());
    this.dom.skillBurst.addEventListener('click', () => this.useSkillBurst());

    // Constellation Arena Pointer Drag Events (Touch & Mouse unified)
    const arena = this.dom.constellationArena;
    arena.addEventListener('pointerdown', (e) => this.handlePointerDown(e));
    arena.addEventListener('pointermove', (e) => this.handlePointerMove(e));
    window.addEventListener('pointerup', (e) => this.handlePointerUp(e));
    window.addEventListener('pointercancel', (e) => this.handlePointerUp(e));
  }

  // ================= CONSTELLATION GRID GENERATION =================
  initConstellationGrid() {
    const container = this.dom.nodesContainer;
    container.innerHTML = '';
    this.nodes = [];

    const colors = ['cyan', 'purple', 'gold', 'emerald'];
    const runes = {
      cyan: '✧',
      purple: '✦',
      gold: '✹',
      emerald: '❖'
    };

    const rect = this.dom.constellationArena.getBoundingClientRect();
    const paddingX = 26;
    const paddingY = 44;
    const availWidth = (rect.width || 380) - paddingX * 2;
    const availHeight = (rect.height || 360) - paddingY * 2 - 50; // leave bottom space for skills

    const cellW = availWidth / (this.gridCols - 1);
    const cellH = availHeight / (this.gridRows - 1);

    for (let r = 0; r < this.gridRows; r++) {
      for (let c = 0; c < this.gridCols; c++) {
        const color = colors[Math.floor(Math.random() * colors.length)];
        const x = paddingX + c * cellW;
        const y = paddingY + r * cellH;

        const el = document.createElement('div');
        el.className = `stellar-node color-${color}`;
        el.dataset.row = r;
        el.dataset.col = c;
        el.dataset.color = color;

        const size = 36;
        el.style.width = `${size}px`;
        el.style.height = `${size}px`;
        el.style.left = `${x - size / 2}px`;
        el.style.top = `${y - size / 2}px`;

        el.innerHTML = `
          <div class="node-inner">
            <span class="node-rune">${runes[color]}</span>
          </div>
        `;

        container.appendChild(el);

        this.nodes.push({
          row: r,
          col: c,
          color: color,
          x: x,
          y: y,
          el: el
        });
      }
    }
  }

  // ================= DRAG & LINK PUZZLE MECHANIC =================
  getNodeAtPosition(x, y) {
    const threshold = 26; // touch radius in px
    for (const node of this.nodes) {
      const dx = node.x - x;
      const dy = node.y - y;
      if (Math.hypot(dx, dy) < threshold) {
        return node;
      }
    }
    return null;
  }

  areNodesAdjacent(n1, n2) {
    const dr = Math.abs(n1.row - n2.row);
    const dc = Math.abs(n1.col - n2.col);
    // 8-directional linking (horizontal, vertical, diagonal)
    return (dr <= 1 && dc <= 1) && !(dr === 0 && dc === 0);
  }

  handlePointerDown(e) {
    soundEngine.init();
    soundEngine.startAmbientMusic();

    const rect = this.dom.constellationArena.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const node = this.getNodeAtPosition(x, y);
    if (!node) return;

    this.isDragging = true;
    this.activeChain = [node];
    this.currentColor = node.color;
    this.isLoopFormed = false;

    node.el.classList.add('selected');
    soundEngine.playNodeLink(0, 1);

    this.updateChainHUD();
    this.drawConstellationLines(x, y);
  }

  handlePointerMove(e) {
    if (!this.isDragging || this.activeChain.length === 0) return;

    const rect = this.dom.constellationArena.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const hovered = this.getNodeAtPosition(x, y);
    const isOmniColor = Date.now() < this.state.skills.reversal.activeUntil;

    if (hovered) {
      const last = this.activeChain[this.activeChain.length - 1];

      // Check undo if dragging back to previous node
      if (this.activeChain.length >= 2 && hovered === this.activeChain[this.activeChain.length - 2]) {
        const removed = this.activeChain.pop();
        removed.el.classList.remove('selected');
        this.isLoopFormed = false;
        soundEngine.playNodeLink(this.activeChain.length - 1, this.activeChain.length);
        this.updateChainHUD();
      }
      // Check Loop Formation (linking back to 1st node after at least 4 nodes)
      else if (hovered === this.activeChain[0] && this.activeChain.length >= 4 && !this.isLoopFormed) {
        this.isLoopFormed = true;
        soundEngine.playNodeLink(this.activeChain.length, this.activeChain.length + 2);
        this.updateChainHUD();
      }
      // Check Valid Next Node: same color (or omni mode), adjacent, not already visited
      else if (!this.activeChain.includes(hovered) && this.areNodesAdjacent(last, hovered)) {
        if (hovered.color === this.currentColor || isOmniColor) {
          this.activeChain.push(hovered);
          hovered.el.classList.add('selected');

          soundEngine.playNodeLink(this.activeChain.length - 1, this.activeChain.length);

          if (this.visualizer) {
            this.visualizer.createBurst(e.clientX, e.clientY, this.getColorHex(hovered.color), 8);
          }

          this.updateChainHUD();
        }
      }
    }

    this.drawConstellationLines(x, y);
  }

  handlePointerUp(e) {
    if (!this.isDragging) return;
    this.isDragging = false;

    const count = this.activeChain.length;

    if (count >= 3 || (this.isLoopFormed && count >= 4)) {
      this.resolveChain();
    } else {
      // Cancelled short chain
      this.clearChainState();
    }
  }

  clearChainState() {
    this.activeChain.forEach(n => n.el.classList.remove('selected'));
    this.activeChain = [];
    this.isLoopFormed = false;
    this.dom.chainIndicator.classList.remove('visible');
    this.dom.loopBadge.classList.remove('active');
    this.clearLines();
  }

  drawConstellationLines(cursorX = null, cursorY = null) {
    if (!this.lineCtx) return;
    this.clearLines();

    if (this.activeChain.length === 0) return;

    this.lineCtx.save();
    const colorHex = this.getColorHex(this.currentColor);

    // Glow effect
    this.lineCtx.strokeStyle = this.isLoopFormed ? '#f43f5e' : colorHex;
    this.lineCtx.lineWidth = this.isLoopFormed ? 4.5 : 3.5;
    this.lineCtx.lineCap = 'round';
    this.lineCtx.lineJoin = 'round';
    this.lineCtx.shadowBlur = 14;
    this.lineCtx.shadowColor = this.isLoopFormed ? '#f43f5e' : colorHex;

    this.lineCtx.beginPath();
    this.activeChain.forEach((n, idx) => {
      if (idx === 0) this.lineCtx.moveTo(n.x, n.y);
      else this.lineCtx.lineTo(n.x, n.y);
    });

    if (this.isLoopFormed && this.activeChain.length > 0) {
      this.lineCtx.lineTo(this.activeChain[0].x, this.activeChain[0].y);
    } else if (cursorX !== null && cursorY !== null && this.isDragging) {
      this.lineCtx.lineTo(cursorX, cursorY);
    }

    this.lineCtx.stroke();
    this.lineCtx.restore();
  }

  clearLines() {
    if (this.lineCtx && this.lineCanvas) {
      this.lineCtx.clearRect(0, 0, this.lineCanvas.width, this.lineCanvas.height);
    }
  }

  getColorHex(color) {
    const map = {
      cyan: '#38bdf8',
      purple: '#a855f7',
      gold: '#fbbf24',
      emerald: '#2dd4bf'
    };
    return map[color] || '#38bdf8';
  }

  updateChainHUD() {
    const count = this.activeChain.length;
    if (count > 1) {
      this.dom.chainIndicator.classList.add('visible');
      this.dom.chainCount.textContent = count;
      if (this.isLoopFormed) {
        this.dom.loopBadge.classList.add('active');
      } else {
        this.dom.loopBadge.classList.remove('active');
      }
    } else {
      this.dom.chainIndicator.classList.remove('visible');
    }
  }

  // ================= RESOLVE CONSTELLATION LINK =================
  resolveChain() {
    const count = this.activeChain.length;
    const isLoop = this.isLoopFormed;
    const stats = this.state.calcStats();

    soundEngine.playChainComplete(count, isLoop);

    // Calculate dynamic damage
    let damage = stats.baseDmg * count * Math.pow(stats.chainPow, count - 1);
    let shardReward = Math.round(count * 2.5 * stats.shardMult);

    if (isLoop) {
      damage *= stats.loopPow;
      shardReward *= 2.5;

      // Reset boss attack timer as reward for closing a loop!
      this.state.bossAttackTimer = Math.min(this.state.bossAttackMax, this.state.bossAttackTimer + 4.0);
    }

    damage = Math.round(damage);
    shardReward = Math.round(shardReward);

    // Add resonance gauge
    const resAdd = (count * 4.5 + (isLoop ? 18 : 0)) * (1 + (this.state.upgrades.tapPower.lvl - 1) * 0.1);
    this.state.resonance = Math.min(this.state.resonanceMax, this.state.resonance + resAdd);

    this.state.memoryShards += shardReward;

    // Show center damage pop
    const last = this.activeChain[Math.floor(this.activeChain.length / 2)];
    const arenaRect = this.dom.constellationArena.getBoundingClientRect();
    this.dealDamage(damage, isLoop, arenaRect.left + last.x, arenaRect.top + last.y, isLoop);

    // Replace cleared nodes with fresh random stars
    const colors = ['cyan', 'purple', 'gold', 'emerald'];
    const runes = { cyan: '✧', purple: '✦', gold: '✹', emerald: '❖' };

    this.activeChain.forEach(n => {
      // Particle sparks
      if (this.visualizer) {
        this.visualizer.createBurst(arenaRect.left + n.x, arenaRect.top + n.y, this.getColorHex(n.color), 14);
      }

      // Animate replacement
      n.el.style.transform = 'scale(0)';
      setTimeout(() => {
        const newColor = colors[Math.floor(Math.random() * colors.length)];
        n.color = newColor;
        n.el.className = `stellar-node color-${newColor}`;
        n.el.dataset.color = newColor;
        n.el.querySelector('.node-rune').textContent = runes[newColor];
        n.el.style.transform = 'scale(1)';
      }, 220);
    });

    this.clearChainState();
    this.renderHeader();
    this.renderResonance();
    this.updateUpgradesAvailability();
  }

  // ================= BOSS COMBAT & COUNTDOWN =================
  startBossTimer() {
    clearInterval(this.bossTimerInterval);
    this.bossTimerInterval = setInterval(() => {
      if (document.hidden) return;
      this.state.bossAttackTimer -= 0.1;

      if (this.state.bossAttackTimer <= 2.0 && this.state.bossAttackTimer > 1.8) {
        soundEngine.playWarningDrone();
      }

      if (this.state.bossAttackTimer <= 0) {
        this.triggerBossOblivionWave();
        this.state.bossAttackTimer = this.state.bossAttackMax;
      }

      this.renderBoss();
      this.updateSkillCooldowns();
    }, 100);
  }

  // Boss attack penalty when countdown reaches 0
  triggerBossOblivionWave() {
    soundEngine.playHitSound(true);

    // Screen Shake & Distortion
    const arena = this.dom.constellationArena;
    arena.style.animation = 'shake 0.4s both';
    setTimeout(() => arena.style.animation = '', 400);

    // Penalty: boss absorbs a portion of player's memory shards and resonance
    const lostShards = Math.min(this.state.memoryShards, Math.round(15 + this.state.depth * 8));
    this.state.memoryShards -= lostShards;
    this.state.resonance = Math.max(0, this.state.resonance - 25);

    // Show warning damage pop
    const rect = this.dom.bossAvatar.getBoundingClientRect();
    this.showDamagePop(`忘却波: -${lostShards}💎`, true, rect.left + rect.width / 2, rect.top + rect.height / 2, true);

    this.renderHeader();
    this.renderResonance();
  }

  dealDamage(amount, isCrit, clientX, clientY, isSupernova = false) {
    this.state.bossHp = Math.max(0, this.state.bossHp - amount);
    soundEngine.playHitSound(isCrit);

    // Shake boss card
    const card = document.getElementById('boss-card');
    if (card) {
      card.classList.remove('hit');
      void card.offsetWidth;
      card.classList.add('hit');
      setTimeout(() => card.classList.remove('hit'), 250);
    }

    this.showDamagePop(amount, isCrit, clientX, clientY, isSupernova);
    this.renderBoss();

    if (this.state.bossHp <= 0) {
      this.handleBossDefeat();
    }
  }

  showDamagePop(text, isCrit, x, y, isSupernova = false) {
    const pop = document.createElement('div');
    pop.className = `damage-pop ${isCrit ? 'crit' : ''} ${isSupernova ? 'supernova' : ''}`;
    pop.textContent = typeof text === 'number' ? (isSupernova ? `SUPERNOVA! -${text}` : (isCrit ? `CRIT! -${text}` : `-${text}`)) : text;
    pop.style.left = `${x - 30 + (Math.random() * 40 - 20)}px`;
    pop.style.top = `${y - 40}px`;

    this.dom.floatLayer.appendChild(pop);
    setTimeout(() => pop.remove(), 900);
  }

  // ================= SKILLS & CUT-IN =================
  useSkillReversal() {
    const now = Date.now();
    const sk = this.state.skills.reversal;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    sk.activeUntil = now + 6000; // 6s duration

    soundEngine.playGlassTone(880, 0.1, 0.8);
    this.dom.skillReversal.classList.add('active');

    // Make all nodes glow gold visually during skill
    this.nodes.forEach(n => {
      n.el.style.filter = 'hue-rotate(90deg) brightness(1.3)';
    });

    setTimeout(() => {
      this.dom.skillReversal.classList.remove('active');
      this.nodes.forEach(n => n.el.style.filter = '');
    }, 6000);

    this.updateSkillCooldowns();
  }

  useSkillCrystallize() {
    const now = Date.now();
    const sk = this.state.skills.crystallize;
    if (now - sk.lastUsed < sk.cd) return;

    sk.lastUsed = now;
    soundEngine.playGlassTone(1200, 0.12, 1.2);

    // Re-shuffle all colors to optimize clusters
    const colors = ['cyan', 'purple', 'gold', 'emerald'];
    const runes = { cyan: '✧', purple: '✦', gold: '✹', emerald: '❖' };

    this.nodes.forEach((n, idx) => {
      n.el.style.transform = 'scale(0) rotate(180deg)';
      setTimeout(() => {
        // Group columns into same colors for easy huge chains
        const newColor = colors[n.col % colors.length];
        n.color = newColor;
        n.el.className = `stellar-node color-${newColor}`;
        n.el.dataset.color = newColor;
        n.el.querySelector('.node-rune').textContent = runes[newColor];
        n.el.style.transform = 'scale(1) rotate(0deg)';
      }, idx * 15);
    });

    this.updateSkillCooldowns();
  }

  useSkillBurst() {
    if (this.state.resonance < this.state.resonanceMax) return;
    this.state.resonance = 0;
    this.renderResonance();

    soundEngine.playBurstFanfare();

    // Trigger Super Anime Cut-In Layer
    this.dom.cutinLayer.classList.remove('hidden');
    setTimeout(() => {
      this.dom.cutinLayer.classList.add('hidden');
    }, 1800);

    // Massive Burst Damage: 50% of Boss Max HP
    let burstDmg = Math.round(this.state.bossMaxHp * 0.5);
    if (this.state.relics[3].unlocked) burstDmg *= 2; // mirror buff

    const rect = this.dom.bossAvatar.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;

    this.dealDamage(burstDmg, true, cx, cy, true);

    confetti({
      particleCount: 120,
      spread: 80,
      origin: { y: 0.35 },
      colors: ['#38bdf8', '#c084fc', '#fde047', '#2dd4bf']
    });

    if (this.visualizer) {
      this.visualizer.createBurst(cx, cy, '#fde047', 70);
    }
  }

  updateSkillCooldowns() {
    const now = Date.now();
    const rev = this.state.skills.reversal;
    const revPassed = now - rev.lastUsed;
    if (revPassed < rev.cd) {
      this.dom.skillReversalCd.style.height = `${100 - (revPassed / rev.cd) * 100}%`;
      this.dom.skillReversal.disabled = true;
    } else {
      this.dom.skillReversalCd.style.height = '0%';
      this.dom.skillReversal.disabled = false;
    }

    const cry = this.state.skills.crystallize;
    const cryPassed = now - cry.lastUsed;
    if (cryPassed < cry.cd) {
      this.dom.skillCrystallizeCd.style.height = `${100 - (cryPassed / cry.cd) * 100}%`;
      this.dom.skillCrystallize.disabled = true;
    } else {
      this.dom.skillCrystallizeCd.style.height = '0%';
      this.dom.skillCrystallize.disabled = false;
    }

    this.dom.skillBurst.disabled = (this.state.resonance < this.state.resonanceMax);
  }

  // ================= BOSS DEFEAT & PROGRESSION =================
  handleBossDefeat() {
    const bossData = this.state.bosses[(this.state.depth - 1) % this.state.bosses.length];
    const reward = Math.round(bossData.reward * Math.pow(1.3, this.state.depth - 1));
    this.state.memoryShards += reward;

    confetti({
      particleCount: 120,
      spread: 90,
      origin: { y: 0.4 },
      colors: ['#38bdf8', '#a855f7', '#fbbf24', '#2dd4bf']
    });

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

    this.dom.victoryTitle.textContent = `星脈調律完了：深度 ${this.state.depth}m`;
    this.dom.victoryDesc.textContent = `「${bossData.name}」の忘却は解かれ、光の記憶となって心に宿りました。`;
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
    this.initConstellationGrid();

    if (this.state.depth === 2) {
      this.showStoryModal(
        '薄暗がりの声',
        '/assets/character_echo.png',
        '「お前もまた、消えゆく記憶の星脈を追う者か……。この先は永遠の沈黙が満ちている」'
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

  // ================= UI RENDERING =================
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
    const hpPct = Math.max(0, Math.min(100, (this.state.bossHp / this.state.bossMaxHp) * 100));
    this.dom.bossHpFill.style.width = `${hpPct}%`;

    // Boss Attack Timer Bar
    this.dom.bossAttackTimer.textContent = `${Math.max(0, this.state.bossAttackTimer).toFixed(1)}s`;
    const attackPct = Math.max(0, Math.min(100, (1 - this.state.bossAttackTimer / this.state.bossAttackMax) * 100));
    this.dom.bossAttackFill.style.width = `${attackPct}%`;
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

      card.querySelector('.btn-buy-upgrade').addEventListener('click', () => this.buyUpgrade(upg.id));
      list.appendChild(card);
    }
    this.updateUpgradesAvailability();
  }

  updateUpgradesAvailability() {
    for (let key in this.state.upgrades) {
      const upg = this.state.upgrades[key];
      const btn = document.querySelector(`.btn-buy-upgrade[data-id="${upg.id}"]`);
      if (btn) btn.disabled = this.state.memoryShards < upg.cost;
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
