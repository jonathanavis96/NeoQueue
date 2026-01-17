# Implementation Plan - NeoQueue

Last updated: 2026-01-17 17:32:39

## Current State

**PROJECT STATUS: NeoQueue v1 MVP Complete - Security Updates Required ⚠️**

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
- Data integrity / portability:
  - Export JSON + Markdown via Electron save dialogs
  - Export scoping: All / Active-only / Discussed-only
  - Import JSON via Electron open dialog + overwrite confirmation
  - Best-effort debounced secondary backup to `Documents/NeoQueue Backups/backup-latest.json`
  - Best-effort migrations/normalization for older/partial AppState
- UX polish:
  - Matrix theme + optional scanline/CRT overlay (persisted)
  - Brief pulse/glitch animations on key actions
  - Lightweight in-app startup banner: `[ N items in your Queue / M Discussed ]`
- Experimental prototypes (env-flag gated):
  - Canvas view (click-to-create) behind `VITE_EXPERIMENTAL_CANVAS`
  - Tab-autocomplete (learned dictionary + popover) behind `VITE_EXPERIMENTAL_AUTOCOMPLETE`
  - Spellcheck/autocorrect behavior disabled in authoring inputs (QuickCapture / follow-ups / Canvas draft)

**Known spec divergence (intentional for v1):**
- THOUGHTS.md began as a canvas-first design. v1 intentionally ships a **list-first** UX; Canvas remains optional/future.
- THOUGHTS.md mentions a specific `/mnt/e/...` backup target. Current implementation uses a safer cross-platform default (`Documents/NeoQueue Backups/`).

## Goal

Ship a polished NeoQueue v1 that meets MVP goals (fast capture, follow-ups, completion, persistence, keyboard/tray workflow) and is ready to package/install. Secondary goal: selectively align THOUGHTS.md “nice-to-have” items without destabilizing core flows.

## Prioritized Tasks

**Summary:** All MVP features complete. 4 security updates required before distribution.

### High Priority (Security) - REQUIRED FOR v1 RELEASE

**⚠️ CRITICAL:** The following dependency updates fix known security vulnerabilities and MUST be completed before packaging/distributing NeoQueue.

- [x] **Task 35:** Update Electron to v35.7.5+ (fixes ASAR Integrity Bypass - GHSA-vmqv-hx8q-j7mg)
  - Current: electron@28.1.0 (vulnerable)
  - Target: electron@35.7.5+ (or latest stable in 35.x/36.x)
  - Breaking changes likely between v28 → v35+
  - API migration required: Check Electron release notes for deprecated APIs
  - Full regression test after update: app launch, IPC, tray, global shortcuts, window controls
  - Validation: `npm run dev`, `npm run build`, `npm run package` all succeed

- [ ] **Task 36:** Update Vite/esbuild (fixes dev server request vulnerability - GHSA-67mh-4wv8-2f99)
  - Current: vite@5.0.10 (vulnerable to path traversal in dev server)
  - Target: vite@6.1.7+ or latest stable in 6.x
  - Review breaking changes: Vite 5 → 6 migration guide
  - Update vite.config.ts if needed (plugin API changes)
  - Update @vitejs/plugin-react to compatible version
  - Validation: `npm run dev` works, hot reload works, `vite build` succeeds

- [ ] **Task 37:** Update electron-builder and tar (fixes Arbitrary File Overwrite - GHSA-8qq5-rm4j-mr97)
  - Current: electron-builder@24.9.1 (depends on vulnerable tar versions)
  - Target: electron-builder@latest stable (25.x or newer)
  - Check build configuration compatibility in package.json
  - May require electron-builder.yml adjustments
  - Validation: `npm run package` produces valid AppImage/NSIS/DMG for target platform

- [ ] **Task 38:** Final security audit and validation
  - Run `npm audit` - should show 0 high/critical vulnerabilities
  - Run `npm audit fix` if safe automatic fixes available
  - Manual review of any remaining moderate/low vulnerabilities
  - Full validation suite:
    - `npm run type-check` (no type errors)
    - `npm run lint` (no linting errors)
    - `npm run build` (production build succeeds)
    - `npm run package` (distributable package created)
  - Smoke test packaged app: install, launch, create item, persistence works
  - Document any remaining vulnerabilities with justification if unfixable

### Completed High Priority

- [x] **Task 28:** Matrix-flavored empty states (Queue + Discussed) without harming "No Results" messaging

### Completed Medium Priority

- [x] **Task 29:** Date-range export (optional but requested in THOUGHTS.md)
- [x] **Task 30:** Make secondary backup location configurable (opt-in)

### Completed Low Priority (future direction)

- [x] **Task 31:** Persist experimental flags as user settings (not only env vars)
- [x] **Task 32:** Canvas prototype v2 (layout persistence + basic drag)
- [x] **Task 33:** Align search behavior with THOUGHTS.md (optional)
- [x] **Task 34:** Inline edit of item text (optional)

## Discoveries & Notes

**2026-01-17 (Planning update): gap audit**
- Date-range export is mentioned in THOUGHTS.md but does not exist in `src/`.
- Secondary backup already exists, but targets `Documents/NeoQueue Backups/` rather than `/mnt/e/...`.

**2026-01-17 (Planning update): additional gaps (optional/future)**
- THOUGHTS.md search spec differs slightly from current implementation:
  - Spec: search persists within tab and clears on tab switch; includes timestamps.
  - Current: single search query across both tabs; filters item + follow-up text only.
- THOUGHTS.md mentions double-click edit; current code has `updateItem` in `useQueueData` but no UI affordance.
- Experimental flags are env-var driven only; no settings UI exists to toggle them at runtime.

