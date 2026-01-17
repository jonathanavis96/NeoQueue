# NeoQueue - Agent Operational Guide

## Project Overview

**NeoQueue** is a Matrix-inspired Electron desktop app for tracking discussion points with your manager.

**Stack**: Electron + React + TypeScript + Vite

## Directory Structure

```
neoqueue/
├── src/
│   ├── main/           # Electron main process
│   │   └── main.ts     # Entry point, window creation, IPC
│   ├── renderer/       # React frontend
│   │   ├── index.tsx   # React entry point
│   │   ├── App.tsx     # Root component
│   │   ├── components/ # UI components
│   │   ├── hooks/      # Custom React hooks
│   │   ├── styles/     # CSS/theme files
│   │   └── types/      # TypeScript interfaces
│   └── shared/         # Shared between main/renderer
│       └── types.ts    # Common type definitions
├── public/             # Static assets
├── ralph/              # Ralph loop files
│   ├── PROMPT.md
│   ├── RALPH.md
│   ├── IMPLEMENTATION_PLAN.md
│   └── VALIDATION_CRITERIA.md
├── THOUGHTS.md         # Project vision
├── AGENTS.md           # This file
├── README.md           # Setup instructions
└── package.json
```

## Development Commands

```bash
# Install dependencies
npm install

# Development mode (launches Electron with hot reload)
npm run dev

# Type checking
npm run type-check

# Linting
npm run lint

# Build for production
npm run build

# Package for distribution
npm run package
```

## Key Files

| File | Purpose |
|------|---------|
| `src/main/main.ts` | Electron main process, creates window |
| `src/renderer/App.tsx` | React root component |
| `src/shared/types.ts` | QueueItem, FollowUp interfaces |
| `vite.config.ts` | Vite bundler configuration |
| `electron-builder.json` | Packaging configuration |

## Data Model

```typescript
interface QueueItem {
  id: string;
  text: string;
  createdAt: Date;
  completedAt?: Date;
  isCompleted: boolean;
  followUps: FollowUp[];
}

interface FollowUp {
  id: string;
  text: string;
  createdAt: Date;
}
```

## Conventions

### Code Style
- **TypeScript strict mode**: No `any` without justification
- **Functional components**: No class components
- **Hooks**: Use custom hooks for shared logic
- **Naming**: PascalCase for components, camelCase for functions/variables

### CSS/Styling
- CSS variables for theme colors
- Matrix theme colors:
  - Background: `#0a0a0a` (near black)
  - Primary green: `#00ff00` (classic Matrix green)
  - Secondary green: `#003300` (dark green)
  - Text: `#00ff00` or `#00cc00`
  - Font: `'Fira Code', 'Consolas', monospace`

### Component Structure
```tsx
// ComponentName.tsx
import React from 'react';
import './ComponentName.css';

interface ComponentNameProps {
  // props
}

export const ComponentName: React.FC<ComponentNameProps> = ({ props }) => {
  // hooks first
  // handlers
  // render
  return <div>...</div>;
};
```

## Testing Approach

- Manual testing during development
- Focus on core user flows:
  1. Add item → verify appears in list
  2. Copy item → verify clipboard
  3. Add follow-up → verify threaded display
  4. Mark complete → verify moves/archives
  5. Restart app → verify persistence

## Validation

Before committing, verify:
1. `npm run type-check` passes
2. App launches without errors
3. Changed feature works as expected
4. No console errors in DevTools

## Ralph Integration

This project uses Ralph for iterative development:
- **IMPLEMENTATION_PLAN.md**: Task list (read first every iteration)
- **VALIDATION_CRITERIA.md**: Quality gates
- **THOUGHTS.md**: Project vision and success criteria
- **One task per iteration**: Implement, validate, commit, stop

## Troubleshooting

### Electron won't start
- Check `npm install` completed
- Verify Node.js version (18+ recommended)
- Check main process file path in package.json

### Hot reload not working
- Vite dev server must be running
- Check vite.config.ts renderer configuration
- Restart dev command

### TypeScript errors
- Run `npm run type-check` for full report
- Check tsconfig.json paths
- Ensure all imports have type definitions
