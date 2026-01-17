# Implementation Plan - NeoQueue

Last updated: 2026-01-17 13:08:12

## Current State

**App status:** Phase 1 (Foundation) ✅ complete. Phase 2 (Core list-based workflow) ✅ complete. Entering Phase 3 (Polish, feature alignment with THOUGHTS.md, and distribution readiness).

**What exists today (verified):**
- Electron main process + Vite/React renderer wired and working.
- Persistent local storage via `electron-store` (save/load IPC + renderer hook with optimistic updates).
- Queue workflow:
  - Add item quickly (Enter-to-add)
  - One-click copy to clipboard
  - Follow-ups (expand/collapse + inline add)
  - Completion workflow (Active vs Discussed sections)
- Power-user ergonomics:
  - Ctrl+N (renderer) focus input
  - Ctrl+Shift+N (global) focus input
  - Ctrl+Shift+Q (global) toggle window
  - System tray menu + double-click to show window

**Not yet implemented (from THOUGHTS.md / DoD):**
- Real distribution assets (app icon + tray icon files wired to electron-builder).
- NEURONS.md codebase map.
- Onboarding/help and richer README (screenshot/GIF).
- “Matrix polish” effects (scanlines/glitch/digital rain) and richer empty states.
- Spec divergence: THOUGHTS.md describes a canvas + click-to-create / right-click copy+follow-up flow, plus two-tab UI and search/filter. Current app is list-first and does not implement canvas or search.

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

- [ ] **Task 11:** Documentation & onboarding
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

- [ ] **Task 12:** Add search/filter for items
  - Add a search box (at least for Active; ideally both Active/Discussed)
  - Real-time filter by item text + follow-up text
  - Keep keyboard flow solid (Ctrl+F focuses search, Esc clears)

- [ ] **Task 13:** Two-tab UI (Queue / Completed)
  - Currently items are displayed as two sections in one scroll.
  - Add a tab bar and persist selected tab (optional).

- [ ] **Task 14:** Matrix polish effects (tasteful)
  - Add subtle scanline/CRT overlay (toggleable; default off)
  - Add short glitch animation on: copy, add item, complete
  - Avoid distraction; keep 60fps.

- [ ] **Task 16:** Data integrity “nice-to-have” (post-v1 unless needed)
  - Export JSON (and optionally Markdown)
  - Optional debounced backup to a secondary location (Windows-safe pathing)
  - Optional undo (even single-step) if it can be implemented safely

### Low Priority (Bigger Spec Items / Future)

- [ ] **Task 15:** Reconcile THOUGHTS.md “canvas” concept vs current list UI
  - Decide: keep list UI for v1 (recommended) vs implement click-to-create canvas.
  - If keeping list: update THOUGHTS.md to reflect the chosen UX.

- [ ] **Task 17:** Window behavior polish
  - Close-to-tray option
  - Remember window size/position

## Discoveries & Notes

**2026-01-17 (Planning update):**
- THOUGHTS.md includes several “aspirational” features that diverge from the current shipped UI (canvas, right-click flow, backup/undo/export). Current app is a *list-first* workflow and already satisfies many practical MVP goals.
- The biggest *user-facing* gap to shipping v1 is onboarding/documentation: README needs screenshots + current shortcut/tray info; app likely needs a minimal in-app “How to use” panel.
- Data-integrity items in THOUGHTS.md (backup, undo, export) should be treated as post-v1 unless needed; they add complexity and should be tackled carefully.

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
