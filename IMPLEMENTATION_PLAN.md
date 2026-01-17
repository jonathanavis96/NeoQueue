# Implementation Plan - NeoQueue

Last updated: 2026-01-17 15:45:26

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

- [x] **Task 25:** Canvas prototype (click-to-create) behind a feature flag
  - Goal: explore the original canvas-first concept without destabilizing v1.
  - Notes from audit: there is currently **no feature-flag framework** in the codebase.

- [x] **Task 25.1:** Add a minimal “experimental flags” mechanism
  - Options:
    - Environment-based: `import.meta.env.VITE_*` (renderer) + `process.env` (main)
    - Persisted user toggle (Help panel) backed by `electron-store` / localStorage
  - Deliverable: a single boolean flag like `experimental.canvas` that can gate UI.

- [x] **Task 25.2:** Implement a basic Canvas view (renderer-only)
  - Click blank area to open an input at cursor position
  - Save creates a normal QueueItem (same underlying data model)
  - No dragging / layout persistence in v1 of the prototype

- [x] **Task 25.3:** Provide navigation for Canvas (while flagged)
  - Simple toggle/button to switch “List” vs “Canvas” when enabled
  - Ensure keyboard-only usage still works (Escape to cancel, Enter to save)

- [x] **Task 26:** Tab-autocomplete + learned dictionary (THOUGHTS.md)
  - Goal: speed up entry of recurring technical terms (projects, filenames, acronyms) without turning NeoQueue into an editor.
  - Constraints:
    - Must not break keyboard navigation (Tab should still move focus when no suggestion is active).
    - Must not conflict with existing shortcuts (Ctrl/Cmd+N, Ctrl/Cmd+F, Ctrl/Cmd+Z, Esc).
    - Should be opt-in until proven stable (behind an experimental flag or setting).

- [x] **Task 26.1:** Define autocomplete scope + UX rules (spec)
  - **Where it applies (v1 of autocomplete):**
    - QuickCapture (new item)
    - Follow-up input (QueueItemCard)
    - Canvas draft input (only when Canvas flag enabled)
    - **Not** SearchBox (search should remain literal)
  - **Tokenization:**
    - Current token is the contiguous run of allowed characters immediately before the cursor.
    - Split boundaries are any characters outside this set: `[A-Za-z0-9._\-/]`.
    - Examples:
      - `foo-bar` is one token.
      - `src/main.ts` is one token.
      - `hello,world` is two tokens (`hello` and `world`).
  - **When suggestion appears:** only after user has typed **3+ characters** in the current token.
  - **Suggestion source:** learned dictionary tokens (case-insensitive match), but suggestions should preserve original casing from the stored token.
  - **Key behavior precedence (from highest to lowest):**
    1. `Esc`: if suggestion UI is visible, dismiss it (do not clear the input); otherwise fall back to existing Esc behavior (e.g., clear in QuickCapture / cancel draft in Canvas).
    2. `Tab`:
       - If suggestion is active/visible: accept selected suggestion (keep focus; prevent default).
       - Else: allow normal focus traversal (do not prevent default).
    3. `Shift+Tab`: if suggestions visible, cycle backward; otherwise normal focus traversal.
    4. `ArrowUp/ArrowDown`: if suggestions visible, cycle selection; otherwise do nothing special.
    5. `Enter`: keep current behavior (submit/add). Suggestion acceptance is optional.
  - **Suggestion ordering:**
    - Prefix matches first.
    - Stable ordering for predictability (alphabetical as tie-breaker).
  - **Accessibility:** suggestion UI should be announced without stealing focus. Prefer `aria-controls` + `role="listbox"` and `aria-activedescendant`, or an `aria-live="polite"` summary if we keep UI minimal.
  - **Non-goals:** fuzzy matching, spellcheck replacement, or suggestions inside SearchBox.

- [x] **Task 26.2:** Implement minimal learned dictionary (persistence)
  - Data: `string[]` unique (case-insensitive compare), size-limited (e.g., 500 entries).
  - Seed with a small built-in dev list (e.g., Electron, React, TypeScript, CI, PR, Git).
  - Learning rule: learn tokens from submitted item/follow-up text (ignore tokens < 3 chars; ignore pure numbers/punctuation).
  - Storage approach:
    - Prefer `electron-store` via IPC so it persists alongside other app state and benefits from backup/export/import.
    - Fallback: localStorage (renderer-only) if IPC is deferred.

- [x] **Task 26.3:** Implement autocomplete engine + hook (renderer)
  - Pure function: `getSuggestions(prefix, dictionary, limit)`.
  - Hook: token detection + suggestion list + selected index + key handling (Tab/Shift+Tab/Esc).
  - Keep implementation UI-agnostic so multiple inputs can reuse it.

