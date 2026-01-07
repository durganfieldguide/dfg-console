---
description: End of Day - Update handoff and commit
---

End of Day routine for Dev Team:

1. Read the current handoff at `docs/handoffs/DEV.md`

2. **Summarize this session yourself** by reviewing:
   - What issues/PRs you worked on (check `git log --oneline -10`)
   - What you deployed or merged
   - What decisions were made
   - What's ready for next session
   - Any blockers or gotchas discovered

3. Update the handoff file with:
   - **Updated date**: Set to today's date
   - **Current Focus**: Update if sprint/priorities changed
   - **What Works**: Add any new validated patterns
   - **Lessons Learned**: Add any new lessons from this session
   - **Watch Out For**: Add any new gotchas discovered
   - **Session Notes**: 
     - Replace "Last session" with this session's summary
     - Update "Next session should" with clear handoff for tomorrow

4. Show the diff of changes

5. After Captain confirms, commit and push:
   ```bash
   git add docs/handoffs/DEV.md
   git commit -m "docs(handoffs): update DEV team handoff"
   git push
   ```

6. Confirm the commit was successful

**Key principle:** You have the session context. Summarize your own work — don't ask Captain to summarize for you.
