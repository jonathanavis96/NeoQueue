# NeoQueue - Project Vision

## What Is This?

NeoQueue is a Matrix-inspired desktop application for tracking discussion points you want to raise with your manager. It's designed for friction-free capture and organized follow-up.

## The Problem

When working, you constantly think of things you need to discuss with your manager:
- Questions about priorities
- Updates on projects
- Requests for resources
- Ideas to share
- Concerns to raise

These thoughts come at random times. You need a way to capture them instantly without breaking your flow, and then have them organized when you finally get that 1:1 meeting.

## The Solution: NeoQueue

A desktop app that sits ready for quick capture. Type your thought, hit Enter, done. When meeting time comes, you have a clean list. After discussing an item, mark it complete. Add follow-up notes if needed.

## Why "Neo" and Matrix Theme?

1. **Neo** = New beginning, fresh start for your thoughts
2. **Queue** = Ordered list of items waiting for attention
3. **Matrix aesthetic** = Dark, focused, minimal distractions, feels like a power tool

## Success Criteria

### Must Have (v1.0)
- [ ] **Instant capture**: Add item in < 2 seconds (type + Enter)
- [ ] **One-click copy**: Copy any item to clipboard for pasting elsewhere
- [ ] **Follow-up threading**: Add notes/comments to existing items
- [ ] **Completion workflow**: Mark items discussed, archive them
- [ ] **Persistence**: Items survive app restart
- [ ] **Matrix theme**: Dark green/black, monospace fonts, digital aesthetic

### Nice to Have (v1.x)
- [ ] Keyboard shortcuts for everything
- [ ] System tray for quick access
- [ ] Search/filter items
- [ ] Export to markdown
- [ ] Categories or tags

### Out of Scope (for now)
- Cloud sync
- Multi-user / sharing
- Mobile app
- Integration with calendar/meeting tools

## Technical Decisions

### Stack
- **Electron**: Cross-platform desktop app
- **React + TypeScript**: Modern, type-safe UI
- **Vite**: Fast development bundler
- **Local storage**: electron-store or SQLite for persistence

### Why This Stack?
- Electron: Only practical option for cross-platform desktop with web tech
- React: Most familiar, best ecosystem for UI components
- TypeScript: Catch errors early, better IDE support
- Vite: Faster than webpack, excellent React support

## Design Principles

1. **Speed over features**: Every interaction should feel instant
2. **Keyboard-first**: Power users shouldn't need the mouse
3. **Visual clarity**: Easy to scan your list quickly
4. **Minimal UI**: No clutter, no distractions
5. **Matrix aesthetic**: Dark theme is mandatory, not optional

## User Journey

1. **Capture**: Working on something, thought pops up → Alt+Tab to NeoQueue → Type thought → Enter → Alt+Tab back (< 5 seconds)
2. **Review**: Before 1:1 meeting → Open NeoQueue → Scan list → Copy items to meeting notes if needed
3. **Discuss**: In meeting → Reference items → Mark as discussed
4. **Follow-up**: After meeting → Add follow-up notes to items that need action
5. **Archive**: Completed items move to archive → Clean main view

## Project Phases

### Phase 1: Foundation
- Project setup (Electron + React + TypeScript)
- Basic window with Matrix theme
- Core layout structure

### Phase 2: Core Features
- Data persistence
- Quick capture input
- Item list display
- Copy to clipboard
- Follow-up threading
- Completion workflow

### Phase 3: Polish
- Keyboard shortcuts
- System tray
- Build/distribution
- Documentation

---

*"Free your mind." - Morpheus*
