# Implementation Plan - NeoQueue

Last updated: 2026-01-17 13:47:15

## Current State

**App status:** Phase 3 (Polish) in progress. Core “list-first” workflow is implemented and usable; remaining work is primarily UX polish and optional feature alignment with the original (more ambitious) THOUGHTS.md canvas concept.

**What exists today (verified):**
- Electron main process + Vite/React renderer wired and working.
- Persistence via `electron-store` (IPC save/load + renderer hook with optimistic updates/rollback).
- Core queue workflow:
  - Add item quickly (Enter-to-add)
  - Copy item text (one-click)
  - Follow-ups (expand/collapse + inline add)
  - Completion workflow (Queue vs Discussed tabs)
  - Delete items
- Search/filter:
  - Header search box filters item text + follow-up text
  - Ctrl/Cmd+F focuses search; Esc clears active search
- Power-user ergonomics:
  - Ctrl/Cmd+N focuses new item input (renderer)
  - Global shortcuts: Ctrl/Cmd+Shift+N (show + focus new item), Ctrl/Cmd+Shift+Q (toggle window)
  - System tray menu + double-click to show window
- Matrix polish:
  - Optional scanline/CRT overlay (default off) persisted in `localStorage`
  - Brief pulse/glitch animations on key actions (add/copy/complete/restore)
- Data integrity:
  - Export JSON + Markdown via Electron save dialog (Help panel buttons)
  - Best-effort debounced secondary backup to `Documents/NeoQueue Backups/backup-latest.json`
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
- Undo is not implemented yet (export + a best-effort backup are implemented).
- Import is not implemented (export-only today).

## Goal

Ship a polished NeoQueue v1 that meets the *practical* MVP goals (fast capture, follow-ups, completion, persistence, keyboard/tray workflow) and is ready to package/install with correct branding. Secondary goal: selectively align THOUGHTS.md “nice-to-have” features (search/filter, onboarding, subtle Matrix effects) without destabilizing core flows.

## Prioritized Tasks

### High Priority (Next Build Iterations)

- [ ] **Task 16:** Data integrity (undo + import)
  - [x] Optional: **undo** (single-step) for the most recent destructive action (complete/restore/delete/add).
    - Keep scope tight: single-step, in-memory history only; clear history on restart.
    - Must be safe with persistence (no corrupt state; graceful if undo fails).
  - [ ] Optional: **import JSON** (round-trip with export)
    - Use file picker in main process; validate schema + migrate dates.
    - Guardrails: show confirmation before overwriting current state.

- [ ] **Task 17:** Window behavior polish
  - [ ] Add a **close-to-tray** option (intercept window close event and hide instead)
    - Persist setting (likely in `electron-store`)
  - [ ] Remember window size/position across restarts (`BrowserWindow.getBounds()` → persist → restore)
  - [ ] Ensure behavior is sane on multi-monitor changes (fallback to centered default)

### Medium Priority (Feature Alignment / UX)

- [ ] **Task 18:** “Right-click copy + follow-up” ergonomics (list-first compatible)
  - Optional alternative to the canvas spec: add a context-menu/right-click action on an item to copy text and auto-open the follow-up input.
  - Keep existing one-click copy button.

- [ ] **Task 19:** Empty states + lightweight notification text
  - Add Matrix-flavored empty states for Queue/Discussed.
  - Optional: show “N items in your Queue” on startup (in-app, not OS-level notifications).

### Low Priority (Bigger Spec Items / Future)

- [ ] **Task 15:** Reconcile THOUGHTS.md “canvas” concept vs current list UI
  - Decide: keep list UI for v1 (recommended) vs implement click-to-create canvas.
  - If keeping list: update THOUGHTS.md to reflect the chosen UX.

- [ ] **Task 20:** Window controls (always-on-top / pin)
  - Add an always-on-top toggle (pin button) and persist the preference.

---

### Completed (Log)

- [x] **Task 10:** Build & distribution readiness
- [x] **Task 11:** Documentation & onboarding
- [x] **Task 13:** Two-tab UI (Queue / Discussed)
- [x] **Task 14:** Matrix polish effects (tasteful)

## Discoveries & Notes

**2026-01-17 (Planning update):**
- THOUGHTS.md includes several “aspirational” features (canvas UI, right-click workflow, always-on-top, etc.) that diverge from the shipped **list-first** UI. This is intentional for v1; we should later reconcile THOUGHTS.md to match reality if we commit to list-first.
- Data integrity status:
  - Export (JSON + Markdown) exists.
  - Best-effort debounced backup exists.
  - Undo + import are the remaining notable gaps.
- Window behavior today:
  - Global shortcut toggles window visibility (`CommandOrControl+Shift+Q` uses `mainWindow.hide()`)
  - No close-to-tray intercept and no persisted window bounds yet.
- UX gaps still worth considering for v1 (list-first compatible): context-menu/right-click copy+follow-up, empty states, and a lightweight “pending count” message.

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
