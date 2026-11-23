// Core Game Logic & State Management for EPHEMERE (儚い) - Constellation Link Edition
export class GameState {
  constructor() {
    this.memoryShards = 0;
    this.depth = 1; // Current Level / Depth in meters
    this.spiritLevel = 1;
    this.combo = 0;

    // Boss Battle Data
    this.bossMaxHp = 1200;
    this.bossHp = 1200;
    this.bossAttackMax = 9.0;
    this.bossAttackTimer = 9.0;

    this.resonance = 0;
    this.resonanceMax = 100;

    // Transcendence Roguelike Prestige (追憶昇華システム)
    this.astralSeeds = 0;
    this.perks = {
      orbitAcceleration: {
        id: 'orbitAcceleration',
        name: '恒星軌道の共鳴',
        desc: '全星脈ダメージ恒久 +50%',
        icon: '🪐',
        lvl: 0,
        cost: 1
      },
      timeDilation: {
        id: 'timeDilation',
        name: '悠久の時空膜',
        desc: '巨神忘却波のカウントダウン制限時間恒久 +2.0s',
        icon: '⌛',
        lvl: 0,
        cost: 2
      },
      starlightReincarnation: {
        id: 'starlightReincarnation',
        name: '星辰輪廻の雫',
        desc: '再誕時に初期記憶の欠片 +500💎',
        icon: '✨',
        lvl: 0,
        cost: 1
      }
    };

    // Upgrades
    this.upgrades = {
      tapPower: {
        id: 'tapPower',
        name: '星脈紡ぎの律動 (Link Base Dmg)',
        desc: '想いの星を繋いだときの記憶共鳴ダメージを増加',
        icon: '✨',
        lvl: 1,
        cost: 20,
        mult: 1.6
      },
      chainAffinity: {
        id: 'chainAffinity',
        name: '連鎖の追憶 (Chain Multiplier)',
        desc: '長く繋ぐほど与えるダメージと雫の倍率が急激に跳ね上がる',
        icon: '🌌',
        lvl: 1,
        cost: 40,
        mult: 1.8
      },
      loopMastery: {
        id: 'loopMastery',
        name: '輪廻の超越 (Supernova Loop)',
        desc: '星を一筆書きで閉環（ループ）させたときの爆発威力を大幅強化',
        icon: '💫',
        lvl: 1,
        cost: 50,
        mult: 1.9
      },
      stardustHarvest: {
        id: 'stardustHarvest',
        name: '星屑採集 (Shard Bounty)',
        desc: '星脈解放時に手に入る記憶の欠片が増加',
        icon: '💎',
        lvl: 1,
        cost: 35,
        mult: 1.7
      },
      aegisResonance: {
        id: 'aegisResonance',
        name: '黄昏の守護結界 (Boss Delay)',
        desc: '巨神の忘却波（カウントダウン）を遅延させ、余裕を生み出す',
        icon: '🛡️',
        lvl: 1,
        cost: 60,
        mult: 2.0
      }
    };

    // Relics (Ephemera Collectibles)
    this.relics = [
      {
        id: 'relic_feather',
        name: '消えゆく白羽',
        icon: '🪶',
        effect: '全星脈ダメージ +30%',
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
        effect: '絶唱カットイン必殺ダメージ +100%',
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
        text: '全てのものは、いつか跡形もなく消え去る。\nけれど、消えゆくからこそ、この一瞬の煌めきは尊い。\n星と星を結ぶ祈りは、黄昏の海へと捧げられる。',
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
        text: '「私はいつか消えてしまうのでしょうか」\n少女は問う。答えを知るものはいない。\nだが、星脈を紡ぐ手のひらの温もりは、今確かに本物だった。',
        unlocked: false
      },
      {
        depth: 5,
        title: '終曲：永久ならざるものの輝き',
        text: '満天の星が夜明けの光に溶けていくように。\n泡沫の残響は、新たな宇宙の礎となって巡りゆく。',
        unlocked: false
      }
    ];

    // Boss Data table
    this.bosses = [
      {
        name: '忘却の巨神・オブリビオン',
        title: '黄昏第1層 · 忘却の守護者',
        avatar: '/assets/character_boss.png',
        baseHp: 1200,
        reward: 160,
        attackTime: 9.0
      },
      {
        name: '白昼夢の影・エコー',
        title: '黄昏第2層 · 迷える彷徨人',
        avatar: '/assets/character_echo.png',
        baseHp: 3800,
        reward: 450,
        attackTime: 8.5
      },
      {
        name: '薄暮のステラ・ルミナス',
        title: '黄昏第3層 · 割れた硝子の女神',
        avatar: '/assets/character_boss2.png',
        baseHp: 9500,
        reward: 1100,
        attackTime: 7.5
      },
      {
        name: '永久の黄昏・ネビュラ',
        title: '黄昏深層 · 宇宙の残滓',
        avatar: '/assets/character_boss.png',
        baseHp: 28000,
        reward: 3200,
        attackTime: 6.8
      }
    ];

    // Skills
    this.skills = {
      reversal: { cd: 14000, lastUsed: 0, activeUntil: 0 },
      crystallize: { cd: 16000, lastUsed: 0 },
      burst: { active: false }
    };
  }

  calcStats() {
    let baseDmg = 25 + (this.upgrades.tapPower.lvl - 1) * 18;
    let chainPow = 1.0 + (this.upgrades.chainAffinity.lvl - 1) * 0.28;
    let loopPow = 2.2 + (this.upgrades.loopMastery.lvl - 1) * 0.45;
    let shardMult = 1.0 + (this.upgrades.stardustHarvest.lvl - 1) * 0.35;
    let delayBonus = (this.upgrades.aegisResonance.lvl - 1) * 0.7;

    // Transcendence Roguelike Perks
    if (this.perks && this.perks.orbitAcceleration) {
      baseDmg *= (1 + this.perks.orbitAcceleration.lvl * 0.5);
    }
    if (this.perks && this.perks.timeDilation) {
      delayBonus += this.perks.timeDilation.lvl * 2.0;
    }

    if (this.relics[0].unlocked) baseDmg *= 1.3;
    if (this.relics[2].unlocked) shardMult *= 1.5;

    return { baseDmg, chainPow, loopPow, shardMult, delayBonus };
  }

  calcTranscendenceGain() {
    // Shards & Depth converted to Astral Seeds
    return Math.max(1, Math.floor(Math.sqrt(this.memoryShards / 150) + (this.depth - 1) * 2));
  }

  doTranscendence() {
    const gain = this.calcTranscendenceGain();
    this.astralSeeds += gain;

    // Reset run progress
    const initShards = (this.perks && this.perks.starlightReincarnation) ? this.perks.starlightReincarnation.lvl * 500 : 0;
    this.memoryShards = initShards;
    this.depth = 1;
    this.spiritLevel = 1;
    for (let k in this.upgrades) {
      this.upgrades[k].lvl = 1;
      this.upgrades[k].cost = 20;
    }
    this.setupBossForDepth();
    this.save();
    return gain;
  }

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

    const stats = this.calcStats();
    this.bossAttackMax = (bossData.attackTime || 8.0) + stats.delayBonus;
    this.bossAttackTimer = this.bossAttackMax;
    this.resonance = 0;
  }
}
