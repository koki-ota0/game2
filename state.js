// Core Game Logic & State Management for EPHEMERE (儚い)
import { soundEngine } from './sound.js';
import confetti from 'canvas-confetti';

export class GameState {
  constructor() {
    this.memoryShards = 0;
    this.depth = 1; // Current Level / Depth in meters
    this.spiritLevel = 1;
    this.combo = 0;
    this.lastOrbTime = 0;

    // Active boss data
    this.bossMaxHp = 1000;
    this.bossHp = 1000;
    this.resonance = 0; // 0 to 100
    this.resonanceMax = 100;

    // Multipliers & Stats
    this.tapPower = 25;
    this.autoDecayRate = 1; // passive damage / sec
    this.shardMultiplier = 1.0;
    this.critRate = 0.15;
    this.critDmg = 2.0;

    // Upgrades
    this.upgrades = {
      tapPower: {
        id: 'tapPower',
        name: '儚き祈り (Tap Power)',
        desc: '想いを触れたときの記憶共鳴ダメージを増加',
        icon: '✨',
        lvl: 1,
        cost: 15,
        mult: 1.6
      },
      autoDecay: {
        id: 'autoDecay',
        name: '黄昏の風化波 (Passive Decay)',
        desc: '毎秒、世界の形相を徐々に風化させる（自動DPS）',
        icon: '🌬️',
        lvl: 0,
        cost: 30,
        mult: 1.7
      },
      resonanceGain: {
        id: 'resonanceGain',
        name: '魂の感応 (Resonance Charge)',
        desc: 'バーストゲージの充填速度が上昇する',
        icon: '💫',
        lvl: 1,
        cost: 60,
        mult: 1.9
      },
      stardustHarvest: {
        id: 'stardustHarvest',
        name: '星屑採集 (Shard Bounty)',
        desc: '泡沫消滅時に得られる記憶の欠片が増加',
        icon: '💎',
        lvl: 1,
        cost: 50,
        mult: 1.8
      },
      critResonance: {
        id: 'critResonance',
        name: '刹那の閃光 (Critical Chance)',
        desc: '急所に触れる確率とダメージを向上',
        icon: '⚡',
        lvl: 1,
        cost: 100,
        mult: 2.2
      }
    };

    // Relics (Ephemera Collectibles)
    this.relics = [
      {
        id: 'relic_feather',
        name: '消えゆく白羽',
        icon: '🪶',
        effect: '全ダメージ +25%',
        lore: '神の鳥が地上を離れる際、涙と共に零れ落ちた羽。今にも溶けそうだ。',
        unlocked: true
      },
      {
        id: 'relic_hourglass',
        name: '砕かれた砂時計',
        icon: '⌛',
        effect: 'スキル再使用時間 -30%',
        lore: '永遠を拒んだ王が壊した時の器。漏れ出す砂は星の光を宿している。',
        unlocked: false,
        reqDepth: 2
      },
      {
        id: 'relic_flower',
        name: '白昼夢の彼岸花',
        icon: '🌺',
        effect: '記憶の欠片ドロップ +50%',
        lore: '現世と冥界の狭間にのみ咲く幻の花。摘み取った瞬間から散り始める。',
        unlocked: false,
        reqDepth: 3
      },
      {
        id: 'relic_mirror',
        name: '忘却の水鏡',
        icon: '🪞',
        effect: '絶唱バーストダメージ +100%',
        lore: '覗き込むと自らの最も美しく儚い過去が映し出されるという。',
        unlocked: false,
        reqDepth: 5
      }
    ];

    // Chronicles / Lore Stories
    this.lore = [
      {
        depth: 1,
        title: '序幕：消えゆく世界の朝露',
        text: '全てのものは、いつか跡形もなく消え去る。\nけれど、消えゆくからこそ、この一瞬の煌めきは尊い。\n私たちが紡ぐ記憶の祈りは、黄昏の海へと捧げられる。',
        unlocked: true
      },
      {
        depth: 2,
        title: '第二歌：オブリビオンの哀哭',
        text: '巨神はかつて、世界の記憶を護る柱であった。\n時の重みに耐えかねてひび割れたその身体からは、\n今なお幾千万の人々の笑顔と涙が零れ落ちている。',
        unlocked: false
      },
      {
        depth: 3,
        title: '第三歌：薄明の少女ラピス',
        text: '「私はいつか消えてしまうのでしょうか」\n少女は問う。答えを知るものはいない。\nだが、手のひらに宿る温もりだけは、今確かに本物だった。',
        unlocked: false
      },
      {
        depth: 5,
        title: '終曲：永久ならざるものの輝き',
        text: '満天の星が夜明けの光に溶けていくように。\n泡沫の残響は、新たな宇宙の礎となって巡りゆく。',
        unlocked: false
      }
    ];

    // Boss Data table for progressive depths
    this.bosses = [
      {
        name: '忘却の巨神・オブリビオン',
        title: '黄昏第1層 · 忘却の守護者',
        avatar: '/assets/character_boss.png',
        baseHp: 1000,
        reward: 120
      },
      {
        name: '白昼夢の影・エコー',
        title: '黄昏第2層 · 迷える彷徨人',
        avatar: '/assets/character_echo.png',
        baseHp: 3200,
        reward: 350
      },
      {
        name: '薄暮のステラ・ルミナス',
        title: '黄昏第3層 · 割れた硝子の女神',
        avatar: '/assets/character_boss2.png',
        baseHp: 8500,
        reward: 900
      },
      {
        name: '永久の黄昏・ネビュラ',
        title: '黄昏深層 · 宇宙の残滓',
        avatar: '/assets/character_boss.png',
        baseHp: 24000,
        reward: 2500
      }
    ];

    // Skill Cooldowns (in ms)
    this.skills = {
      reversal: { cd: 12000, lastUsed: 0, activeUntil: 0 },
      crystallize: { cd: 15000, lastUsed: 0 },
      burst: { active: false }
    };

    this.activeOrbs = [];
    this.orbIdCounter = 0;
  }