- [x] **Task 26.4:** Integrate autocomplete UI into existing inputs
  - Pick one UI: inline ghost text OR a small popover anchored under the input.
  - Must degrade gracefully: if suggestion UI fails, typing/submitting still works.
  - Ensure feature is gated (experimental flag or setting).

- [x] **Task 26.4.1:** Integrate autocomplete popover into QuickCapture
  - Done: `QuickCapture` uses `useAutocomplete` + `AutocompletePopover`.
  - Gated behind `VITE_EXPERIMENTAL_AUTOCOMPLETE`.

- [x] **Task 26.4.2:** Integrate autocomplete into follow-up input (QueueItemCard)
  - Same key precedence rules as QuickCapture.
  - Must not interfere with Enter-to-submit and Escape-to-clear.

- [x] **Task 26.4.3:** Integrate autocomplete into Canvas draft input (CanvasView)
  - Only when Canvas is enabled.
  - Ensure Esc still cancels draft when suggestions are not open.

- [x] **Task 26.4.4:** Autocomplete QA pass (keyboard + a11y)
  - Verify Tab behavior: accepts suggestion only when open; otherwise focus traversal.
  - Verify `aria-controls` + `aria-activedescendant` wiring is correct.

- **Task 27:** Spellcheck/autocorrect tuning for technical text inputs (THOUGHTS.md)
  - Reality check: Electron/Chromium spellcheck customization is non-trivial; keep scope pragmatic.
  - Current state (2026-01-17): we do **not** explicitly control spellcheck/autocorrect in any input; Chromium defaults apply.

- [x] **Task 27.1:** Decide target behavior (spec)
  - **Decision for v1:** take **Option A** below (disable spellcheck + autocorrect-ish behaviors in authoring inputs).
  - **Option A (recommended / simplest):** Disable spellcheck + autocorrect-ish behaviors for *authoring* inputs where users type filenames, symbols, and technical tokens.
    - Add to inputs:
      - `spellCheck={false}`
      - `autoCorrect="off"` (harmless in Chromium, useful for completeness)
      - `autoCapitalize="off"`
    - Applies to:
      - QuickCapture input
      - Follow-up input
      - Canvas draft input (when enabled)
    - Does **not** apply to SearchBox (search should remain literal; spellcheck suggestions are not harmful but are optional).
  - **Option B:** Leave spellcheck as-is and rely on learned dictionary/autocomplete to reduce friction.
  - **Option C (hard / likely out-of-scope):** Token-based suppression ("code-aware" spellcheck). Likely requires a custom editor layer or OS-level integration; treat as a research spike before committing.

- [x] **Task 27.2:** Implement the minimal safe changes (if Option A is chosen)
  - Added `spellCheck={false}` + `autoCorrect="off"` + `autoCapitalize="off"` to the relevant authoring inputs (QuickCapture, follow-up, Canvas draft).
  - Ensure this does not break:
    - Enter-to-submit
    - Escape-to-clear/cancel
    - Tab/Shift+Tab focus traversal when autocomplete suggestions are not open

- [x] **Task 27.3:** QA pass: spellcheck + keyboard behavior
  - Verify red-underlines are gone in authoring inputs for technical tokens (e.g., `src/main.ts`, `AGENTS.md`, `userId`).
  - Verify SearchBox behavior unchanged.

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
- Confirmed: no existing tab-autocomplete or spellcheck/autocorrect tuning code exists in `src/`.
- Autocomplete targets should be limited to QuickCapture + follow-up inputs (and optional Canvas draft input) to avoid surprising behavior in Search.
- Recommendation: keep autocomplete opt-in behind an experimental flag or explicit setting until stable.

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

**2026-01-17 (Build Iteration): Task 27.3 spellcheck QA**
- Confirmed authoring inputs have `spellCheck={false}`, `autoCorrect="off"`, `autoCapitalize="off"`:
  - QuickCapture input
  - Follow-up input (QueueItemCard)
  - Canvas draft input
- Confirmed SearchBox unchanged (still uses default browser spellcheck behavior).
- Ran: `npm run type-check`, `npm run lint`.

**2026-01-17 (Build Iteration): Task 25/25.2/25.3 Canvas prototype (flagged)**
- Added `CanvasView` renderer prototype: click-to-create input at cursor, Enter to save (creates a normal QueueItem), Escape to cancel.
- Added deterministic "scatter" rendering for existing items (no drag/layout persistence in this prototype).
- Added List/Canvas toggle UI in header when `VITE_EXPERIMENTAL_CANVAS` is enabled.
- Updated Ctrl/Cmd+N shortcut handling: in Canvas mode it opens a centered draft input instead of focusing QuickCapture.

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
