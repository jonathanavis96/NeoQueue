# Implementation Plan - NeoQueue

Last updated: 2026-01-17 13:43:11

## Current State

**App status:** Phase 3 (Polish) in progress. Core “list-first” workflow is implemented and usable; remaining work is primarily UX polish and optional feature alignment with the original (more ambitious) THOUGHTS.md canvas concept.

**What exists today (verified):**
- Electron main process + Vite/React renderer wired and working.
- Persistence via `electron-store` (IPC save/load + renderer hook with optimistic updates/rollback).
- Core queue workflow:
  - Add item quickly (Enter-to-add)
  - Copy item text (one-click)
  - Follow-ups (expand/collapse + inline add)
  - Completion workflow (Active vs Discussed)
  - Delete items
- Power-user ergonomics:
  - Ctrl/Cmd+N focuses new item input (renderer)
  - Ctrl/Cmd+F focuses search; Esc clears active search
  - Global shortcuts: Ctrl/Cmd+Shift+N (show + focus new item), Ctrl/Cmd+Shift+Q (toggle window)
  - System tray menu + double-click to show window
- Onboarding & docs:
  - In-app, dismissible Help panel (first-run + manual open)
  - README updated with screenshot, shortcuts, tray behavior, packaging notes
  - NEURONS.md codebase map present
- Packaging readiness:
  - electron-builder config works; app/tray icons wired; `npm run package` produces artifacts (validated on Linux)

**Known spec divergence (intentional for v1):**
- THOUGHTS.md describes a **canvas / click-to-create** UI and **right-click copy + follow-up** flow.
- Current app is intentionally **list-first** (faster to ship, already meets practical MVP goals). Future work may reconcile/align THOUGHTS.md with this direction.

**Remaining notable gaps from THOUGHTS.md “data integrity” ideals:**
- Undo, export, and automatic backups are not implemented (treat as post-v1 unless required).

## Goal

Ship a polished NeoQueue v1 that meets the *practical* MVP goals (fast capture, follow-ups, completion, persistence, keyboard/tray workflow) and is ready to package/install with correct branding. Secondary goal: selectively align THOUGHTS.md “nice-to-have” features (search/filter, onboarding, subtle Matrix effects) without destabilizing core flows.

## Prioritized Tasks

### High Priority (Next Build Iterations)

- [x] **Task 10:** Build & distribution readiness
  - [x] electron-builder base config present in `package.json` (mac/win/linux targets)
  - [x] Add real app icons (app + tray) and wire them into Electron + electron-builder config
  - [x] Validate `npm run package` produces working artifacts on at least one OS (sanity check: app launches, data persists)
  - [x] Decide on auto-updater: **Defer for v1** (no distribution channel yet; revisit if publishing via GitHub Releases, S3, or an internal updater feed)
  - Target: Installable artifacts with correct branding/icons

- [x] **Task 11:** Documentation & onboarding
  - [x] Create `NEURONS.md` codebase map (now that core features exist)
  - [x] Expand README:
    - Add at least one screenshot/GIF
    - Add troubleshooting (packaging notes, common startup issues, AppImage/libfuse note)
    - Update shortcut table to include global shortcuts + tray behavior
  - [x] Add in-app help/onboarding (minimal, dismissible):
    - First-run or manual “How to use” panel
    - Include: add item, copy, follow-ups, complete, restore after restart, global shortcuts
  - Target: A first-time user can install, understand, and use the app in < 2 minutes

### Medium Priority (Feature Alignment / UX)

- [x] **Task 13:** Two-tab UI (Queue / Discussed)
  - Replace the two-section layout with a tab bar: **Queue** (active) and **Discussed** (completed).
  - Optional: persist selected tab (localStorage) and restore on startup.
  - Ensure keyboard flow remains solid (Tab order, shortcuts still work).

- [x] **Task 14:** Matrix polish effects (tasteful)
  - Add a subtle scanline/CRT overlay implemented as a CSS pseudo-element over the app container.
    - Default: **off**
    - Persist: `localStorage` (`neoqueue.ui.effects.scanlines`)
    - Provide an in-app toggle (likely in Help panel or header menu)
  - Add a brief “glitch/pulse” animation on key actions:
    - add item
    - copy item
    - mark discussed / restore
  - Prefer CSS-only (transform/opacity/text-shadow) and keep it under ~300ms.
  - Guardrails: no seizure-y flashing; keep 60fps; no layout thrash.

- [x] **Task 16:** Data integrity “nice-to-have” (post-v1 unless needed)
  - [x] Export current state as JSON (download/save via Electron main process)
  - [x] Optional: export Markdown (manager-friendly) with Active + Discussed sections
  - [x] Optional: debounced backup to a secondary location (Windows-safe pathing)
  - [ ] Optional: undo (single-step) if it can be implemented safely

### Low Priority (Bigger Spec Items / Future)

- [ ] **Task 15:** Reconcile THOUGHTS.md “canvas” concept vs current list UI
  - Decide: keep list UI for v1 (recommended) vs implement click-to-create canvas.
  - If keeping list: update THOUGHTS.md to reflect the chosen UX.

