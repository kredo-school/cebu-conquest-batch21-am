# セブ獲り合戦 — デザイントークン集
> 発表用スライド作成リファレンス  
> 抽出日: 2026-05-07  
> 抽出元: `src/` 全CSS・TSX・JSX / `index.html` / `tailwind.config`

---

## 1. カラーパレット

### ブランドカラー

| 用途 | 名前 | HEX | Tailwindクラス |
|---|---|---|---|
| プライマリ（ブランド） | Brand Orange | `#fa7000` | `text-brand` / `bg-brand` |
| プライマリ暗め | Tactical Orange | `#ea580c` | `text-orange-600` / `bg-orange-600` |
| セカンダリ | Tactical Cyan | `#06b6d4` | `text-cyan-500` / `bg-cyan-500` |
| ハイライト | Neon Cyan | `#22d3ee` | `text-cyan-400` |
| ホバー橙 | Orange Hover | `#f97316` | `text-orange-500` / `bg-orange-500` |

### 背景・テキスト

| 用途 | HEX | Tailwindクラス |
|---|---|---|
| アプリ最暗背景 | `#020617` | `bg-slate-950` |
| カード/パネル背景 | `#0f172a` | `bg-slate-900` |
| ボーダー暗め | `#1e293b` | `border-slate-800` |
| テキスト白 | `#f1f5f9` | `text-slate-100` |
| テキスト補助 | `#64748b` | `text-slate-500` |
| テキスト薄い | `#e2e8f0` | `text-slate-200` |

### セマンティックカラー

| 用途 | HEX | Tailwindクラス |
|---|---|---|
| 成功 / 正 | `#22c55e` | `text-green-500` |
| 警告 / 敵 | `#ef4444` | `text-red-500` |
| エラー背景 | `#7f1d1d` | `bg-red-900` |

### 透明度バリアント（グラスモーフィズム用）

```css
rgba(10, 10, 10, 0.85)      /* glass-panel 基本背景 */
rgba(249, 115, 22, 0.2)     /* オレンジ枠・弱発光 */
rgba(249, 115, 22, 0.3)     /* オレンジ選択状態 */
rgba(249, 115, 22, 0.8)     /* オレンジ強発光 */
rgba(234, 88, 12, 0.2)      /* tactical-orange 枠 */
rgba(34, 211, 238, 0.8)     /* シアン発光 */
rgba(0, 0, 0, 0.8)          /* ダークオーバーレイ */
```

---

## 2. タイポグラフィ

### フォントファミリー

| 用途 | フォント名 | 読み込み元 |
|---|---|---|
| 本文・見出し共通 | **Inter** (100–900wght) | Google Fonts CDN |
| 本文・見出し共通 | **Noto Sans JP** (100–900wght) | Google Fonts CDN |
| アイコン | **Material Symbols Outlined** | Google Fonts CDN |

```html
<!-- index.html で読み込み -->
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@100..900&display=swap" rel="stylesheet">
<link href="https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:opsz,wght,FILL,GRAD@48,400,0,0" rel="stylesheet">
```

> **注:** 見出し専用フォント（日本語ゴシック等）は現時点で未使用。  
> スライドでゲームらしい世界観を出す場合は `Noto Sans JP` などを追加する選択肢あり。

### フォントサイズ スケール

| 役割 | rem | px |
|---|---|---|
| ヒーロー見出し | 3.75rem | 60px |
| 大見出し | 2.25rem | 36px |
| 中見出し | 1.5rem | 24px |
| 小見出し | 1.25rem | 20px |
| 本文 | 1rem | 16px |
| 補助テキスト | 0.875rem | 14px |
| バッジ・ラベル | 0.75rem | 12px |
| 極小（タイニー） | 0.625rem | 10px |

### フォントウェイト

| ウェイト | 用途 |
|---|---|
| 400 | 通常本文 |
| 700 | 強調・ボタンラベル |
| 900 | ヒーロー見出し・ゲームタイトル |

---

## 3. 余白（Spacing）

Tailwind のデフォルト rem スケールを使用。頻出値:

| Token | rem | px | 用途例 |
|---|---|---|---|
| `p-1` | 0.25rem | 4px | アイコン内余白 |
| `p-2` | 0.5rem | 8px | バッジ |
| `p-4` | 1rem | 16px | カード内パディング基本 |
| `p-6` | 1.5rem | 24px | モーダル・パネル標準 |
| `p-8` | 2rem | 32px | セクション区切り |
| `px-6 py-2` | — | — | ボタン標準 |
| `gap-4` | 1rem | 16px | グリッド列間 |

---

## 4. 角丸（Border Radius）

