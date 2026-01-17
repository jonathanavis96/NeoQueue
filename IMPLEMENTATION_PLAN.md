# Implementation Plan - NeoQueue

Last updated: 2026-01-17 12:41:46

## Current State

**Current State:** Phase 1 Foundation COMPLETE. Phase 2 Core Features COMPLETE. Ready for Phase 3 Polish.

**Purpose:** Matrix-inspired desktop app for tracking discussion points to raise with manager

**Project Type:** Electron desktop app with React frontend

**Phase:** Phase 3 - Polish & Distribution

## Goal

Build a complete Matrix-inspired desktop app (NeoQueue) for tracking discussion points to raise with manager. Core features:
1. **Friction-free capture** - Quick entry of discussion items with one-click copy to clipboard ✅
2. **Follow-up threading** - Add follow-up notes/comments to existing items ✅
3. **Completion workflow** - Mark items as discussed, archive completed items ✅

The Matrix theme means: dark green/black color scheme, "digital rain" aesthetic, terminal-like fonts.

## Prioritized Tasks

### High Priority - Phase 1: Project Setup & Foundation ✅ COMPLETE

- [x] **Task 1:** Create project documentation files ✅
  - Create THOUGHTS.md with project vision and success criteria
  - Create AGENTS.md with operational guidance
  - Create basic README.md
  - Target: All documentation files exist and define the project clearly

- [x] **Task 2:** Initialize Electron + React project structure ✅
  - Set up package.json with Electron, React, TypeScript dependencies
  - Configure TypeScript with tsconfig.json
  - Set up Vite as bundler for React
  - Create directory structure: src/main/, src/renderer/, src/shared/
  - Target: `npm install` succeeds, basic Electron app launches

- [x] **Task 3:** Configure development environment ✅
  - Set up Electron main process entry point (src/main/main.ts)
  - Configure Vite dev server for React renderer (vite.config.ts)
  - Set up preload script (src/main/preload.ts)
  - Add electron-builder for packaging (package.json)
  - Target: `npm run dev` launches Electron with React window

- [x] **Task 4:** Implement Matrix theme and core layout ✅
  - Create Matrix-inspired CSS theme (src/renderer/styles/index.css)
  - CSS variables defined: --matrix-black, --matrix-green, --matrix-green-dim, etc.
  - Monospace font configured (Fira Code, Consolas)
  - Basic App component with header (src/renderer/App.tsx)
  - Target: App displays with Matrix aesthetic

- [x] **Task 5:** Implement data persistence layer ✅
  - electron-store integrated in main.ts with IPC handlers (SAVE_DATA, LOAD_DATA, GET_VERSION)
  - API exposed via preload.ts (saveData, loadData, getVersion)
  - useQueueData hook in src/renderer/hooks/useQueueData.ts with:
    - addItem, updateItem, deleteItem, toggleComplete, addFollowUp
    - Automatic load on mount, optimistic updates with rollback
  - Target: ✅ Can save and load queue items persistently

### Medium Priority - Phase 2: Core Features (UI Components) ✅ COMPLETE

- [x] **Task 6:** Implement friction-free item capture and list display ✅
  - ✅ QuickCapture component with Enter-to-add (src/renderer/components/QuickCapture.tsx)
  - ✅ QueueItemList displays items with Active/Discussed sections
  - ✅ QueueItemCard with one-click copy to clipboard
  - ✅ App.tsx wires components to useQueueData hook
  - Target: ✅ Can add items quickly and copy them to clipboard

- [x] **Task 7:** Implement follow-up threading ✅
  - ✅ Expandable section in QueueItemCard with isExpanded state
  - ✅ addFollowUp wired from useQueueData through QueueItemList to QueueItemCard
  - ✅ Follow-ups displayed with relative timestamps via formatRelativeTime
  - ✅ Inline input for adding new follow-ups with Enter-to-submit
  - ✅ "[+ follow-up]" button shown for items without follow-ups
  - ✅ "N follow-ups ▶/▼" button for items with existing follow-ups
  - Target: ✅ Can add and view follow-up comments on any item