- [ ] **Task 17:** Window behavior polish
  - Add a **close-to-tray** option (intercept window close event and hide instead)
    - Persist setting (likely in `electron-store` or `localStorage` + IPC)
  - Remember window size/position across restarts (`BrowserWindow.getBounds()` → persist → restore)
  - Ensure behavior is sane on multi-monitor changes (fallback to centered default)

## Discoveries & Notes

**2026-01-17 (Planning update):**
- THOUGHTS.md includes several “aspirational” features (canvas, right-click flow, auto-backup/undo/export) that diverge from the current shipped UI. The current app is intentionally *list-first* and already satisfies many practical MVP goals.
- Current codebase already has small Matrix touches (blinking cursor). **Scanline/CRT overlay** and **glitch/pulse animations** have now been added (Task 14).
- Window behavior today:
  - Global shortcut toggles window visibility (`CommandOrControl+Shift+Q` uses `mainWindow.hide()`)
  - No close-to-tray intercept and no persisted window bounds yet.
- Two-tab UI is low-risk and aligns well with THOUGHTS.md without committing to the canvas concept.
- Data-integrity items (backup, undo, export) should be treated as post-v1 unless required; they add complexity and deserve careful design.

**2026-01-17 (Build Iteration): Task 14 Matrix polish effects**
- Added CSS scanline/CRT overlay (default off) via `.app.scanlines-enabled` pseudo-elements.
- Added in-app toggle in Help panel; persists in `localStorage` (`neoqueue.ui.effects.scanlines`).
- Added brief (<= 300ms) pulse/glitch CSS animations on key actions: add, copy, mark discussed, restore.
- Implemented a small `UiEffectsProvider` context to coordinate action pulses.

**2026-01-17 (Build Iteration): Task 16 export JSON**
- Added JSON export via Electron save dialog and IPC (`export-json`).
- Exposed `window.electronAPI.exportJson` and added Help panel button.

**2026-01-17 (Build Iteration): Task 16 debounced secondary backup**
- Added best-effort, debounced writes of `AppState` to `Documents/NeoQueue Backups/backup-latest.json` on every successful save.
- Uses Windows-safe path joining and never fails the primary save if backup fails.

**2026-01-17 (Build Iteration): Task 16 export Markdown**
- Added Markdown export via Electron save dialog and IPC (`export-markdown`).
- Renderer exposes `window.electronAPI.exportMarkdown`; Help panel includes an "Export notes (Markdown)" button.
- Markdown output includes Active + Discussed sections and follow-ups.

**2026-01-17 (Build Iteration): Task 13 two-tab UI**
- Replaced the two-section list with tabs: **Queue** and **Discussed**.
- Persist selected tab in `localStorage` (`neoqueue.ui.selectedTab`).
- Auto-switch tabs if filtering/search results leave the current tab empty.

**2026-01-17 (Build Iteration): Task 12 search/filter**
- Added header search box to filter items by item text and follow-up text.
- Added Ctrl/Cmd+F to focus search and Esc to clear active search.

**2026-01-17 12:59 (Build Iteration):** Task 10 packaging validation complete:
- Fixed electron-builder entry mismatch by compiling main process during build (`build` now runs `build:electron`) and pointing `package.json#main` at the actual output `dist/main/main/main.js`.
- Packaging now produces a Linux AppImage (`release/NeoQueue-1.0.0.AppImage`) and `release/linux-unpacked`.
- Note: In WSL, running AppImage may fail due to missing `libfuse.so.2`; verified via `--appimage-extract` that `resources/app.asar` is present and contains the expected main entry.

**2026-01-17 13:00 (Build Iteration):** Task 10 auto-updater decision:

**2026-01-17 13:02 (Build Iteration):**
- Created `NEURONS.md` codebase map (Task 11.1).
- **Defer auto-updates for v1**. We currently have no stable publishing channel/URL for update artifacts.
- Revisit once we choose a channel (e.g., GitHub Releases + `electron-updater`, or an internal feed) and can sign builds appropriately (especially on macOS/Windows).

**2026-01-17 12:44 (Build Iteration):** Task 9 complete - Keyboard shortcuts and accessibility:
- Added global shortcuts via Electron's globalShortcut API (Ctrl+Shift+N, Ctrl+Shift+Q)
- Added local Ctrl+N shortcut in renderer via useKeyboardShortcuts hook
- Created system tray with Matrix-themed "N" icon (SVG-based nativeImage)
- Added IPC channels for shortcut events from main → renderer
- Enhanced QuickCapture with forwardRef for programmatic focus
- Added ARIA attributes throughout (role, aria-label, aria-describedby)
- Added visually-hidden class for screen reader hints
- Fixed tsconfig.json references issue (removed composite project reference)
- Created src/renderer/types/electron.d.ts for Window.electronAPI types

---

## How Ralph Uses This File

**Planning Mode (Iteration 1, every 3rd):**
- Analyze current state vs. THOUGHTS.md goals
- Update task priorities based on dependencies
- Add newly discovered tasks
- Remove or archive completed tasks

**Building Mode (Other iterations):**
- Read this file FIRST every iteration
- Find the FIRST unchecked `[ ]` task (top to bottom through priorities)
- Implement ONLY that ONE task
- Mark completed: `[x]`
- Add discoveries under "Discoveries & Notes"
- Commit and STOP

**One Task Per Iteration:** Ralph implements exactly ONE task per BUILD iteration, then stops to let the loop restart with fresh context.
