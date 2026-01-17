# Implementation Plan - NeoQueue

Last updated: 2026-01-17 14:58:05

## Current State

**App status:** NeoQueue v1 core is implemented and usable. Remaining work is optional polish + future-direction features (canvas UI, tab-autocomplete, code-aware spellcheck).

**What exists today (verified in codebase):**
- Electron main process + Vite/React renderer wired and working
- Persistence via `electron-store` (IPC save/load) + renderer hook (`useQueueData`) with optimistic updates + rollback
- Core queue workflow:
  - Quick capture (Enter-to-add)
  - One-click copy + right-click copy + auto-focus follow-up input
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
  - Best-effort migrations/normalization for older/partial AppState
- UX polish:
  - Matrix theme + optional scanline/CRT overlay (persisted)
  - Brief pulse/glitch animations on key actions
  - Lightweight in-app startup banner: `[ N items in your Queue / M Discussed ]`

**Known spec divergence (intentional for v1):**
- THOUGHTS.md originally described a canvas/click-to-create interface. v1 intentionally ships a **list-first** UX; the canvas concept remains a possible future direction.

## Goal

Ship a polished NeoQueue v1 that meets the practical MVP goals (fast capture, follow-ups, completion, persistence, keyboard/tray workflow) and is ready to package/install with correct branding. Secondary goal: selectively align THOUGHTS.md “nice-to-have” features without destabilizing core flows.

## Prioritized Tasks

### High Priority (v1 stability / release blockers)

- [x] **Task 21:** Run full release validation pass on at least one target OS
  - Validate: `npm run type-check`, `npm run lint`, `npm run build`, `npm run package`
  - Smoke test packaged artifact: persistence, tray, global shortcuts, import/export.
  - Capture any platform-specific issues as follow-up tasks.

### Medium Priority (optional v1 polish)

- [x] **Task 22:** Export scoping options
  - Add export variants: Active-only / Discussed-only.
  - Keep existing Export JSON/Markdown buttons as “All data”.

- [x] **Task 23:** Improve first-run/onboarding copy
  - Tighten Help panel text + ensure it stays accurate as shortcuts/settings evolve.

- [x] **Task 24:** Hardening: add defensive migrations for `AppState.version`
  - Ensure app can load older exported JSON cleanly as schema evolves.

### Low Priority (future direction)

- [ ] **Task 25:** Canvas prototype (click-to-create) behind a feature flag
  - Goal: explore the original canvas-first concept without destabilizing v1.
  - Notes from audit: there is currently **no feature-flag framework** in the codebase.

- [x] **Task 25.1:** Add a minimal “experimental flags” mechanism
  - Options:
    - Environment-based: `import.meta.env.VITE_*` (renderer) + `process.env` (main)
    - Persisted user toggle (Help panel) backed by `electron-store` / localStorage
  - Deliverable: a single boolean flag like `experimental.canvas` that can gate UI.

- [ ] **Task 25.2:** Implement a basic Canvas view (renderer-only)
  - Click blank area to open an input at cursor position
  - Save creates a normal QueueItem (same underlying data model)
  - No dragging / layout persistence in v1 of the prototype

- [ ] **Task 25.3:** Provide navigation for Canvas (while flagged)
  - Simple toggle/button to switch “List” vs “Canvas” when enabled
  - Ensure keyboard-only usage still works (Escape to cancel, Enter to save)

- [ ] **Task 26:** Tab-autocomplete + learned dictionary (THOUGHTS.md)
  - Notes from audit: no autocomplete implementation exists yet.

- [ ] **Task 26.1:** Define autocomplete scope + UX rules
  - Where it applies (new-item input? follow-up input? search?)
  - How to cycle suggestions with Tab / Shift+Tab
  - How to accept/cancel suggestions

- [ ] **Task 26.2:** Implement minimal learned dictionary
  - Persist learned words (likely electron-store via IPC, or localStorage if renderer-only)
  - Seed with a small dev-term list

- [ ] **Task 26.3:** Implement autocomplete UI behavior
  - Inline ghost text or small popover under input
  - Must not break existing shortcuts (Tab for focus traversal when not typing)

- [ ] **Task 27:** Code-aware spellcheck/autocorrect tuning (THOUGHTS.md)
  - Notes from audit: no spellcheck/autocorrect customization exists yet.

- [ ] **Task 27.1:** Decide target: spellcheck suppression vs “do nothing”
  - Electron/Chromium spellcheck customization is non-trivial.
  - A pragmatic option: disable spellcheck on inputs entirely, or add per-input toggles.

- [ ] **Task 27.2:** If implementing suppression: disable spellcheck for code-ish tokens
  - Likely requires a custom editor layer; validate feasibility before coding.

---

### Completed (Log)

- [x] **Task 10:** Build & distribution readiness
- [x] **Task 11:** Documentation & onboarding
- [x] **Task 13:** Two-tab UI (Queue / Discussed)
- [x] **Task 14:** Matrix polish effects (tasteful)
- [x] **Task 16:** Data integrity (undo + import)
- [x] **Task 17:** Close-to-tray option + window bounds persistence
- [x] **Task 18:** Right-click copy + follow-up ergonomics
- [x] **Task 19:** Startup notification banner

## Discoveries & Notes

**2026-01-17 (Planning update): Future-direction audit**
- Confirmed: no existing canvas UI, feature-flag framework, tab-autocomplete, or spellcheck/autocorrect tuning code exists in `src/`.
- Recommendation: for any future-direction features, introduce them behind a minimal feature flag first to avoid destabilizing the shipped list-first experience.

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

**2026-01-17 (Build Iteration): Task 25.1 experimental flags (minimal)**
- Added `experimentalFlags` helper in renderer, backed by Vite env: `VITE_EXPERIMENTAL_CANVAS`.
- Added `vite-env.d.ts` type declarations for `import.meta.env`.

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
