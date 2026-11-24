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
