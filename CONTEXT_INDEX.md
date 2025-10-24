# Context Index - Task-Based File Selection

## When Working on New Features

1. **SYSTEM_CORE.md** - Architecture overview and service catalog
2. **Search existing code** - Pattern matching for similar implementations
3. **default-settings.json** - Data structures and configuration schema
4. **Relevant test file** - Expected behavior and edge cases

## When Fixing Bugs

1. **SESSION_MEMORY.json** - Recent changes that might relate
2. **Search specific function/service** - Locate exact implementation
3. **Git log** - Recent commits touching affected code
4. **Relevant test file** - Reproduce issue, verify fix

## When Doing Code Review

1. **SYSTEM_CORE.md** - Verify against documented architecture
2. **Git log** - Recent changes (last 5-10 commits)
3. **Test suite results** - Coverage and pass rates
4. **SESSION_MEMORY.json** - Update with new verified facts

## When Onboarding

1. **SYSTEM_CORE.md** - Complete system overview (300 lines)
2. **complete-calculation-engine.cjs** - Core business logic (925 lines, chunk as needed)
3. **server-secure.cjs** - API endpoints and security (first 400 lines)
4. **Test files** - See working examples of all services

## When Troubleshooting Integration Issues

1. **SYSTEM_CORE.md** - Integration requirements section
2. **.env.example** - Required environment variables
3. **Search integration name** - Find all usage points
4. **server-secure.cjs** - Integration initialization and error handling

## When Optimizing Performance

1. **SESSION_MEMORY.json** - Recent performance-related changes
2. **Search performance keywords** - `cache`, `debounce`, `rate-limit`, `compression`
3. **server-secure.cjs** - Middleware configuration
4. **webpack.config.cjs** - Frontend optimization settings

## File Priority Matrix

**Always Load (< 1000 tokens total):**
- SYSTEM_CORE.md
- SESSION_MEMORY.json

**Load When Relevant:**
- default-settings.json (service data needed)
- .env.example (integration work)
- Specific test files (verifying behavior)

**Read on Demand (Chunk):**
- complete-calculation-engine.cjs (925 lines)
- server-secure.cjs (1400 lines)
- integrated-ui.html (6650 lines)

**Archive (Historical Only):**
- context/domain-knowledge.md (replaced by SYSTEM_CORE.md)
- FINAL_COMPLETION_REPORT.md (outdated)
- All SETTINGS_MODAL_*.md files (development artifacts)

## Tool Selection by Task Type

### When to use READ:
- Known file path
- Need complete file or specific offset
- File size < 2000 lines
- Reading configuration or data files

### When to use GREP:
- Pattern search across files
- Need line numbers + context
- Know file type to search (*.cjs, *.js)
- Finding function definitions or usage

### When to use AGENT:
- Open-ended search (>3 search iterations expected)
- Complex multi-file investigation
- Need synthesis across many results
- Ambiguous requirements needing research

### When to use PARALLEL TOOL CALLS:
- Multiple independent file reads
- Simultaneous frontend/backend verification
- Comparison across modules
- Reading test files while checking implementation

### Tool Combination Patterns:
- **Grep → Read**: Search for pattern, then read complete matches
- **Read (parallel)**: Multiple independent files simultaneously
- **Agent (delegated)**: Complex research spanning many files
