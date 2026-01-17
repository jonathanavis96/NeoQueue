# Implementation Plan - NeoQueue

Last updated: 2026-01-17 14:52:00

## Current State

**App status:** NeoQueue v1 core is implemented and usable. Remaining work is optional polish + future-direction features (canvas UI, autocomplete, etc.).

**What exists today (verified in codebase):**
- Electron main process + Vite/React renderer wired and working
- Persistence via `electron-store` (IPC save/load) + renderer hook (`useQueueData`) with optimistic updates + rollback
- Core queue workflow:
  - Quick capture (Enter-to-add)
  - One-click copy
  - Follow-ups (expand/collapse + inline add)
  - Completion workflow with tabs (**Queue** / **Discussed**)
  - Delete
  - Single-step Undo (Ctrl/Cmd+Z)
- Search/filter:
  - Header search filters item text + follow-up text
  - Ctrl/Cmd+F focuses search; Esc clears
- Power-user ergonomics:
  - Ctrl/Cmd+N focuses new-item input (renderer)
  - Global shortcuts: Ctrl/Cmd+Shift+N (show + focus new item), Ctrl/Cmd+Shift+Q (toggle window)
  - System tray menu + double-click to show window
  - Close-to-tray option (persisted) + always-on-top (pin) toggle (persisted)
  - Window bounds persistence + multi-monitor-safe restore
- Data integrity:
  - Export JSON + Markdown via Electron save dialogs
  - Import JSON via Electron open dialog + overwrite confirmation
  - Best-effort debounced secondary backup to `Documents/NeoQueue Backups/backup-latest.json`
- UX polish:
  - Matrix theme + optional scanline/CRT overlay (persisted)
  - Brief pulse/glitch animations on key actions
  - Lightweight in-app startup banner: `[ N items in your Queue / M Discussed ]`
  - Right-click item: copy text + open/focus follow-up input
- Packaging readiness:
  - electron-builder config works; `npm run package` produces artifacts (validated on Linux)

**Known spec divergence (intentional for v1):**
- THOUGHTS.md originally described a canvas/click-to-create interface. v1 intentionally ships a **list-first** UX; the canvas concept remains a possible future direction.

**Remaining notable gaps (for future work):**
- No canvas UI / click-to-create flow
- No tab-autocomplete / learned dictionary
- No code-aware spellcheck/autocorrect tuning beyond the browser defaults
- Export scoping (active-only/completed-only/date range) not implemented
- Optional OS-level notifications are not implemented (and likely out-of-scope for v1)


## Goal

Ship a polished NeoQueue v1 that meets the *practical* MVP goals (fast capture, follow-ups, completion, persistence, keyboard/tray workflow) and is ready to package/install with correct branding. Secondary goal: selectively align THOUGHTS.md “nice-to-have” features without destabilizing core flows.

## Prioritized Tasks

### High Priority (v1 stability / release blockers)

- [x] **Task 21:** Run full release validation pass on at least one target OS
  - Validate: `npm run type-check`, `npm run lint`, `npm run build`, `npm run package`
  - Smoke test packaged artifact: persistence, tray, global shortcuts, import/export.
  - Capture any platform-specific issues as follow-up tasks.

### Medium Priority (optional v1 polish)

- [x] **Task 22:** Export scoping options
  - Add export variants: Active-only / Discussed-only (date range optional).
  - Keep existing Export JSON/Markdown buttons as “All data”.

- [x] **Task 23:** Improve first-run/onboarding copy
  - Tighten Help panel text + ensure it stays accurate as shortcuts/settings evolve.
  - Consider adding a small “Settings” section (close-to-tray, always-on-top, scanlines).

- [x] **Task 24:** Hardening: add defensive migrations for `AppState.version`
  - Ensure app can load older exported JSON cleanly as schema evolves.

### Low Priority (future direction)

- [ ] **Task 25:** Canvas prototype (click-to-create) behind a feature flag
  - Keep list-first as default; do not destabilize v1.

- [ ] **Task 26:** Tab-autocomplete + learned dictionary (THOUGHTS.md)