- [x] **Task 8:** Implement completion workflow ✅
  - ✅ Toggle complete checkbox ([ ] / [x]) per item
  - ✅ Active and Discussed sections displayed separately in QueueItemList
  - ✅ Restore functionality (clicking [x] uncompletes item)
  - ✅ Visual distinction (strikethrough, dimmed) for completed items
  - Target: ✅ Full lifecycle: create → discuss → complete → restore

### Low Priority - Phase 3: Polish & Distribution

- [x] **Task 9:** Add keyboard shortcuts and accessibility ✅
  - ✅ Global keyboard shortcuts: Ctrl+N (focus input), Ctrl+Shift+N (global), Ctrl+Shift+Q (toggle window)
  - ✅ System tray icon with context menu (Show, New Item, Quit)
  - ✅ ARIA labels on all interactive elements (QuickCapture, QueueItemCard buttons)
  - ✅ Keyboard shortcuts hint displayed in UI footer
  - ✅ useKeyboardShortcuts hook for managing shortcuts in renderer
  - Target: ✅ Power users can use app without mouse

- [ ] **Task 10:** Set up build and distribution
  - Configure electron-builder for Windows/Mac/Linux
  - Create app icons in Matrix theme
  - Set up auto-updater configuration
  - Target: Can build distributable installers

- [ ] **Task 11:** Complete documentation and polish
  - Write comprehensive README with screenshots
  - Add in-app help/onboarding
  - Create NEURONS.md mapping the codebase
  - Target: New users can understand and use the app

## Discoveries & Notes

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

**2026-01-17 12:41 (Planning Iteration 4):** MAJOR DISCOVERY - Task 7 is ALREADY COMPLETE!
- Previous analysis was incorrect - the follow-up UI IS fully implemented in QueueItemCard.tsx
- QueueItemCard has:
  - `isExpanded` state for toggling visibility
  - `followUpText` state and `followUpInputRef` for input handling
  - `handleFollowUpSubmit` wired to `onAddFollowUp` prop
  - Full expandable section (lines 162-202) with:
    - Follow-up list with tree-like "└─" prefixes
    - Relative timestamps using `formatRelativeTime`
    - Inline input with Enter-to-submit and Escape-to-cancel
  - "[+ follow-up]" button for items without follow-ups
  - "N follow-ups ▶/▼" toggle button for items with follow-ups
- All wiring is complete: App.tsx → QueueItemList → QueueItemCard → useQueueData.addFollowUp
- Phase 2 Core Features is now 100% COMPLETE

**2026-01-17 12:09 (Planning Iteration 3):** Deep codebase analysis reveals:
- Task 6 is COMPLETE: QuickCapture, QueueItemList, QueueItemCard all exist and work
- Task 8 is COMPLETE: Completion workflow fully implemented with toggle, sections, visual distinction
- (NOTE: Task 7 analysis was incomplete - see above correction)

**2026-01-17 11:49 (Planning Iteration 2):** Deep analysis reveals Task 5 is ALREADY COMPLETE:
- main.ts: electron-store fully integrated with IPC handlers for SAVE_DATA, LOAD_DATA, GET_VERSION
- preload.ts: contextBridge exposes electronAPI with saveData(), loadData(), getVersion()
- useQueueData.ts: Complete hook with all CRUD operations (addItem, updateItem, deleteItem, toggleComplete, addFollowUp)
- Hook includes: loading state, error handling, optimistic updates with rollback, date serialization
- generateId() utility included (UUID v4-like)

**2026-01-17 (Planning Iteration 1):** Gap analysis complete. Key findings:
- Phase 1 Foundation is COMPLETE: All project structure, configs, main/renderer setup, and Matrix theme CSS exist
- Data types already defined in src/shared/types.ts (QueueItem, FollowUp, AppState, IPC_CHANNELS)

**2026-01-17:** Initial planning complete. Key decisions:
- Using Electron + React + TypeScript + Vite stack
- Local-only data storage (no cloud sync for v1)
- Matrix theme is aesthetic priority

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