| Token | 値 | 用途 |
|---|---|---|
| `rounded` | 4px | 小ボタン・タグ |
| `rounded-lg` | 8px | インプット・小カード |
| `rounded-xl` | 12px | 通常カード |
| `rounded-2xl` | 16px | モーダル・大パネル |
| `rounded-3xl` | 24px | 神選択カード |
| `rounded-full` | 9999px | ピルボタン・アバターアイコン |

---

## 5. シャドウ・発光（Shadows & Glows）

### 標準シャドウ

| クラス | 値 |
|---|---|
| `shadow-lg` | `0 10px 15px -3px rgba(0,0,0,0.1)` |
| `shadow-2xl` | `0 25px 50px -12px rgba(0,0,0,0.25)` |

### カスタム発光（Neon Glow）

```css
/* オレンジ発光（ボタン・選択状態） */
box-shadow: 0 0 15px #f97316;
box-shadow: 0 0 20px rgba(234, 88, 12, 0.4), 0 0 30px rgba(234, 88, 12, 0.6);

/* シアン発光（ハイライト） */
box-shadow: 0 0 15px rgba(34, 211, 238, 0.8);

/* カード選択時 */
box-shadow: 0 0 30px rgba(249, 115, 22, 0.3);

/* 大型ドロップシャドウ */
box-shadow: 0 0 50px rgba(0, 0, 0, 0.5);
```

---

## 6. ボタンスタイル

`CustomButton` コンポーネントは `rounded-full` + `tracking-widest` + `uppercase` が基本。

### バリアント一覧

| バリアント | 背景色 | テキスト | ホバー |
|---|---|---|---|
| **Primary（default）** | `bg-orange-600` (`#ea580c`) | `text-white` | `bg-orange-500` + scale |
| **Danger** | `bg-red-600` (`#dc2626`) | `text-white` | `bg-red-500` |
| **Ghost** | 透明 | `text-slate-300` | `bg-slate-800` |

### 共通プロパティ

```css
padding: 0.5rem 1.5rem;          /* py-2 px-6 */
border-radius: 9999px;            /* rounded-full */
font-weight: 700;                 /* font-bold */
text-transform: uppercase;        /* uppercase */
letter-spacing: 0.1em;           /* tracking-widest */
box-shadow: 0 10px 15px...;      /* shadow-lg */
transition: all 200ms;            /* transition duration-200 */
/* アクティブ時 */
transform: scale(0.95);           /* active:scale-95 */
/* 無効時 */
opacity: 0.5; cursor: not-allowed;
```

---

## 7. カード・パネルスタイル

### グラスパネル（`.glass-panel`）

```css
background: rgba(10, 10, 10, 0.85);
backdrop-filter: blur(16px);
-webkit-backdrop-filter: blur(16px);
border: 1px solid rgba(249, 115, 22, 0.2);
border-radius: 1rem; /* rounded-2xl */
```

### 通常カード

```css
background: bg-slate-900/60 (= rgba(15, 23, 42, 0.6));
border: 1px solid border-slate-800 (#1e293b);
border-radius: 1rem; /* rounded-xl or rounded-2xl */
padding: 1.5rem; /* p-6 */
```

### 選択・アクティブカード（神選択等）

```css
border: 2px solid #f97316;          /* border-orange-500 */
box-shadow: 0 0 30px rgba(249, 115, 22, 0.3);
background: rgba(67, 20, 7, 0.2);   /* bg-orange-950/20 */
```

---

## 8. アニメーション・エフェクト

| エフェクト名 | 説明 | 使用箇所 |
|---|---|---|
| `phase-bounce-zoom` | 3.5s スケール + 輝度 + フェード | タイトル画面フェーズ演出 |
| `holographic-flicker` | 4s テキストシャドウ点滅 | ロゴ・ヒーロー見出し |
| `shimmer` | translateX + skewX 光沢 | ボタンホバー・カード |
| `scanline-move` | CRTライン縦スクロール | 画面全体のレトロ演出 |
| `progressBar` | 幅0→100% 2.5s | HPバー・APバー |
| `fadeIn` | opacity 0→1 | モーダル表示 |
| `glitch-text` | 赤/緑テキストシャドウずれ | ゲームタイトル |
| `pulse` / `ping` | 連続発光パルス | ステータスインジケーター |

### スキャンラインCSSレイヤー

```css
.scanline::before {
  content: "";
  position: fixed; inset: 0; z-index: 999;
  background: repeating-linear-gradient(
    0deg,
    rgba(18, 16, 16, 0) 0px,
    rgba(18, 16, 16, 0) 2px,
    rgba(0, 0, 0, 0.25) 2px,
    rgba(0, 0, 0, 0.25) 4px
  );
  pointer-events: none;
}
```