**2026-01-17 (Build): Task 28 complete**
- Updated *true empty* messaging to be Matrix-flavored (Queue + Discussed).
- Kept existing “No Results” messaging for search-filtered empty states.

**2026-01-17 (Build): Task 29 complete**
- Added date-range export via Help panel (field: Created/Completed; From/To; JSON/Markdown).
- Date parsing/validation: expects `YYYY-MM-DD`, inclusive end date, rejects invalid/empty range (from > to).
- Existing scoped exports (All/Active/Discussed) remain unchanged.

**2026-01-17 (Build): Task 30 complete**
- Secondary backup location can now be customized via the tray menu (set folder / revert to default).
- Detects and offers the legacy `/mnt/e/6 - Text/a - Work/Code` path when present.
- Backup remains best-effort and non-blocking; failures log warnings but don't break saves.

**2026-01-17 (Build): Task 31 complete**
- Experimental flags (Canvas / Autocomplete) are now persisted in AppState under `settings.experimentalFlags`.
- Help panel includes toggles for these experimental features.
- Runtime flag evaluation uses persisted overrides layered on top of Vite env defaults (env remains the baseline).

**2026-01-17 (Build): Task 32 complete**
- Added Canvas layout persistence via `settings.canvasLayout.positions` (keyed by `QueueItem.id`, stored as `%` coordinates).
- Canvas nodes are now draggable; drag updates are applied optimistically during drag and persisted on pointer release.
- `CURRENT_APP_STATE_VERSION` bumped to 4; migration is best-effort and clamps invalid coordinates.

**2026-01-17 (Build): Task 33 complete**
- Search now clears when switching between Queue/Discussed tabs (including auto-switches).
- Search matches now include item/follow-up timestamps (ISO strings) in addition to text.

**2026-01-17 (Build): Task 34 complete**
- Added inline edit for active queue items via double-click.
- Edit input commits on Enter/blur and cancels on Escape; empty edits revert to original text.

**2026-01-17 17:32 (Planning mode): MVP feature development complete**
- Comprehensive gap analysis performed: all high/medium/low priority MVP tasks (Tasks 1-34) are now complete.
- Code quality verified: `npm run type-check` ✓, `npm run lint` ✓, `npm run build` ✓
- No TODOs, FIXMEs, or technical debt markers found in codebase.
- Current implementation fully aligns with THOUGHTS.md MVP goals:
  - List-first capture workflow ✅
  - Two-tab interface (Queue/Discussed) ✅
  - Copy + follow-up ergonomics ✅
  - Matrix theme + tasteful effects ✅
  - Keyboard shortcuts + global hotkeys ✅
  - System tray integration ✅
  - Data persistence + backups ✅
  - Export/import (JSON + Markdown) ✅
  - Search/filter ✅
  - Undo ✅
  - Experimental prototypes (Canvas, Autocomplete) ✅

**2026-01-17 17:32 (Planning mode): Security audit reveals critical vulnerabilities**
- `npm audit` identified vulnerabilities in:
  - electron@28.1.0 (GHSA-vmqv-hx8q-j7mg - ASAR Integrity Bypass)
  - vite@5.0.10 (GHSA-67mh-4wv8-2f99 - Dev Server Path Traversal)
  - electron-builder@24.9.1 dependencies (GHSA-8qq5-rm4j-mr97 - Tar File Overwrite)
- **Action required:** Update dependencies (Tasks 35-38) before packaging for distribution
- **Risk:** Cannot safely distribute v1 until security vulnerabilities are resolved
- **Next step:** Begin security update tasks in BUILD mode

**2026-01-17 (Build): Task 35 complete**
- Electron updated to v35.7.5 (fixes GHSA-vmqv-hx8q-j7mg ASAR Integrity Bypass vulnerability)
- Full validation suite passed:
  - `npm run type-check` ✓ (no type errors)
  - `npm run lint` ✓ (no linting errors)
  - `npm run build` ✓ (production build succeeded)
  - `npm run package` ✓ (AppImage 108MB created successfully)
  - `npm run dev` ✓ (app launches and runs correctly)
- No breaking API changes required between v28 → v35.7.5
- All core functionality verified: IPC, persistence, tray, shortcuts, window controls

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
- [x] **Task 21:** Release validation pass (type-check, lint, build, package)
- [x] **Task 22:** Export scoping (All / Active-only / Discussed-only)
- [x] **Task 23:** Onboarding/help copy refresh
- [x] **Task 24:** AppState migrations hardening
- [x] **Task 25:** Canvas prototype (flagged)
- [x] **Task 25.1:** Minimal experimental flags mechanism
- [x] **Task 25.2:** Basic Canvas view (renderer-only)
- [x] **Task 25.3:** Navigation for Canvas (flagged)
- [x] **Task 26:** Tab-autocomplete + learned dictionary
- [x] **Task 26.1:** Define autocomplete scope + UX rules
- [x] **Task 26.2:** Implement minimal learned dictionary (persistence)
- [x] **Task 26.3:** Implement autocomplete engine + hook (renderer)
- [x] **Task 26.4:** Integrate autocomplete UI into existing inputs
- [x] **Task 26.4.1:** Autocomplete popover in QuickCapture
- [x] **Task 26.4.2:** Autocomplete in follow-up input
- [x] **Task 26.4.3:** Autocomplete in Canvas draft input
- [x] **Task 26.4.4:** Autocomplete QA pass (keyboard + a11y)
- [x] **Task 27:** Spellcheck/autocorrect tuning for technical text inputs
- [x] **Task 27.1:** Decide target behavior (spec)
- [x] **Task 27.2:** Implement the minimal safe changes
- [x] **Task 27.3:** QA pass: spellcheck + keyboard behavior

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
