# NEURONS.md - NeoQueue Repository Map

**Read via subagent** - This is the codebase map for Ralph. Not loaded in first context.

## Purpose
This is the **NeoQueue map** that Ralph and all agents read on-demand when needed. It maps the entire project structure, tells you where everything lives, and provides quick lookup for common tasks.

## Navigation Rules (Read This First)
**Deterministic Context Loading Order:**
1. `PROMPT.md` (loaded first by loop.sh - contains conditional logic for plan/build modes)
2. `AGENTS.md` (operational guide - how to run Ralph)
3. `NEURONS.md` (this file - read via subagent when needed, NOT in first-load context)
4. `IMPLEMENTATION_PLAN.md` (TODO list - read in BUILD mode)
5. `THOUGHTS.md` (project goals and success criteria - read as needed)

**Progressive Disclosure:** Start broad, drill down only when needed. Don't read everything at once.

---

## Repository Layout

```
/home/grafe/code/NeoQueue/
├── README.md                    # Project overview and setup
├── src/
│   ├── components/              # React components
│   ├── pages/                   # Page components
│   ├── utils/                   # Utility functions
│   ├── hooks/                   # Custom React hooks
│   ├── styles/                  # Stylesheets
│   └── App.tsx                  # Root component
├── public/                      # Static assets
├── tests/                       # Test files
├── package.json                # Dependencies
│
├── ralph/                       # Ralph loop infrastructure
│   ├── AGENTS.md                # Operational guide
│   ├── NEURONS.md               # This file (codebase map)
│   ├── THOUGHTS.md              # Project vision and goals
│   ├── PROMPT.md                # Ralph instructions
│   ├── IMPLEMENTATION_PLAN.md   # TODO list
│   ├── VALIDATION_CRITERIA.md   # Quality gates
│   ├── loop.sh                  # Ralph loop runner
│   └── logs/                    # Ralph execution logs
│
├── .gitignore                  # Git ignore rules
└── LICENSE                     # Project license
```

---

## Quick Reference Lookup

### "I need to..."

| Task | Check Here |
|------|------------|
| **Understand project structure** | `NEURONS.md` (this file) |
| **Run Ralph loop** | `ralph/AGENTS.md` → `bash ralph/loop.sh` |
| **Find TODO list** | `ralph/IMPLEMENTATION_PLAN.md` |
| **Check project goals** | `ralph/THOUGHTS.md` |
| **See validation criteria** | `ralph/VALIDATION_CRITERIA.md` |
| **Find components** | `src/components/` |
| **Add new page** | `src/app/` (App Router) or `src/pages/` |
| **Add API route** | `src/app/api/` or `src/pages/api/` |
| **Add utilities** | `src/lib/` or `src/utils/` |
| **Run tests** | See validation commands below |
| **Brain KB patterns** | `../../brain/kb/SUMMARY.md` |

### "Where do I put..."

| Content Type | Location | Notes |
|--------------|----------|-------|
| **New React component** | `src/components/` | Feature-specific in `features/`, reusable in `ui/` |
| **New page** | `src/app/` or `src/pages/` | App Router uses `src/app/`, Pages Router uses `src/pages/` |
| **API endpoint** | `src/app/api/` or `src/pages/api/` | Server-side API routes |
| **Utility function** | `src/lib/` or `src/utils/` | Pure functions, no side effects |
| **Custom hook** | `src/hooks/` | Reusable React hooks |
| **Type definitions** | `src/types/` | TypeScript interfaces and types |
| **Static assets** | `public/` | Images, fonts, favicons |
| **Test files** | `tests/` | Unit, integration, e2e tests |
| **Documentation** | `docs/` or `README.md` | Project documentation |
| **Ralph plans** | `ralph/IMPLEMENTATION_PLAN.md` | Task tracking |
| **Ralph logs** | `ralph/logs/` | Execution transcripts |

---

### File Types & Conventions

**TypeScript Files:**
- `.ts` - TypeScript source files
- `.tsx` - TypeScript with JSX (React components)
- `tsconfig.json` - TypeScript compiler configuration
- Use strict mode for type safety
- Define interfaces in `types/` directory

**Testing:**
- Test files: Follow language conventions
- Location: `tests/` directory


---

## Validation Commands

```bash
# File structure check
ls -la src/ public/ tests/

# Run tests
# Run project-specific test command

# Lint check
npm run lint

# Build check
npm run build

# Ralph infrastructure
bash -n ralph/loop.sh
ls -lh ralph/AGENTS.md ralph/NEURONS.md ralph/THOUGHTS.md ralph/PROMPT.md ralph/IMPLEMENTATION_PLAN.md
```


---

## Path Conventions

**From Ralph's perspective (in `ralph/` subdirectory):**
- Brain KB: `../../brain/kb/SUMMARY.md`
- Brain references: `../../brain/references/react-best-practices/HOTLIST.md`
- Brain templates: `../../brain/templates/`
- Project root: `../` (one level up from ralph/)
- This file: `NEURONS.md` (in ralph/ directory)

**From project root:**
- Ralph directory: `ralph/`
- Source code: `src/` or language-specific directory
- Tests: `tests/` or adjacent to source

---

## Brain Integration

This project uses the shared **brain** repository for knowledge and patterns:

**Brain Location:** `/home/grafe/code/brain/`

**Key Brain Resources:**
- **KB Index:** `../../brain/kb/SUMMARY.md`
- **React Best Practices:** `../../brain/references/react-best-practices/HOTLIST.md`
- **Ralph Patterns:** `../../brain/kb/domains/ralph-patterns.md`
- **Auth Patterns:** `../../brain/kb/domains/auth-patterns.md`

**Reading Brain Content:**
Always use the entry points (SUMMARY.md, HOTLIST.md, INDEX.md) before diving into specific files. The brain uses progressive disclosure.

---

## Key Insights

**This is a web-app project** using Electron, React, TypeScript, SQLite/JSON, Zustand.

**Primary Purpose:** Matrix-inspired desktop app for tracking discussion points to raise with manager

**Directory Strategy:** 
- Component-based architecture
- Separate UI components from feature logic
- Use hooks for state management and side effects

**File Discovery Pattern:**
1. Check NEURONS.md (this file) for high-level structure
2. Use Quick Reference Lookup above for specific tasks
3. Read IMPLEMENTATION_PLAN.md for current work
4. Consult brain KB for patterns and best practices

**Don't Assume Missing:**
Always search the codebase before creating new functionality. Use grep extensively.