  // Calculate current effective stats with upgrades & relics
  calcStats() {
    let tap = 20 + (this.upgrades.tapPower.lvl - 1) * 16;
    let auto = (this.upgrades.autoDecay.lvl) * 10;
    let resMultiplier = 1.0 + (this.upgrades.resonanceGain.lvl - 1) * 0.25;
    let shardMult = 1.0 + (this.upgrades.stardustHarvest.lvl - 1) * 0.35;
    let crit = 0.15 + (this.upgrades.critResonance.lvl - 1) * 0.05;
    let critD = 2.0 + (this.upgrades.critResonance.lvl - 1) * 0.2;

    // Relics buffs
    if (this.relics[0].unlocked) { // feather: +25% dmg
      tap *= 1.25;
      auto *= 1.25;
    }
    if (this.relics[2].unlocked) { // flower: +50% shards
      shardMult *= 1.5;
    }

    return { tap, auto, resMultiplier, shardMult, crit, critD };
  }

  // Load / Save State
  save() {
    const data = {
      memoryShards: this.memoryShards,
      depth: this.depth,
      spiritLevel: this.spiritLevel,
      upgrades: this.upgrades,
      relics: this.relics,
      lore: this.lore
    };
    try {
      localStorage.setItem('ephemere_save', JSON.stringify(data));
    } catch (e) {
      console.warn('Save failed', e);
    }
  }

  load() {
    try {
      const raw = localStorage.getItem('ephemere_save');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.memoryShards !== undefined) this.memoryShards = parsed.memoryShards;
        if (parsed.depth !== undefined) this.depth = parsed.depth;
        if (parsed.spiritLevel !== undefined) this.spiritLevel = parsed.spiritLevel;
        if (parsed.upgrades) {
          for (let k in parsed.upgrades) {
            if (this.upgrades[k]) {
              this.upgrades[k].lvl = parsed.upgrades[k].lvl;
              this.upgrades[k].cost = parsed.upgrades[k].cost;
            }
          }
        }
        if (parsed.relics) {
          parsed.relics.forEach((r, idx) => {
            if (this.relics[idx]) this.relics[idx].unlocked = r.unlocked;
          });
        }
        if (parsed.lore) {
          parsed.lore.forEach((l, idx) => {
            if (this.lore[idx]) this.lore[idx].unlocked = l.unlocked;
          });
        }
      }
    } catch (e) {
      console.warn('Load failed', e);
    }
    this.setupBossForDepth();
  }

  reset() {
    localStorage.removeItem('ephemere_save');
    location.reload();
  }

  setupBossForDepth() {
    const bossData = this.bosses[(this.depth - 1) % this.bosses.length];
    const multiplier = Math.pow(1.5, Math.floor((this.depth - 1) / this.bosses.length));
    this.bossMaxHp = Math.round(bossData.baseHp * multiplier);
    this.bossHp = this.bossMaxHp;
    this.resonance = 0;
  }
}
