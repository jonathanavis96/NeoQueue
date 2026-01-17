# THOUGHTS.md - NeoQueue: Manager Discussion Tracker

A Matrix-inspired desktop app for tracking discussion points you need to raise with your manager.

## What This Project Does

**NeoQueue** is a personal comment/note management system designed for tracking items you need to discuss with your manager. It provides a distraction-free, cyberpunk-styled interface for quickly capturing, organizing, and completing discussion points.

- **Primary Goal:** Rapidly capture and track "still to chat with manager" items with minimal friction
- **Key Features:**
  - Canvas-based comment creation (left-click anywhere → new comment)
  - One-click copy with auto follow-up (right-click → copies text + opens follow-up box)
  - Threaded follow-ups with visual linking (indented, connected lines)
  - Two-tab workflow: Active Queue → Completed Archive
  - Matrix-inspired dark theme with tasteful glitch effects on actions
- **Target Users:** Single user (personal tool)
- **Platform:** Desktop application (Electron + React or Tauri + React)

---

## App Name: NeoQueue

**Rationale:** "Neo" evokes the Matrix protagonist and means "new" - fitting for a queue of new items to discuss. "Queue" is functional and describes exactly what it does. Alternative names considered: SyncStack, PendingBuffer, TheQueue, Backlog.

---

## Current Goals

### Active Focus: Build Complete MVP

Create a fully functional desktop application with all core features:

1. **Core Comment System**
   - Left-click on canvas → opens new comment input box (auto-focused)
   - Single text block comments (no title, just content)
   - Double-click existing comment → edit mode
   - Auto-save on blur/enter
   - Smart auto-correct that respects code/filenames (e.g., `AGENTS.md`, `loop.sh`)
   - Tab autocomplete for commonly used words (learns from your typing)

2. **Copy & Follow-up Workflow**
   - Right-click on comment → selects entire text + copies to clipboard
   - Visual feedback: "Copied!" indicator with Matrix-style glitch effect
   - After copy: new follow-up input box appears below, indented with connecting line
   - Follow-ups are visually linked to parent (thread structure)

3. **Completion Workflow**
   - Checkbox at bottom of each comment card
   - Click checkbox → Matrix glitch animation → card slides to "Completed" tab
   - Completed tab shows archived items (searchable, read-only by default)
   - Undo: restore accidentally completed items back to Queue

4. **Two-Tab Interface**
   - **Queue** (default): Active comments awaiting discussion
   - **Completed**: Archived comments (separate, not cluttering main view)

