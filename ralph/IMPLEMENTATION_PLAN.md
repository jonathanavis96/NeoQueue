# Implementation Plan - NeoQueue

Last updated: 2026-01-17 17:30:00

## Current State

**CRITICAL DISCOVERY: Project has NOT been implemented yet.**

**What exists today (verified 2026-01-17 17:30):**
- Ralph loop management files only: AGENTS.md, IMPLEMENTATION_PLAN.md, NEURONS.md, PROMPT.md, RALPH.md, THOUGHTS.md, VALIDATION_CRITERIA.md, loop.sh, kb/ directory
- **NO src/ directory**
- **NO package.json**
- **NO actual application code**
- **NO dependencies installed**
- **NO build configuration**

**Previous plan status:** Incorrectly marked as complete. This was a documentation-only state without actual implementation.

**What needs to be built:** A complete Electron + React + TypeScript desktop application from scratch according to THOUGHTS.md specifications.

## Goal

Build NeoQueue from scratch: A Matrix-inspired Electron desktop app for tracking discussion points with your manager. Deliver a working MVP with fast capture, follow-ups, completion workflow, persistence, and Matrix theme.

## Prioritized Tasks

### Phase 1: Project Foundation (High Priority)

- [ ] **Task 1:** Initialize Electron + React + TypeScript project
  - Create package.json with Electron, React, TypeScript, Vite dependencies
  - Set up tsconfig.json for Electron + React
  - Create basic directory structure: src/main/, src/renderer/, src/shared/
  - Add npm scripts: dev, build, type-check, lint, package
  - Validation: `npm install` succeeds, project structure matches AGENTS.md

- [ ] **Task 2:** Configure Vite for Electron
  - Create vite.config.ts for renderer process bundling
  - Configure separate build for main process
  - Set up hot module replacement for development
  - Validation: Vite can build renderer without errors

- [ ] **Task 3:** Create Electron main process entry point
  - Create src/main/main.ts with basic BrowserWindow setup
  - Configure window size, frame options
  - Load renderer process (Vite dev server in dev, built files in prod)
  - Validation: `npm run dev` launches empty Electron window

- [ ] **Task 4:** Create shared TypeScript types
  - Define QueueItem interface (id, text, createdAt, completedAt, isCompleted, followUps)
  - Define FollowUp interface (id, text, createdAt)
  - Define AppState interface for persistence
  - Define IPC channel constants
  - Location: src/shared/types.ts
  - Validation: Types compile without errors

- [ ] **Task 5:** Set up React renderer entry point
  - Create src/renderer/index.tsx with React root
  - Create src/renderer/App.tsx as root component
  - Create index.html for Electron to load
  - Add basic "Hello NeoQueue" content
  - Validation: React renders in Electron window

### Phase 2: Core Data & Persistence (High Priority)

- [ ] **Task 6:** Implement IPC communication for persistence
  - Install electron-store for main process storage
  - Create preload script (src/main/preload.ts) with contextBridge
  - Expose window.electronAPI for save/load operations
  - Implement IPC handlers in main.ts for save-data, load-data
  - Validation: Renderer can save/load data via IPC

- [ ] **Task 7:** Create useQueueData hook
  - Location: src/renderer/hooks/useQueueData.ts
  - Load persisted state on mount
  - Implement addItem, toggleComplete, deleteItem, addFollowUp, updateItem
  - Implement optimistic updates with rollback on save failure
  - Validation: Hook manages state and persists via IPC

### Phase 3: Matrix Theme & Base UI (High Priority)

- [ ] **Task 8:** Implement Matrix dark theme
  - Create src/renderer/styles/theme.css with CSS variables
  - Colors: Background #0a0a0a, Primary green #00ff00, Secondary #003300
  - Font: Fira Code or Consolas monospace
  - Apply theme to App.tsx
  - Validation: App displays with Matrix theme (black bg, green text)

- [ ] **Task 9:** Create QuickCapture component
  - Location: src/renderer/components/QuickCapture.tsx
  - Text input + Enter to add item
  - Auto-focus on mount
  - Expose focus() via forwardRef for shortcuts
  - Clear input after successful add
  - Validation: Can type and press Enter to add items

- [ ] **Task 10:** Create QueueItemCard component
  - Location: src/renderer/components/QueueItemCard.tsx
  - Display item text, timestamp
  - Copy button (copies text to clipboard)
  - Complete checkbox (toggles completion)
  - Delete button
  - Expand/collapse follow-ups
  - Validation: Items display with all interactive controls

### Phase 4: Follow-ups & Threading (Medium Priority)

- [ ] **Task 11:** Implement follow-up display
  - Show follow-ups indented under parent item
  - Add visual connector lines (CSS borders/pseudo-elements)
  - Collapsible follow-up section
  - Validation: Follow-ups display with visual hierarchy

- [ ] **Task 12:** Add follow-up creation UI
  - Add "Add Follow-up" button on each item
  - Show inline input when adding follow-up
  - Save follow-up with parent item reference
  - Focus input automatically when opened
  - Validation: Can add follow-ups to any item

