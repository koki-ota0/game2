# 🎮 開発メモリー・運用規約 (Development Memory & Guidelines)

## 📌 【最重要運用ルール】PRマージ時のデモ動画自動アーカイブ
今後、開発プロセスをSNS（X, TikTok, YouTube Shorts等）やNotionで発信するため、**Pull Requestをマージするたびに各バージョンのデモ動画・アニメーションクリップを撮影・生成し、Git管理下（`public/demos/` または `docs/demos/`）に保存すること**。

### 1. デモ動画の画角・フォーマット規格
1. **SNS縦型フォーマット (9:16 Portrait)**:
   - パス: `public/demos/demo_v{VERSION}_portrait.gif` (WebM/MP4)
   - 用途: スマホ画面そのままのUI、テンポ感、片手操作性を伝えるショート動画用。
2. **シネマティック接写フォーマット (1:1 Cinematic)**:
   - パス: `public/demos/demo_v{VERSION}_cinematic.gif`
   - 用途: ボス戦の被弾シェイク、パーティクル爆発、BURST演出の迫力を伝えるクリエイティブ用。
3. **俯瞰ワイドフォーマット (Wide Overview)**:
   - パス: `public/demos/demo_v{VERSION}_wide.gif`
   - 用途: ステータス、強化ツリー、叙事詩、遺物リストなどゲームシステム全体の進捗用。

---

## 🛠️ デモ動画の自動生成コマンド
コミット・マージ前に以下のスクリプトを実行することで、最新のバージョンに応じたマルチアングル動画が即座に生成されます：

```bash
python3 scripts/generate_demo_clips.py
```

また、ゲーム画面内にも**「🎥 デモ動画録画」**ツールが常備されており、プレイヤーや開発者がブラウザ上でプレイしながらリアルタイムにWebM動画を録画・ダウンロード可能です。

---

## 📋 バージョン管理履歴
- **v1.0.0 (commit: 168c4af / PR #1)**:
  - 基本バトル調律システム（想いの泡、コンボ、Web Audio API）
  - スキル3種（刻の逆行、星屑結晶、儚き絶唱）
  - 記憶紡ぎ（強化ツリー）、儚き遺物、黄昏の叙事詩
  - デモ動画アーカイブ（Portrait / Cinematic / Wide）を保存完了
