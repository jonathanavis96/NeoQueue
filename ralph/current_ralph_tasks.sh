#!/bin/bash
# Ralph Task Monitor - Real-time display of IMPLEMENTATION_PLAN.md tasks
#
# Usage: bash watch_ralph_tasks.sh [--hide-completed]
#
# Features:
#   - Auto-detects task formats (numbered, unnumbered, plain)
#   - Interactive hotkeys for task management
#   - Real-time file change monitoring
#   - Archive completed tasks with timestamps
#
# Supported Task Formats:
#   - [ ] **Task 1:** Description           (numbered)
#   - [ ] **Description text**              (unnumbered bold)
#   - [ ] Description text                  (plain)
#
# Interactive Hotkeys:
#   h - Toggle hide/show completed tasks
#   r - Reset/archive completed tasks to timestamped section
#   f - Force refresh display
#   c - Clear completed tasks (with confirmation)
#   ? - Show help screen
#   q - Quit cleanly

RALPH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PLAN_FILE="$RALPH_DIR/IMPLEMENTATION_PLAN.md"
HIDE_COMPLETED=false
LAST_MODIFIED=""
SHOW_HELP=false

# Parse arguments
if [[ "$1" == "--hide-completed" ]]; then
    HIDE_COMPLETED=true
fi

# Check if IMPLEMENTATION_PLAN.md exists
if [[ ! -f "$PLAN_FILE" ]]; then
    echo "Error: IMPLEMENTATION_PLAN.md not found in $RALPH_DIR"
    exit 1
fi

# Function to get file modification time
get_file_mtime() {
    stat -c %Y "$PLAN_FILE" 2>/dev/null || stat -f %m "$PLAN_FILE" 2>/dev/null
}

# Function to generate short human-readable title from task description
generate_title() {
    local desc="$1"
    
    # Strip technical IDs (T1.1, T2.3, 1.1, 2.3, etc.) from the beginning
    desc=$(echo "$desc" | sed -E 's/^[[:space:]]*\*\*[T]?[0-9]+(\.[0-9]+)*\*\*[[:space:]]*//')
    
    # Strip markdown bold markers
    desc=$(echo "$desc" | sed -E 's/\*\*//g')
    
    # Extract action verb and main object (look for common action verbs)
    if [[ "$desc" =~ ^(Rename|Update|Create|Verify|Delete|Add|Remove|Test|Implement|Fix|Refactor|Document|Migrate|Copy|Set|Run|If)[[:space:]]+(.+)$ ]]; then
        local verb="${BASH_REMATCH[1]}"
        local rest="${BASH_REMATCH[2]}"
        
        # For the rest, take up to first colon or period, or first 50 chars
        if [[ "$rest" =~ ^([^:.]+)[:.] ]]; then
            rest="${BASH_REMATCH[1]}"
        else
            rest=$(echo "$rest" | cut -c1-50)
        fi
        
        # Remove any trailing quotes, backticks, or markdown
        rest=$(echo "$rest" | sed -E 's/`[[:space:]]*$//; s/[[:space:]]*$//')
        
        echo "$verb $rest"
    else
        # Fallback: take first 60 chars or up to first colon
        if [[ "$desc" =~ ^([^:.]+)[:.] ]]; then
            echo "${BASH_REMATCH[1]}"
        else
            echo "$desc" | cut -c1-60 | sed 's/[[:space:]]*$//'
        fi
    fi
}

