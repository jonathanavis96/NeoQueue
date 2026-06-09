# NeoQueue

## Overview

Matrix-themed Electron desktop app for capturing and organizing discussion points to raise with your manager. Local-first with system tray integration.

## Tech Stack

- TypeScript, React 18, Vite
- Electron (main + renderer process)
- electron-store for local persistence
- electron-builder for packaging

## Commands

```bash
npm run dev            # Start dev (Vite + Electron concurrently)
npm run build          # Build main process + Vite bundle
npm run lint           # ESLint (src/**/*.ts,tsx)
npm run type-check     # TypeScript check (both tsconfigs)
npm run package        # Build + electron-builder for distribution
```

## Architecture

```
src/
  main/       # Electron main process (IPC, tray, shortcuts)
  renderer/   # React frontend (UI components)
  shared/     # Shared types and utilities
```

- Two tsconfig files: `tsconfig.json` (renderer) and `tsconfig.main.json` (main process)
- Build outputs to `dist/` (Vite) and `build/` (main process)
- Packaged releases go to `release/`

## Conventions

- Strict TypeScript
- ESLint with React hooks plugin
- Data stored locally via electron-store (never leaves machine)
