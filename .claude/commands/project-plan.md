---
description: Create an implementation plan for a complex task
---

Create a detailed implementation plan before starting work on a complex issue:

1. Use the EnterPlanMode tool to enter planning mode
2. In planning mode, you will:
   - Explore the codebase to understand existing patterns and architecture
   - Identify all files that need to be modified or created
   - Design the implementation approach
   - Consider edge cases and potential issues
   - Create a step-by-step implementation plan
3. Present the plan to the user for approval
4. Once approved, exit planning mode and begin implementation

**When to use this command:**
- Issues with points >= 3
- Issues tagged with prio:P0
- Multi-file changes
- Architectural decisions
- Features with unclear requirements

**Do not use for:**
- Simple bug fixes
- Single-file changes
- Trivial updates
