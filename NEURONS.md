# NEURONS - NeoQueue Codebase Map

This file is a quick, practical map of the NeoQueue codebase: where things live, how data flows, and the key concepts to know before making changes.

## High-Level Architecture

NeoQueue is an **Electron** app with a **React + Vite** renderer.

- **Main process** (`src/main/*`): Owns the BrowserWindow, global shortcuts, tray, and persistence backend.
- **Preload** (`src/main/preload.ts`): Exposes a safe `window.electronAPI` surface to the renderer via `contextBridge`.
- **Renderer** (`src/renderer/*`): React UI (Quick capture + list workflow) powered by hooks.
- **Shared types** (`src/shared/types.ts`): TypeScript interfaces and IPC channel constants shared between main/renderer.

## Data Model

Defined in `src/shared/types.ts`:

- `QueueItem`: discussion point (text, createdAt, completion state, follow-ups)
- `FollowUp`: threaded note attached to an item
- `AppState`: persisted payload (`items`, `version`)

## Persistence & IPC

### IPC surface (renderer ↔ main)

IPC channel names live in `src/shared/types.ts` under `IPC_CHANNELS`.

- `save-data` / `load-data`: Persist and restore `AppState`
- `get-version`: App version string
- `shortcut:new-item`, `shortcut:toggle-window`, `tray:show-window`: event notifications from main → renderer

### Main process storage

`src/main/main.ts` uses `electron-store` to persist `AppState`.

- On save: `ipcMain.handle(IPC_CHANNELS.SAVE_DATA, ...)`
- On load: `ipcMain.handle(IPC_CHANNELS.LOAD_DATA, ...)`

### Preload bridge

`src/main/preload.ts` exposes:

- `window.electronAPI.saveData(appState)`
- `window.electronAPI.loadData()`
- `window.electronAPI.getVersion()`
- `window.electronAPI.onNewItemShortcut(cb)`
- `window.electronAPI.onShowWindow(cb)`

The renderer should not import `electron` directly.

## Renderer UI Structure

### Entry points

- `src/renderer/index.tsx`: React bootstrapping
- `src/renderer/App.tsx`: Root component; wires hooks → components

### Hooks

- `src/renderer/hooks/useQueueData.ts`
  - Loads persisted state on mount
  - Implements optimistic updates + rollback on save failure
  - Core mutation APIs: `addItem`, `toggleComplete`, `deleteItem`, `addFollowUp`, `updateItem`
- `src/renderer/hooks/useKeyboardShortcuts.ts`
  - Handles renderer-local shortcuts (e.g., Ctrl+N)
  - Subscribes to main-process shortcut events via `window.electronAPI.*`

### Components

- `QuickCapture` (`src/renderer/components/QuickCapture.tsx`)
  - Main input for adding items
  - Exposes `focus()` via `forwardRef` so global/local shortcuts can focus it
- `QueueItemList` (`src/renderer/components/QueueItemList.tsx`)
  - Renders Active and Discussed items
  - Delegates item rendering to `QueueItemCard`
- `QueueItemCard` (`src/renderer/components/QueueItemCard.tsx`)
  - Item UI: copy, complete, delete, expand follow-ups, add follow-up

## Keyboard / Tray Behavior

Implemented in `src/main/main.ts`:

- Global shortcuts:
  - `Ctrl+Shift+N`: focus input (main emits IPC event → renderer focuses)
  - `Ctrl+Shift+Q`: toggle window visibility
- System tray:
  - Tray menu and double-click to show window
  - Tray icon loaded from `build/tray.png` when available

Renderer hint text currently appears in `App.tsx` footer.

## Build & Packaging Notes

- Electron main process is compiled to `dist/main/main/main.js` (see build scripts).
- Packaging is handled by `electron-builder` via `npm run package`.
- App/tray icons are expected under `build/` (e.g., `build/icon.png`, `build/tray.png`).

## Common Change Locations

- Change data shape: `src/shared/types.ts` + migrations (if needed)
- Add new persistence fields: `src/main/main.ts` (store read/write) + `useQueueData` mapping
- UI/UX changes: `src/renderer/components/*` and `src/renderer/styles/*`
- New shortcuts: `src/main/main.ts` + `src/main/preload.ts` + `useKeyboardShortcuts`
