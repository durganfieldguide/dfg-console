---
description: End of Day - Update handoff and commit
---

End of Day routine for Dev Team:

1. Read the current handoff at `docs/handoffs/DEV.md`
2. Ask me to summarize what we accomplished this session
3. Update the handoff file with:
   - **Current Focus**: Update if sprint/priorities changed
   - **What Works**: Add any new validated patterns
   - **Lessons Learned**: Add any new lessons from this session
   - **Watch Out For**: Add any new gotchas discovered
   - **Session Notes**: Replace "Last session" with this session's summary; update "Next session should" with handoff for tomorrow
   - **Updated date**: Set to today's date
4. Show me the diff of changes
5. After I confirm, commit and push:
   ```bash
   git add docs/handoffs/DEV.md
   git commit -m "docs(handoffs): update DEV team handoff"
   git push
   ```
6. Confirm the commit was successful

Do not commit until I've reviewed and approved the changes.
