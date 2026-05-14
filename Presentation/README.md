# Cebu Conquest — Presentation

Reveal.js slide deck for **Cebu Conquest / セブ獲り合戦**
Batch 21 AM · Kredo IT School · Presentation: May 20, 2026

---

## Quick Start

```bash
cd presentation
npm install
npm start
# Open http://localhost:8000
```

Press `F` for fullscreen · `S` for speaker notes view · Arrow keys to navigate.

---

## Slide Count & Time Allocation

| Section | Slides | Presenter | Time |
|---|---|---|---|
| Opening | 1–6 | Akira | 7 min |
| Game Overview | 7–13 | Akira | 8 min |
| **Live Demo** | 14 | All | **15 min** |
| Tech Stack | 15–18 | All | 8 min |
| Akira's Section (Phaser) | 19–22 | Akira | 8 min |
| Issei's Section (React) | 23–26 | Issei | 8 min |
| Kei's Section (Socket.IO) | 27–30 | Kei | 8 min |
| Nao's Section (PHP) | 31–34 | Nao | 8 min |
| Lessons Learned | 35–36 | All | 5 min |
| Closing | 37–38 | Akira | 2 min |
| **Q&A** | — | All | **10 min** |
| **Total** | **38 slides** | | **~87 min** |

---

## How to Replace Team Photos

Each team member slot uses a placeholder `<div>` with a `data-member` attribute.

**Step 1 — Prepare photos**

- Recommended size: **240 × 240 px minimum**, square crop
- Supported formats: `.jpg`, `.png`, `.webp`
- Name the files exactly: `Akira.jpg`, `Issei.jpg`, `Kei.jpg`, `Nao.jpg`

**Step 2 — Copy photos into the assets folder**

```
presentation/assets/reference/Akira.jpg
presentation/assets/reference/Issei.jpg
presentation/assets/reference/Kei.jpg
presentation/assets/reference/Nao.jpg
```

**Step 3 — Edit index.html (Slide 2)**

Find each `<div class="photo-placeholder" data-member="...">` block and replace it with an `<img>` tag:

```html
<!-- BEFORE -->
<div class="photo-placeholder" data-member="Akira">
  📷<br/>Add photo:<br/>Akira.jpg
</div>

<!-- AFTER -->
<img src="assets/reference/Akira.jpg"
     alt="Akira"
     style="width:110px;height:110px;border-radius:50%;
            border:3px solid var(--brand-orange);
            box-shadow:0 0 20px rgba(250,112,0,0.4);
            object-fit:cover;" />
```

Repeat for each team member.

---

## How to Replace Screenshots

Screenshots are marked with `data-screenshot` attributes for easy search.

**To find all placeholders:**

```bash
grep -n 'data-screenshot' presentation/index.html
```

### File Naming Convention

| `data-screenshot` value | Save file as |
|---|---|
| `game-overview` | `assets/screenshots/game-overview.png` |
| `map-overview` | `assets/screenshots/map-overview.png` |
| `battle-scene` | `assets/screenshots/battle-scene.png` |
| `tiled-editor` | `assets/screenshots/tiled-editor.png` |
| `battle-effect` | `assets/screenshots/battle-effect.png` |
| `hud-full` | `assets/screenshots/hud-full.png` |
| `god-selection` | `assets/screenshots/god-selection.png` |

**Recommended size:** 1280 × 720 px (matches slide resolution)

**Step 1 — Take screenshot**

Launch the game, navigate to the target screen, press `Cmd+Shift+4` (macOS) or use your OS screenshot tool.

**Step 2 — Copy to screenshots folder**

```bash
cp ~/Desktop/screenshot.png presentation/assets/screenshots/game-overview.png
```

**Step 3 — Edit index.html**

Find the placeholder div by searching for `data-screenshot="game-overview"` and replace it with an `<img>`:

```html
<!-- BEFORE -->
<div class="screenshot-placeholder" data-screenshot="game-overview">
  <span class="placeholder-icon">🗺️</span>
  <span>Game Overview Screenshot</span>
  <span class="placeholder-hint">Add: assets/screenshots/game-overview.png</span>
</div>

<!-- AFTER -->
<img src="assets/screenshots/game-overview.png"
     alt="Game Overview"
     style="width:100%;border-radius:0.75rem;
            border:1px solid rgba(250,112,0,0.3);" />
```

---

## Directory Structure

```
presentation/
├── index.html               # All 38 slides
├── package.json             # npm scripts (serve)
├── README.md                # This file
├── DESIGN_TOKENS.md         # Design reference
├── css/
│   ├── theme.css            # Global Reveal theme (design tokens)
│   └── slides.css           # Per-slide component styles
└── assets/
    ├── reference/           # Pre-copied assets (logo, god images)
    │   ├── GI-Project_Logo.png
    │   ├── god_Neil.png
    │   ├── god_Garry.png
    │   ├── god_Shem.png
    │   ├── god_Quisie.png
    │   ├── god_Eduardo.png
    │   ├── god_Kurt.png
    │   ├── god_Stephen.png
    │   └── god_Bernardine.png
    └── screenshots/         # Add game screenshots here
        └── (empty — see replacement guide above)
```

---

## Keyboard Shortcuts (during presentation)

| Key | Action |
|---|---|
| `→` / `Space` | Next slide |
| `←` | Previous slide |
| `F` | Fullscreen |
| `S` | Speaker notes view |
| `O` | Slide overview |
| `Esc` | Exit fullscreen / overview |
| `B` | Blackout screen |
