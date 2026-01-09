---
description: Check if UI changes follow iOS Safari mobile patterns
---

Review recent UI changes for iOS Safari compatibility:

**Check for iOS Safari patterns:**

1. **Layout:**
   - Using `flex flex-col md:flex-row` for page containers?
   - Mobile spacer div `<div className="h-14 md:hidden" />` after Navigation?
   - Using `min-h-screen` instead of `h-screen`?

2. **Fixed/Sticky Elements:**
   - Using `position: sticky` over `position: fixed`?
   - No `-webkit-transform: translateZ(0)` on body/ancestors?
   - Bottom-fixed elements using `pb-safe` class?

3. **Touch Targets:**
   - All interactive elements minimum 44x44px?

4. **Common Issues:**
   - Viewport height problems (use `min-h-screen`)
   - Fixed positioning breaking on scroll
   - Safe area inset issues on iPhone notch

Review the specified files or recent changes and report any violations of these patterns.