5. **Matrix Dark Theme**
   - Black background with green phosphor text (#00FF00 or similar)
   - Monospace font (Fira Code, JetBrains Mono, or Source Code Pro)
   - Subtle scanline/CRT effect (optional, toggleable)
   - Glitch effects triggered on: copy, complete, new comment added
   - NOT overkill - tasteful, not distracting during normal use

---

## Feature Specifications

### Comment Card Structure
```
┌────────────────────────────────────────────────┐
│ Ask about the AGENTS.md refactor timeline      │
│ and whether we should prioritize it over       │
│ the new bootstrap feature.                     │
│                                                │
│ ───────────────────────────────────────────    │
│ Created: Jan 17, 2026 11:15am            [✓]   │
└────────────────────────────────────────────────┘
     │
     ├──┬────────────────────────────────────────┐
     │  │ Follow-up: What about the timeline    │
     │  │ for the Python templates?             │
     │  │ ─────────────────────────────────────  │
     │  │ Created: Jan 17, 2026 11:20am    [✓]  │
     │  └────────────────────────────────────────┘
     │
     └──┬────────────────────────────────────────┐
        │ Another follow-up question here...    │
        │ ─────────────────────────────────────  │
        │ Created: Jan 17, 2026 11:25am    [✓]  │
        └────────────────────────────────────────┘
```

### Window Controls
- **Always-on-top toggle** (pin button in title bar)
- **Minimize to system tray** (continues running in background)
- **Resizable window** (remembers size/position)
- **Standard close** (with option to minimize to tray instead)

### Search & Filter
- Search box at top of each tab
- Real-time filtering as you type
- Searches comment text and timestamps
- Filter persists within tab, clears on tab switch

### Keyboard Shortcuts
| Shortcut | Action |
|----------|--------|
| `Ctrl+N` | New comment (focus canvas, open input) |
| `Ctrl+F` | Focus search box |
| `Ctrl+Z` | Undo last action (complete/delete) |
| `Ctrl+Shift+Q` | Global hotkey: open/focus NeoQueue from anywhere |
| `Escape` | Cancel current input / close search |
| `Enter` | Save comment (when editing) |
| `Tab` | Autocomplete current word |

### Auto-correct & Autocomplete
- Use system spellcheck as base
- **Code-aware**: Don't autocorrect words containing dots, underscores, or camelCase (e.g., `AGENTS.md`, `new-project.sh`, `userId`)
- **Tab autocomplete dictionary**:
  - Pre-seeded with common dev terms
  - Learns from words you type frequently
  - Tab key cycles through suggestions

### Data Persistence
- **Local storage**: SQLite database or JSON file in app data directory
- **Auto-backup**: Mirror to `/mnt/e/6 - Text/a - Work/Code` on every change
- **Auto-save**: No explicit save button, changes persist immediately

### Export Options
- **JSON**: Full backup (can be re-imported)
- **Markdown**: Human-readable format with timestamps
- Export scope: All / Active only / Completed only / Date range

### Empty State
- Queue empty: Matrix-style message like "The Queue is clear. There is no spoon." or "You've said everything that needs to be said."
- Completed empty: "Nothing completed yet. The Matrix has you."

### Notifications
- On app start: Show count of pending items (e.g., "5 items in your Queue")
- Optional: System notification if Queue has items (configurable)

---

## Definition of Done

A feature in NeoQueue is complete when:

### ✅ Functionality
- Feature works as specified in this document
- All edge cases handled (empty states, long text, special characters)
- No console errors or warnings
- Keyboard shortcuts work correctly
- Data persists across app restarts

### ✅ UI/UX
- Matches Matrix dark theme (green on black, monospace)
- Glitch effects trigger on appropriate actions (not distracting)
- Responsive to window resize
- Accessible (keyboard navigable, proper focus management)
- Visual feedback for all user actions

### ✅ Performance
- App starts in < 2 seconds
- No lag when typing or scrolling
- Smooth animations (60fps)
- Memory usage stays reasonable (< 200MB)

### ✅ Data Integrity
- Auto-save works reliably
- Backup to /mnt/e/ succeeds (with graceful failure if drive unavailable)
- Undo restores data correctly
- Export produces valid, importable files

---

## Success Metrics

NeoQueue is successful when:

1. **Capture is instant** - Left-click → typing in < 0.5 seconds
2. **Copy workflow is seamless** - Right-click → copied + follow-up ready in < 1 second
3. **Zero data loss** - All comments persist, backups work, undo available
4. **Visually distinctive** - Immediately recognizable Matrix aesthetic
5. **Always accessible** - Global hotkey brings app to focus instantly
6. **Non-intrusive** - Effects enhance, don't distract; app stays out of the way when not needed
7. **Personal tool excellence** - Solves the "things to discuss with manager" problem completely

---

## Technical Architecture

### Technology Stack
- **Runtime:** Electron (cross-platform, mature) or Tauri (lighter, Rust-based)
- **Frontend:** React + TypeScript
- **Styling:** CSS-in-JS (styled-components) or Tailwind CSS
- **State Management:** Zustand or React Context (simple app, no Redux needed)
- **Database:** SQLite (via better-sqlite3) or local JSON file
- **Font:** Fira Code or JetBrains Mono (monospace with ligatures)

### Project Structure
```
neoqueue/
├── src/
│   ├── main/                 # Electron main process
│   │   ├── index.ts          # App entry, window management
│   │   ├── tray.ts           # System tray functionality
│   │   ├── globalShortcut.ts # Global hotkey registration
│   │   └── backup.ts         # Auto-backup to /mnt/e/
│   ├── renderer/             # React frontend
│   │   ├── App.tsx           # Main app component
│   │   ├── components/
│   │   │   ├── Canvas.tsx        # Click-to-create area
│   │   │   ├── CommentCard.tsx   # Individual comment display
│   │   │   ├── CommentInput.tsx  # New/edit comment input
│   │   │   ├── ThreadConnector.tsx # Visual line connecting follow-ups
│   │   │   ├── TabBar.tsx        # Queue/Completed tabs
│   │   │   ├── SearchBox.tsx     # Filter/search input
│   │   │   ├── TitleBar.tsx      # Custom title bar with pin/minimize
│   │   │   └── GlitchEffect.tsx  # Matrix glitch animation
│   │   ├── hooks/
│   │   │   ├── useComments.ts    # Comment CRUD operations
│   │   │   ├── useAutocomplete.ts # Tab autocomplete logic
│   │   │   └── useKeyboardShortcuts.ts
│   │   ├── store/
│   │   │   └── commentStore.ts   # Zustand store
│   │   ├── styles/
│   │   │   ├── theme.ts          # Matrix color palette
│   │   │   ├── globals.css       # Base styles, fonts
│   │   │   └── animations.css    # Glitch, slide animations
│   │   └── utils/
│   │       ├── autocorrect.ts    # Code-aware spellcheck
│   │       ├── export.ts         # JSON/Markdown export
│   │       └── dateFormat.ts     # Timestamp formatting
│   └── shared/
│       └── types.ts              # Shared TypeScript types
├── assets/
│   ├── fonts/                    # Fira Code / JetBrains Mono
│   └── icons/                    # App icons, tray icons
├── package.json
├── electron-builder.json         # Build configuration
└── tsconfig.json
```

### Data Model
```typescript
interface Comment {
  id: string;                    // UUID
  text: string;                  // Comment content
  createdAt: Date;               // Timestamp
  completedAt: Date | null;      // Null if active, date if completed
  parentId: string | null;       // Null if root, parent ID if follow-up
  order: number;                 // Sort order within siblings
}

interface AppState {
  comments: Comment[];
  activeTab: 'queue' | 'completed';
  searchQuery: string;
  windowPinned: boolean;
  autocompleteDict: string[];    // Learned words
}
```

### Key Implementation Details

1. **Canvas Click Detection**
   - Listen for clicks on empty canvas area (not on existing comments)
   - Create floating input at click position
   - Auto-focus input immediately

2. **Right-Click Copy + Follow-up**
   - Prevent default context menu
   - Copy full comment text to clipboard via Electron API
   - Show "Copied!" toast with glitch effect
   - Insert new CommentInput below, indented, with connector line

3. **Thread Visualization**
   - CSS pseudo-elements for connecting lines (vertical + horizontal)
   - Indentation: 24px per level
   - Max depth: Consider limiting to 3-4 levels

4. **Glitch Effect**
   - CSS animation: brief color shift + slight position jitter
   - Duration: 200-300ms
   - Trigger on: copy, complete, new comment save
   - Use `clip-path` and `transform` for authentic Matrix look

5. **Global Hotkey**
   - Register `Ctrl+Shift+Q` via Electron's globalShortcut API
   - If app hidden: show and focus
   - If app visible but not focused: focus
   - If app focused: minimize to tray

6. **Auto-backup**
   - On every comment change, write full state to backup location
   - Path: `/mnt/e/6 - Text/a - Work/Code/neoqueue-backup.json`
   - Graceful failure: if /mnt/e/ unavailable, log warning but don't block

7. **Code-Aware Autocorrect**
   - Regex to detect code patterns: `/[._-]|[a-z][A-Z]|^\$/`
   - If pattern matches, skip spellcheck for that word
   - Common code extensions whitelist: `.md`, `.ts`, `.js`, `.sh`, `.py`, etc.

---

## Constraints

- **Single user only** - No multi-user, no sync, no cloud
- **Windows primary** - Must work on Windows; Linux/Mac nice-to-have
- **Offline only** - No network requests (except optional update check)
- **Local data only** - All data stays on local machine + backup path (/mnt/e/)

---

## Implementation Phases

### Phase 1: Core MVP (Priority)
1. Electron + React project setup with TypeScript
2. Basic window with Matrix dark theme
3. Comment creation (click canvas → input → save)
4. Comment display as cards with timestamps
5. Comment editing (double-click)
6. Delete comments
7. Local persistence (SQLite or JSON)

### Phase 2: Workflow Features
8. Right-click to copy
9. Follow-up creation after copy (indented, connected)
10. Completion checkbox → moves to Completed tab
11. Two-tab interface (Queue / Completed)
12. Undo functionality

### Phase 3: Polish & Effects
13. Matrix glitch effects on actions
14. Search/filter functionality
15. Keyboard shortcuts
16. Custom title bar with pin/minimize/close

### Phase 4: Advanced Features
17. System tray with minimize-to-tray
18. Global hotkey (Ctrl+Shift+Q)
19. Auto-backup to /mnt/e/
20. Tab autocomplete with learning dictionary
21. Export (JSON/Markdown)
22. Startup notification (pending count)
23. Empty state messages

### Phase 5: Refinement
24. Window position/size persistence
25. Performance optimization
26. Code-aware autocorrect tuning
27. Final visual polish

---

## Key Principles

1. **Friction-Free Capture** - Getting a thought into the queue should take < 2 seconds
2. **Visual Hierarchy** - Active items prominent, completed items archived, follow-ups clearly linked
3. **Respect the Aesthetic** - Matrix theme is core identity, but function over form
4. **Data Safety** - Auto-save everything, backup automatically, undo available
5. **Stay Out of the Way** - Minimize to tray, global hotkey to summon, no nagging
6. **Code-Friendly** - Understand that users type filenames, function names, technical terms
7. **Personal Tool** - Optimized for single user, not enterprise features

---

## Open Questions for Ralph

1. **Electron vs Tauri?** - Electron is more mature but heavier; Tauri is lighter but newer. Recommend Electron for faster development.
2. **SQLite vs JSON file?** - SQLite is more robust but adds complexity; JSON is simpler. Recommend JSON for MVP, migrate to SQLite if needed.
3. **Scanline effect?** - Should the subtle CRT scanline be on by default or a toggle? Recommend: toggle, off by default.
4. **Max thread depth?** - Unlimited nesting could get unwieldy. Recommend: limit to 3 levels, show warning if user tries to go deeper.
5. **Backup frequency?** - On every change vs periodic? Recommend: debounced (500ms after last change) to avoid excessive writes.

---

## References

- **Matrix Color Palette:** #000000 (black), #00FF00 (green), #003300 (dark green), #00FF41 (bright green)
- **Glitch Effect Inspiration:** https://css-tricks.com/glitch-effect-text-images-svg/
- **Electron Documentation:** https://www.electronjs.org/docs
- **Tauri Documentation:** https://tauri.app/
- **Fira Code Font:** https://github.com/tonsky/FiraCode
