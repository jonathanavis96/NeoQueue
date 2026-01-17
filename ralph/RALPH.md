# Ralph Wiggum - Iterative Loop Runner

Ralph is a systematic, iterative development loop that alternates between planning and building phases.

## The Ralph Contract

### Phase 0: Initial Study (Before First Iteration)

**0a. Study THOUGHTS.md**  
Use parallel subagents (max 100) to read project vision, goals, and success criteria. Create minimal THOUGHTS.md if missing.

**0b. Identify source code location**  
Prefer `src/` directory. If different, document the actual location.

**0c. Study fix_plan.md**  
Read the current plan. If it doesn't exist or is empty, the first iteration must create it.

### The Loop

Ralph operates in two alternating phases:

#### 📋 PLAN Phase
See `PROMPT.md` (planning mode section) for full instructions.

**Goal**: Create or update `fix_plan.md` with a prioritized Top 10 checklist

**Frequency**: 
- First iteration (if fix_plan.md missing/empty)
- Every N iterations (configurable, default: every 3)
- When explicitly requested

#### 🔨 BUILD Phase
See `PROMPT.md` (building mode section) for full instructions.

**Goal**: Implement the top item from `fix_plan.md`

**Process**:
1. Take top incomplete item from fix_plan.md
2. Implement the change
3. Run build/tests
4. Update fix_plan.md (mark completed ✅)
5. Append progress to ralph/progress.txt
6. Commit with clear message

### Parallelism Contract

**Reading/Searching** (max 100 parallel subagents):
- Studying specs, source code, documentation
- Searching for patterns, imports, references
- Analyzing KB files and best practices

**Building/Testing** (exactly 1 agent):
- Running build commands
- Executing tests and benchmarks
- Making file modifications
- Git operations (commit, etc.)

### Completion Sentinel

When all work is complete, Ralph outputs:

```
:::COMPLETE:::
```

The loop runner detects this sentinel and stops iteration.

## Progress Tracking

All Ralph iterations are logged to `ralph/progress.txt` with:
- Timestamp
- Iteration number
- Phase (PLAN or BUILD)
- Actions taken
- Results and outcomes

## Git Commits

Each BUILD iteration ends with a commit:
```
git commit -m "Ralph #N: [clear description of what changed]"
```

## Knowledge Base Integration

Ralph MUST consult the shared brain knowledge base:

**Always read first:**
- `../../brain/kb/SUMMARY.md`
- `../../brain/references/react-best-practices/HOTLIST.md`

**Read on-demand:**
- `../../brain/references/react-best-practices/INDEX.md`
- `../../brain/references/react-best-practices/react-performance-guidelines.md`
- `../../brain/references/react-best-practices/rules/*` (specific rules only)

**Knowledge growth:**
When Ralph discovers new conventions or decisions, it creates/updates KB files in `../../brain/kb/` and updates `../../brain/kb/SUMMARY.md`.

## Running Ralph

### PowerShell
```powershell
.\ralph\ralph.ps1 -Iterations 10 -PlanEvery 3
```

### Manual (RovoDev CLI)
```powershell
# Ralph determines mode from iteration number
acli rovodev run "$(Get-Content ralph\PROMPT.md -Raw)"
```

## File Structure

```
project-root/
├── AGENTS.md                    # Project guidance for agents
├── THOUGHTS.md                  # Project vision, goals, success criteria
├── fix_plan.md                  # Prioritized Top 10 checklist
├── src/                         # Source code (or document actual)
└── ralph/
    ├── RALPH.md                 # This file - Ralph contract
    ├── PROMPT.md                # Unified prompt (mode detection)
    ├── ralph.ps1                # PowerShell loop runner
    └── progress.txt             # Iteration log (appended)
```

## Philosophy: Ralph Wiggum

Named after the Simpsons character who famously said "I'm helping!" Ralph embodies:
- **Simple and obvious** - No clever tricks, just systematic iteration
- **Persistent** - Keeps going until the job is done
- **Honest** - Logs everything, admits what it doesn't know
- **Helpful** - Focused on making progress, not being perfect

Ralph doesn't try to be smart. Ralph just follows the contract and gets the work done.
