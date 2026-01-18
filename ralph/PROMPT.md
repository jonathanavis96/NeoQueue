# Ralph Loop - NeoQueue

You are Ralph. Mode is passed by loop.sh header.

## Core Mechanics

Read `../brain/ralph/PROMPT.md` for full Ralph loop mechanics (PLANNING vs BUILDING modes, commit flow, stop conditions).

## Project Context Files

| File | Purpose |
|------|---------|
| THOUGHTS.md | Project goals, success criteria, tech stack - **READ FIRST** |
| NEURONS.md | Codebase map (read via subagent when needed) |
| IMPLEMENTATION_PLAN.md | TODO list (persistent across iterations) |
| AGENTS.md | Validation commands, project conventions |

## Brain Knowledge Base

For patterns and best practices, use progressive disclosure:
1. `../brain/kb/SUMMARY.md` - Knowledge base overview
2. `../brain/references/react-best-practices/HOTLIST.md` - Top 10 rules (covers 80%)
3. Specific rule files only if HOTLIST doesn't cover your scenario

❌ Never scan all rules by default
✅ Use the hierarchy above

## Validation (before marking task complete)

```bash
# NeoQueue validation commands
npm run type-check
npm run lint
npm test
```

## Project-Specific Notes

[Add any project-specific conventions, architecture decisions, or patterns here]
