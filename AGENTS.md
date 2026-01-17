# Project Guidance for AI Agents

## Knowledge Base (MUST USE)

### Progressive Disclosure: Always Read in This Order

**ALWAYS start here:**
1. `../../brain/kb/SUMMARY.md` - Knowledge base overview and usage guide
2. `../../brain/references/react-best-practices/HOTLIST.md` - Top 10 most applicable performance rules (covers 80% of scenarios)

**Only if HOTLIST doesn't cover your scenario:**
3. `../../brain/references/react-best-practices/INDEX.md` - Full categorized rule index (find specific categories)

**Only when you need deep knowledge on a specific topic:**
4. `../../brain/references/react-best-practices/rules/*` - Individual rule files (read ONLY specific rules you need)

❌ **NEVER scan all 45 rules by default** - Token-inefficient and slow  
✅ **Use the hierarchy above** - Fast and targeted  
✅ **Only open specific rule files when needed for the task** - don't read everything "just in case"

### Why This Order Matters
- **Token efficiency**: HOTLIST covers most common scenarios with minimal tokens
- **Faster results**: Start broad, drill down only when needed
- **Avoid overwhelm**: Don't read all rules unless explicitly instructed

## Knowledge Growth Rule (Mandatory)

When you discover a new convention, architectural decision, or project-specific pattern:

1. **Create a KB file** in the brain repo:
   - Project-specific: `../../brain/kb/projects/<project-slug>.md`
   - Domain/cross-project: `../../brain/kb/domains/<domain>.md`

2. **Update the index**: Add a link in `../../brain/kb/SUMMARY.md`

3. **Structure new KB files** with:
   ```markdown
   # [Title]
   
   ## Why This Exists
   [Explain the problem this solves or decision rationale]
   
   ## When to Use It
   [Specific scenarios or conditions for applying this knowledge]
   
   ## Details
   [The actual knowledge, patterns, conventions, etc.]
   ```

## Parallelism Rule

**Reading/searching/spec review**: Use up to **100 parallel subagents** for maximum efficiency
- File reading, searching, spec analysis, documentation review
- Gathering context from multiple sources simultaneously

**Build/tests/benchmarks**: Use exactly **1 agent**
- Running build commands, executing tests, benchmarks
- Making file modifications and commits

## Core Principles

### Before Making Changes
1. **Search the codebase** - Don't assume anything is missing; search first
2. **Read targeted knowledge** - Follow the hierarchy: SUMMARY → HOTLIST → specific rules
3. **Check existing patterns** - Look for established conventions in the codebase before inventing new ones

### Code Quality
- Prefer standard patterns from the knowledge base over custom solutions
- Keep components small and focused
- Write clear, self-documenting code with minimal comments

### Project Structure
- Prefer `src/` for source code (document actual location if different)
- Keep project goals and vision in `THOUGHTS.md`
- Maintain `ralph/IMPLEMENTATION_PLAN.md` as a prioritized task list

## Ralph Integration

This project uses the Ralph Wiggum iterative loop for systematic development:
- **Single unified prompt**: See `ralph/PROMPT.md` (determines mode from iteration number)
- **Progress tracking**: All work logged in `ralph/progress.txt`
- **Completion**: Look for `:::COMPLETE:::` sentinel

## RovoDev + CLI Guardrails

When working with RovoDev and Atlassian CLI:

- **Always run repo scripts with PowerShell 7** (`pwsh`), not Windows PowerShell 5.1 (`powershell.exe`)
- **If Ralph/RovoDev appears to "hang" or "wait"**, first run:
  - `acli rovodev auth status`
  - `acli rovodev usage site` (select a valid site if prompted)
  - then retry
- **Don't assume the correct site is the one open in the browser** - rely on CLI-selected site
- **If a command needs interactivity**, the agent must clearly tell the user what input/action is required
- **Avoid long-running background watchers/polling** unless the user explicitly wants it - prefer short, bounded runs

### Secrets and Tokens

- **Never paste API tokens, secrets, or credentials** into logs, markdown, or console output
- Use placeholders like `PASTE_TOKEN_HERE` and instruct the user to provide them locally

### UTF-8 Logging

- **Any PowerShell file writes must explicitly use UTF-8**:
  - `Out-File -Encoding utf8`
  - `Add-Content -Encoding utf8` (or equivalent)
- Avoid UTF-16 defaults that cause NUL spam in VS Code

## Project-Specific Notes

[Add project-specific conventions, architecture decisions, and patterns here]
