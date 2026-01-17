# Implementation Plan - NeoQueue

Last updated: 2026-01-17 11:32:38

## Current State

**Current State:** New project - no code exists yet. Only Ralph loop files present.

**Purpose:** Matrix-inspired desktop app for tracking discussion points to raise with manager

**Project Type:** Electron desktop app with React frontend

**Phase:** Phase 1 - Foundation and Setup

## Goal

Build a complete Matrix-inspired desktop app (NeoQueue) for tracking discussion points to raise with manager. Core features:
1. **Friction-free capture** - Quick entry of discussion items with one-click copy to clipboard
2. **Follow-up threading** - Add follow-up notes/comments to existing items
3. **Completion workflow** - Mark items as discussed, archive completed items

The Matrix theme means: dark green/black color scheme, "digital rain" aesthetic, terminal-like fonts.

## Prioritized Tasks

### High Priority - Phase 1: Project Setup & Foundation

- [x] **Task 1:** Create project documentation files ✅
  - Create THOUGHTS.md with project vision and success criteria
  - Create AGENTS.md with operational guidance
  - Create basic README.md
  - Target: All documentation files exist and define the project clearly

- [ ] **Task 2:** Initialize Electron + React project structure
  - Set up package.json with Electron, React, TypeScript dependencies
  - Configure TypeScript with tsconfig.json
  - Set up Vite as bundler for React
  - Create directory structure: src/main/, src/renderer/, src/shared/
  - Target: `npm install` succeeds, basic Electron app launches

- [ ] **Task 3:** Configure development environment
  - Set up Electron main process entry point
  - Configure Vite dev server for React renderer
  - Set up hot module replacement for renderer
  - Add electron-builder for packaging
  - Target: `npm run dev` launches Electron with React window

- [ ] **Task 4:** Implement Matrix theme and core layout
  - Create Matrix-inspired CSS theme (dark green/black, monospace fonts)
  - Implement root layout component with sidebar navigation
  - Add "digital rain" background effect (subtle, not distracting)
  - Set up CSS variables for theme colors
  - Target: App displays with full Matrix aesthetic

### Medium Priority - Phase 2: Core Features

- [ ] **Task 5:** Implement data persistence layer
  - Set up electron-store or SQLite for local data storage
  - Define TypeScript interfaces for QueueItem, FollowUp entities
  - Create data access functions (CRUD operations)
  - Target: Can save and load queue items persistently

- [ ] **Task 6:** Implement friction-free item capture
  - Create quick-entry input component (always visible)
  - Implement "Enter to add" functionality
  - Add one-click "copy to clipboard" button per item
  - Display items in a scrollable list
  - Target: Can add items quickly and copy them to clipboard

- [ ] **Task 7:** Implement follow-up threading
  - Add ability to expand an item to see/add follow-ups
  - Create follow-up input component
  - Display follow-ups in threaded view under parent item
  - Add timestamps to follow-ups
  - Target: Can add and view follow-up comments on any item

- [ ] **Task 8:** Implement completion workflow
  - Add "mark as discussed" button/action per item
  - Create "completed" section or archive view
  - Implement "restore" functionality for completed items
  - Add visual distinction for completed vs active items
  - Target: Full lifecycle: create → discuss → complete → archive

### Low Priority - Phase 3: Polish & Distribution

- [ ] **Task 9:** Add keyboard shortcuts and accessibility
  - Implement global keyboard shortcuts (Ctrl+N for new item, etc.)
  - Add system tray icon with quick actions
  - Ensure proper tab navigation and ARIA labels
  - Target: Power users can use app without mouse

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
