# Validation Criteria - NeoQueue

Last verified: 2026-01-17 11:32:38

## Purpose

Quality gates and acceptance criteria for NeoQueue - the Matrix-inspired desktop app for tracking discussion points with your manager.

This file defines what "done" looks like for each phase and feature.

## Structure Validation

### Phase 1: Project Foundation
- [ ] `package.json` exists with all required dependencies
- [ ] `tsconfig.json` configured for Electron + React
- [ ] Directory structure: `src/main/`, `src/renderer/`, `src/shared/`
- [ ] Electron main process file exists: `src/main/main.ts`
- [ ] React entry point exists: `src/renderer/index.tsx`
- [ ] Vite config exists: `vite.config.ts`

### Documentation Files
- [ ] `THOUGHTS.md` - Project vision and success criteria
- [ ] `AGENTS.md` - Operational guidance for Ralph
- [ ] `README.md` - Setup and usage instructions
- [ ] `NEURONS.md` - Codebase map (created after significant code exists)

## Functional Validation

### Core Features
- [ ] **Quick capture:** Can add new item with single text input + Enter
- [ ] **Copy to clipboard:** One-click copy of any item text
- [ ] **Follow-up threading:** Can add follow-up comments to items
- [ ] **Completion workflow:** Can mark items as discussed/completed
- [ ] **Data persistence:** Items survive app restart

### Electron Integration
- [ ] App launches without errors
- [ ] Window displays React content
- [ ] IPC communication works between main and renderer
- [ ] Data persists to local storage/file

### Matrix Theme
- [ ] Dark background (black/very dark green)
- [ ] Green text/accent colors (#00ff00 family)
- [ ] Monospace font for main content
- [ ] Subtle "digital rain" effect (optional but preferred)

## Content Validation

### Code Quality
- [ ] TypeScript strict mode enabled
- [ ] No `any` types without justification
- [ ] Components follow React best practices (hooks, functional)
- [ ] Consistent naming: PascalCase components, camelCase functions
- [ ] Comments explain "why" not "what"

### UI/UX Quality
- [ ] Keyboard navigation works (Tab, Enter, Escape)
- [ ] Visual feedback on interactions (hover, focus states)
- [ ] Error states handled gracefully
- [ ] Loading states where appropriate

## Validation Commands

```bash
# Check project structure
ls -la src/main/ src/renderer/ src/shared/

# Install dependencies
npm install

# TypeScript type check
npm run type-check

# Linting
npm run lint

# Build the app
npm run build

# Run development mode
npm run dev

# Package for distribution (when ready)
npm run package
```

## Phase-Specific Checklists

### Phase 1 Complete: Foundation
- [ ] `npm install` succeeds without errors
- [ ] `npm run dev` launches Electron window
- [ ] React renders in Electron window
- [ ] Matrix theme visible (dark background, green text)
- [ ] All documentation files created

### Phase 2 Complete: Core Features
- [ ] Can create new queue items
- [ ] Can copy item text to clipboard
- [ ] Can add follow-up to existing item
- [ ] Can mark item as completed
- [ ] Items persist after app restart
- [ ] Items display in scrollable list

### Phase 3 Complete: Polish
- [ ] Keyboard shortcuts work (Ctrl+N, etc.)
- [ ] System tray icon present
- [ ] Can build distributable package
- [ ] README has setup instructions
- [ ] NEURONS.md maps the codebase

---

## How to Use This File

**For Ralph (Building Mode - Step 4: Validate):**
1. After implementing a task, run relevant validation commands
2. Check that your changes satisfy applicable criteria
3. If validation fails, fix before committing
4. Note any new criteria discovered

**For Manual Verification:**
- Run through phase checklist after completing all tasks in that phase
- Mark items [x] as verified
- Document any issues in IMPLEMENTATION_PLAN.md