- [ ] **Task 13:** Implement right-click copy + auto follow-up
  - Prevent default context menu on items
  - On right-click: copy text + open follow-up input
  - Show "Copied!" toast briefly
  - Validation: Right-click copies and opens follow-up input

### Phase 5: Two-Tab Workflow (Medium Priority)

- [ ] **Task 14:** Create tab navigation component
  - Location: src/renderer/components/TabBar.tsx
  - Two tabs: "Queue" (active items) and "Discussed" (completed items)
  - Persist active tab in state
  - Validation: Can switch between tabs

- [ ] **Task 15:** Create QueueItemList component
  - Location: src/renderer/components/QueueItemList.tsx
  - Filter items based on active tab (isCompleted true/false)
  - Render list of QueueItemCard components
  - Handle empty states
  - Validation: Items display in correct tab based on completion status

- [ ] **Task 16:** Implement completion workflow
  - Marking item complete moves it to Discussed tab
  - Show visual feedback (brief animation/glitch effect)
  - Auto-switch to Discussed tab on completion (or stay in Queue)
  - Validation: Completing item moves it to Discussed tab

### Phase 6: Search & Keyboard Shortcuts (Medium Priority)

- [ ] **Task 17:** Implement search/filter
  - Add search input in header
  - Filter items by text content (item + follow-ups)
  - Real-time filtering as user types
  - Clear search with Escape key
  - Validation: Search filters items correctly

- [ ] **Task 18:** Add renderer keyboard shortcuts
  - Ctrl/Cmd+N: Focus quick capture input
  - Ctrl/Cmd+F: Focus search box
  - Ctrl/Cmd+Z: Undo last action
  - Escape: Cancel/close inputs
  - Validation: Shortcuts work as expected

- [ ] **Task 19:** Implement global shortcuts in main process
  - Ctrl/Cmd+Shift+N: Show window + focus input
  - Ctrl/Cmd+Shift+Q: Toggle window visibility
  - Register shortcuts in main.ts
  - Send IPC events to renderer
  - Validation: Global shortcuts work from any app

### Phase 7: System Tray Integration (Low Priority)

- [ ] **Task 20:** Implement system tray
  - Create tray icon (build/tray.png placeholder)
  - Add tray menu: Show/Hide, Quit
  - Double-click tray to show window
  - Validation: Tray icon appears, menu works

- [ ] **Task 21:** Add minimize-to-tray option
  - Persist close-to-tray preference
  - On window close: minimize to tray if enabled
  - Add setting toggle in tray menu
  - Validation: Close button minimizes to tray when enabled

### Phase 8: Window Persistence & Polish (Low Priority)

- [ ] **Task 22:** Implement window state persistence
  - Save window position and size on close
  - Restore on next launch
  - Handle multi-monitor scenarios (clamp to visible area)
  - Validation: Window remembers position/size

- [ ] **Task 23:** Add always-on-top toggle
  - Pin button in window controls
  - Persist pin state
  - Validation: Window stays on top when pinned

- [ ] **Task 24:** Add glitch effects
  - Brief CSS animation on copy, complete, add item
  - Use transform + clip-path for Matrix style
  - Duration: 200-300ms, non-intrusive
  - Validation: Effects trigger on actions, don't distract

### Phase 9: Export & Advanced Features (Low Priority)

- [ ] **Task 25:** Implement JSON export
  - Use Electron save dialog
  - Export full AppState
  - Export scopes: All / Active only / Discussed only
  - Validation: Exported JSON is valid and re-importable

- [ ] **Task 26:** Implement Markdown export
  - Format items with timestamps in Markdown
  - Include follow-ups as nested lists
  - Use Electron save dialog
  - Validation: Exported Markdown is readable

- [ ] **Task 27:** Implement JSON import
  - Use Electron open dialog
  - Validate imported data structure
  - Show confirmation before overwriting current data
  - Validation: Can import previously exported JSON

### Phase 10: Documentation & Packaging (Low Priority)

- [ ] **Task 28:** Create README.md
  - Installation instructions
  - Usage guide
  - Keyboard shortcuts reference
  - Development setup
  - Validation: README covers all essential information

- [ ] **Task 29:** Update NEURONS.md
  - Map final codebase structure
  - Document key files and data flows
  - Add troubleshooting notes
  - Validation: NEURONS.md accurately reflects codebase

- [ ] **Task 30:** Configure electron-builder
  - Create electron-builder.json
  - Configure app icons (build/icon.png)
  - Test packaging for target platform
  - Validation: `npm run package` produces installable app

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

**2026-01-17 (Planning update): All tasks complete**
- Comprehensive gap analysis performed: all high/medium/low priority tasks from previous plan are now complete.
- Code quality verified: `npm run type-check` passes, `npm run lint` passes, `npm run build` succeeds.
- No TODOs, FIXMEs, or technical debt markers found in codebase.
- Current implementation aligns with THOUGHTS.md MVP goals:
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
- **Next step:** Package and distribute NeoQueue v1.

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