---

## 9. Z-Indexヒエラルキー

| レイヤー | z-index値 | 要素 |
|---|---|---|
| ベース | 0–10 | Phaser Canvas, マップ |
| ゲームUI | 30–40 | HUD パネル |
| モーダル | 10000–11000 | バトル結果・確認ダイアログ |
| オーバーレイ | 200000+ | フェードアウト演出 |
| 設定/ヘルプ | 300000–330000 | 最前面固定パネル |

---

## 10. キービジュアル画像パス一覧

### ブランド・ロゴ

| ファイル名 | パス | 備考 |
|---|---|---|
| GI-Project_Logo.png | `public/assets/images/project_logo/GI-Project_Logo.png` | チームロゴ。スライド表紙に使用可 |

### 神キャラクター（8柱）

| 神名 | パス |
|---|---|
| Neil | `public/assets/images/gods/Neil.png` |
| Garry | `public/assets/images/gods/Garry.png` |
| Shem | `public/assets/images/gods/Shem.png` |
| Quisie | `public/assets/images/gods/Quisie.png` |
| Eduardo | `public/assets/images/gods/Eduardo.png` |
| Kurt | `public/assets/images/gods/Kurt.png` |
| Stephen | `public/assets/images/gods/Stephen.png` |
| Bernardine | `public/assets/images/gods/Bernardine.png` |

### タイルセット（マップ素材）

| ファイル名 | パス | 内容 |
|---|---|---|
| pipo-map001.png | `public/assets/tilesets/pipo-map001.png` | ベースマップチップ |
| [Base]BaseChip_pipo.png | `public/assets/tilesets/[Base]BaseChip_pipo.png` | 地形ベース |
| [A]Water1_pipo.png | `public/assets/tilesets/[A]Water1_pipo.png` | 海・水面 |
| [A]Water2_pipo.png | `public/assets/tilesets/[A]Water2_pipo.png` | 海・水面（別バリアント） |
| [A]Grass4_pipo.png | `public/assets/tilesets/[A]Grass4_pipo.png` | 草地 |
| [A]LongGrass_pipo.png | `public/assets/tilesets/[A]LongGrass_pipo.png` | 茂み |
| [A]Dirt1_pipo.png | `public/assets/tilesets/[A]Dirt1_pipo.png` | 土道 |
| [A]Flower_pipo.png | `public/assets/tilesets/[A]Flower_pipo.png` | 花 |
| animals.png | `public/assets/tilesets/animals.png` | 動物スプライト |
| heros.png | `public/assets/tilesets/heros.png` | プレイヤースプライト |
| JapanProps-02.png | `public/assets/tilesets/JapanProps-02.png` | 建物・小物 |
| Slates.png | `public/assets/tilesets/Slates.png` | 石板テクスチャ |

> **スクリーンショット:** 実際のゲーム画面スクリーンショットは未収録。  
> ゲームを起動した状態でスクリーンショットを撮影し `presentation/assets/reference/` に追加すること。

---

## 11. コピー済み参照ファイル（`presentation/assets/reference/`）

```
presentation/assets/reference/
├── GI-Project_Logo.png        ← プロジェクトロゴ
├── god_Neil.png
├── god_Garry.png
├── god_Shem.png
├── god_Quisie.png
├── god_Eduardo.png
├── god_Kurt.png
├── god_Stephen.png
└── god_Bernardine.png
```

---

## 12. デザインシステム概要（スライドサマリー用）

### テーマキーワード
**「タクティカル × 南国トロピカル × サイバーパンク」**

### 4つの視覚的特徴
1. **ダーク基調** — `slate-950`（#020617）をベースに深い黒を重ねる
2. **ネオン発光** — オレンジ(`#fa7000`)とシアン(`#06b6d4`)の対比で「戦略ゲーム感」
3. **グラスモーフィズム** — `backdrop-blur` + 半透明パネルで奥行きを演出
4. **CRTレトロ演出** — スキャンライン + グリッチテキストで「古びた電子端末」感

### カラーの使い分け
- オレンジ系 → **攻撃・選択・プレイヤー側**
- シアン系 → **情報・ハイライト・中立地区**
- 赤系 → **ダメージ・敵・エラー**
- 緑系 → **回復・成功・HP残量**

---

*要確認事項:*
- *ゲーム画面の実スクリーンショットは手動で撮影・追加が必要*
- *Tailwind configのカスタム設定がindex.html内にインラインで定義されている可能性あり（ファイルを直接確認推奨）*
- *「Noto Sans JP」等の日本語フォントは現在未導入 → スライドで和文フォントが必要な場合は追加要検討*