- [ ] **Task 27:** Code-aware spellcheck/autocorrect tuning (THOUGHTS.md)

---

### Completed (Log)

- [x] **Task 10:** Build & distribution readiness
- [x] **Task 11:** Documentation & onboarding
- [x] **Task 13:** Two-tab UI (Queue / Discussed)
- [x] **Task 14:** Matrix polish effects (tasteful)
- [x] **Task 16:** Data integrity (undo + import)

## Discoveries & Notes

**2026-01-17 (Build Iteration): Task 24 AppState migrations hardening**
- Added shared `migrateAppState()` helper (`src/shared/migrations.ts`) to normalize legacy/partial state and coerce dates.
- Main process now migrates+re-saves state on load and uses the same migration path for JSON import.
- Renderer load path now tolerates missing `followUps` arrays.


**2026-01-17 (Build Iteration): Task 23 onboarding copy refresh**
- Help panel copy updated to reflect current shortcuts (including Ctrl/Cmd+F search) and current settings surfaces.
- Added a small “Settings (quick)” section (Always-on-top, Close-to-tray, Scanlines).
- Footer shortcut hint now adapts Ctrl vs Cmd based on platform.

**2026-01-17 (Build Iteration): Task 22 export scoping**
- Added scoped export variants: Active-only and Discussed-only for both JSON and Markdown.
- Implemented via new `ExportScope`/`ExportOptions` types, renderer helper functions, and additional Help panel buttons.
- Main process uses scoped suffixes in default filenames (e.g., `neoqueue-export-active-YYYY-MM-DD.*`).


**2026-01-17 (Build Iteration): Task 21 release validation pass**
- Ran: `npm run type-check`, `npm run lint`, `npm run build`, `npm run package` (Linux/WSL2).
- Packaging succeeded and produced `release/NeoQueue-1.0.0.AppImage` and `release/linux-unpacked/resources/app.asar`.
- Note: electron-builder warns about macOS category mapping on Linux; benign.

**2026-01-17 (Planning update):**
- Task 15 note: THOUGHTS.md has been updated to reflect the v1 **list-first** UX; the canvas model is now explicitly positioned as a future direction.

**2026-01-17 (Planning update):**
- THOUGHTS.md “Success Metrics” emphasize right-click copy+follow-up and a canvas UI; v1 intentionally ships a **list-first** UX. Task 18 is the lowest-risk way to approximate the right-click ergonomics without a full canvas rewrite.
- Task 19 note: Matrix-flavored empty states are already present in `src/renderer/components/QueueItemList.tsx` + `.queue-list-empty` styles. The only remaining scope is the optional in-app startup “N items in your Queue” text.
- Window behavior (historical note): previous plan iterations noted missing bounds persistence; this has since been implemented (bounds + maximize state + multi-monitor-safe restore).

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

**2026-01-17 (Build Iteration): Task 17 close-to-tray option**
- Added persisted `closeToTray` setting (electron-store).
- Intercepts window close to hide to tray when enabled (and a tray exists).
- Added tray context menu checkbox to toggle close-to-tray.
- Ensures real quit still works by setting an `isQuitting` guard via `app.on('before-quit')`.

**2026-01-17 (Build Iteration): Task 19 startup notification banner**
- Added a lightweight in-app banner just below QuickCapture showing: `[ N items in your Queue / M Discussed ]`.
- Shows only once per session, only after initial load completes, and only when there is at least 1 active item.
- Auto-dismisses after ~4.5s; includes a manual dismiss (×) control.

**2026-01-17 (Build Iteration): Task 18 right-click copy + follow-up ergonomics**
- Added `onContextMenu` handler on `QueueItemCard` to copy item text, expand follow-ups, and focus the follow-up input.
- Does not hijack right-click on interactive child elements (buttons/inputs).
- Updated Help panel copy hint accordingly.

**2026-01-17 (Build Iteration): Task 17 window bounds persistence**
- Persisted window bounds (`windowState.bounds`) + maximize state (`windowState.isMaximized`) to `electron-store`.
- Restores size/position on startup and re-maximizes if needed.
- Debounces saves during move/resize/maximize/unmaximize to avoid excessive disk writes.

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