# Function to extract tasks from IMPLEMENTATION_PLAN.md
extract_tasks() {
    local show_completed=$1
    local current_section=""
    local in_task_section=false
    local task_counter=0
    local indent_level=0
    
    while IFS= read -r line; do
        # Detect High/Medium/Low Priority sections (flexible matching)
        # Matches: "### High Priority", "### Phase 1: Desc (High Priority)", "### 🔴 HIGH PRIORITY: Desc"
        # Case-insensitive matching via converting to uppercase for comparison
        local line_upper="${line^^}"
        if [[ "$line_upper" =~ HIGH[[:space:]]*PRIORITY ]] && [[ ! "$line_upper" =~ ARCHIVE ]]; then
            current_section="High Priority"
            in_task_section=true
            task_counter=0
        elif [[ "$line_upper" =~ MEDIUM[[:space:]]*PRIORITY ]] && [[ ! "$line_upper" =~ ARCHIVE ]]; then
            current_section="Medium Priority"
            in_task_section=true
            task_counter=0
        elif [[ "$line_upper" =~ LOW[[:space:]]*PRIORITY ]] && [[ ! "$line_upper" =~ ARCHIVE ]]; then
            current_section="Low Priority"
            in_task_section=true
            task_counter=0
        elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
            # Exit task section when we hit any other ### headers
            in_task_section=false
        fi
        
        # Only process tasks in valid sections
        if [[ "$in_task_section" == "true" ]]; then
            local status="" task_desc="" is_subtask=false
            
            # Detect indentation level (count leading spaces)
            if [[ "$line" =~ ^([[:space:]]*)-[[:space:]]\[([ x])\][[:space:]]*(.*)$ ]]; then
                local leading_spaces="${BASH_REMATCH[1]}"
                status="${BASH_REMATCH[2]}"
                task_desc="${BASH_REMATCH[3]}"
                
                # Calculate indent level (2 spaces = 1 level, 4 spaces = 2 levels, etc.)
                indent_level=$((${#leading_spaces} / 2))
                
                # Determine if this is a subtask (indented)
                if [[ $indent_level -gt 0 ]]; then
                    is_subtask=true
                else
                    # Main task - increment counter
                    ((task_counter++))
                fi
            fi
            
            # If we found a task, process it
            if [[ -n "$status" && -n "$task_desc" ]]; then
                # Skip completed tasks if --hide-completed is set
                if [[ "$show_completed" == "false" && "$status" == "x" ]]; then
                    continue
                fi
                
                # Generate short title from description
                local short_title=$(generate_title "$task_desc")
                
                # Format output with indent level
                local task_label=""
                if [[ "$is_subtask" == "true" ]]; then
                    task_label="subtask"
                else
                    task_label="Task $task_counter"
                fi
                
                if [[ "$status" == "x" ]]; then
                    echo "✓|$current_section|$task_label|$short_title|$indent_level|completed|$task_desc"
                else
                    echo "○|$current_section|$task_label|$short_title|$indent_level|pending|$task_desc"
                fi
            fi
        fi
    done < "$PLAN_FILE"
}

# Function to show help
show_help() {
    clear
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║              CURRENT RALPH TASKS - HELP                        ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    echo "  HOTKEYS:"
    echo ""
    echo "  [h]  Hide/Show Completed Tasks"
    echo "       Toggle visibility of completed tasks without modifying the file"
    echo ""
    echo "  [r]  Reset/Archive Completed Tasks"
    echo "       Move all completed tasks to an Archive section at the bottom"
    echo "       Creates: ### Archive - YYYY-MM-DD HH:MM"
    echo ""
    echo "  [f]  Force Refresh"
    echo "       Manually refresh the display (auto-refreshes on file changes)"
    echo ""
    echo "  [c]  Clear Completed Tasks"
    echo "       Permanently remove all completed tasks (with confirmation)"
    echo "       WARNING: This action cannot be undone!"
    echo ""
    echo "  [?]  Show This Help"
    echo "       Display this help screen"
    echo ""
    echo "  [q]  Quit"
    echo "       Exit the task monitor cleanly"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    echo "  Press any key to return to task monitor..."
    read -n 1 -s
}

# Function to archive completed tasks
archive_completed_tasks() {
    local timestamp=$(date "+%Y-%m-%d %H:%M")
    local temp_file="${PLAN_FILE}.tmp"
    local archive_section="### Archive - $timestamp"
    local completed_tasks=""
    local in_task_section=false
    
    # Extract completed tasks
    while IFS= read -r line; do
        if [[ "$line" =~ High[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
            in_task_section=true
        elif [[ "$line" =~ Medium[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
            in_task_section=true
        elif [[ "$line" =~ Low[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
            in_task_section=true
        elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
            in_task_section=false
        fi
        
        if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
            completed_tasks+="$line"$'\n'
        fi
    done < "$PLAN_FILE"
    
    if [[ -z "$completed_tasks" ]]; then
        echo ""
        echo "  No completed tasks to archive."
        sleep 2
        return
    fi
    
    # Write new file without completed tasks, add archive at end
    {
        local skip_line=false
        while IFS= read -r line; do
            if [[ "$line" =~ High[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ Medium[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ Low[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
                in_task_section=false
            fi
            
            # Skip completed tasks in active sections
            if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
                continue
            fi
            
            echo "$line"
        done < "$PLAN_FILE"
        
        # Add archive section
        echo ""
        echo "$archive_section"
        echo ""
        echo "$completed_tasks"
    } > "$temp_file"
    
    # Atomic replace
    mv "$temp_file" "$PLAN_FILE"
    echo ""
    echo "  ✓ Archived completed tasks to: $archive_section"
    sleep 2
}

# Function to clear completed tasks
clear_completed_tasks() {
    echo ""
    echo -n "  ⚠️  Clear all completed tasks permanently? [y/N]: "
    read -n 1 -r confirm
    echo ""
    
    if [[ ! "$confirm" =~ ^[Yy]$ ]]; then
        echo "  Cancelled."
        sleep 1
        return
    fi
    
    local temp_file="${PLAN_FILE}.tmp"
    local in_task_section=false
    
    # Write new file without completed tasks
    {
        while IFS= read -r line; do
            if [[ "$line" =~ High[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ Medium[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ Low[[:space:]]+Priority ]] && [[ ! "$line" =~ ARCHIVE|Archive ]]; then
                in_task_section=true
            elif [[ "$line" =~ ^###[[:space:]]+ ]]; then
                in_task_section=false
            fi
            
            # Skip completed tasks in active sections
            if [[ "$in_task_section" == "true" && "$line" =~ ^[[:space:]]*-[[:space:]]\[x\] ]]; then
                continue
            fi
            
            echo "$line"
        done < "$PLAN_FILE"
    } > "$temp_file"
    
    # Atomic replace
    mv "$temp_file" "$PLAN_FILE"
    echo "  ✓ Cleared all completed tasks."
    sleep 2
}

# Function to wrap text to specified width with indent
wrap_text() {
    local text="$1"
    local width="$2"
    local indent="$3"
    local first_line=true
    
    echo "$text" | fold -s -w "$width" | while IFS= read -r line; do
        if [[ "$first_line" == "true" ]]; then
            echo "$line"
            first_line=false
        else
            echo "${indent}${line}"
        fi
    done
}

# Function to display tasks with formatting
display_tasks() {
    clear
    
    # Header
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║          CURRENT RALPH TASKS - $(date +%H:%M:%S)                  ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    # Extract and group tasks by section
    local tasks
    if [[ "$HIDE_COMPLETED" == "true" ]]; then
        tasks=$(extract_tasks "false")
    else
        tasks=$(extract_tasks "true")
    fi
    
    if [[ -z "$tasks" ]]; then
        echo "  No tasks found in IMPLEMENTATION_PLAN.md"
        echo ""
        return
    fi
    
    local current_section=""
    local pending_count=0
    local completed_count=0
    
    while IFS='|' read -r icon section task_label short_title indent_level status full_desc; do
        # Print section header when it changes
        if [[ "$section" != "$current_section" ]]; then
            if [[ -n "$current_section" ]]; then
                echo ""
            fi
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            echo "  $section"
            echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
            current_section="$section"
        fi
        
        # Calculate base indent (2 spaces per level)
        local base_indent=""
        for ((i=0; i<indent_level; i++)); do
            base_indent="  ${base_indent}"
        done
        
        # Format task display with human-friendly title
        local display_line=""
        if [[ "$task_label" == "subtask" ]]; then
            # Subtask: just show the short title with bullet
            display_line="${base_indent}  • ${short_title}"
        else
            # Main task: show "Task N — <short title>" with bold
            if [[ -t 1 ]]; then
                # Terminal supports formatting
                display_line="${base_indent}  \033[1m${task_label}\033[0m — ${short_title}"
            else
                # No terminal formatting
                display_line="${base_indent}  ${task_label} — ${short_title}"
            fi
        fi
        
        # Print task with color and wrap if needed
        local wrap_width=60
        local continuation_indent="${base_indent}    "
        
        if [[ "$status" == "completed" ]]; then
            if [[ -t 1 ]]; then
                echo -e "  \033[32m${icon}\033[0m $(wrap_text "${display_line:2}" $wrap_width "$continuation_indent" | head -1)"
                # Print continuation lines if any
                wrap_text "${display_line:2}" $wrap_width "$continuation_indent" | tail -n +2 | while IFS= read -r line; do
                    echo "    $line"
                done
            else
                echo "  ${icon} ${display_line:2}"
            fi
            ((completed_count++))
        else
            if [[ -t 1 ]]; then
                echo -e "  \033[33m${icon}\033[0m $(wrap_text "${display_line:2}" $wrap_width "$continuation_indent" | head -1)"
                # Print continuation lines if any
                wrap_text "${display_line:2}" $wrap_width "$continuation_indent" | tail -n +2 | while IFS= read -r line; do
                    echo "    $line"
                done
            else
                echo "  ${icon} ${display_line:2}"
            fi
            ((pending_count++))
        fi
    done <<< "$tasks"
    
    # Footer with stats
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  Completed: $completed_count | Pending: $pending_count | Total: $((completed_count + pending_count))"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    # Hotkey legend
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║  HOTKEYS: [h] Hide/Show Done  [r] Reset/Archive  [f] Refresh  ║"
    echo "║           [c] Clear Done      [?] Help           [q] Quit     ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo ""
    
    if [[ "$HIDE_COMPLETED" == "true" ]]; then
        echo "  Mode: Hiding completed tasks (press 'h' to show)"
    fi
}

# Main loop - interactive with file watching
echo "Starting Ralph Task Monitor..."
echo "Watching: $PLAN_FILE"
echo "Interactive mode - press '?' for help"
echo ""

# Display tasks immediately on start
display_tasks

# Get initial modification time
LAST_MODIFIED=$(get_file_mtime)

# Enable non-blocking input
if [[ -t 0 ]]; then
    stty -echo -icanon time 0 min 0
fi

# Cleanup function
cleanup() {
    if [[ -t 0 ]]; then
        stty sane
    fi
    echo ""
    echo "Exiting Ralph Task Monitor..."
    exit 0
}

trap cleanup EXIT INT TERM

# Monitor for file changes and hotkeys
while true; do
    # Check for hotkey input (non-blocking)
    if read -t 0.1 -n 1 key 2>/dev/null; then
        case "$key" in
            h|H)
                # Toggle hide completed
                if [[ "$HIDE_COMPLETED" == "true" ]]; then
                    HIDE_COMPLETED=false
                else
                    HIDE_COMPLETED=true
                fi
                display_tasks
                ;;
            r|R)
                # Archive completed tasks
                archive_completed_tasks
                LAST_MODIFIED=$(get_file_mtime)
                display_tasks
                ;;
            f|F)
                # Force refresh
                display_tasks
                ;;
            c|C)
                # Clear completed tasks
                clear_completed_tasks
                LAST_MODIFIED=$(get_file_mtime)
                display_tasks
                ;;
            \?)
                # Show help
                show_help
                display_tasks
                ;;
            q|Q)
                # Quit
                cleanup
                ;;
        esac
    fi
    
    # Check for file changes
    CURRENT_MODIFIED=$(get_file_mtime)
    if [[ "$CURRENT_MODIFIED" != "$LAST_MODIFIED" ]]; then
        LAST_MODIFIED="$CURRENT_MODIFIED"
        display_tasks
    fi
    
    # Small sleep to prevent CPU spinning
    sleep 0.5
done
