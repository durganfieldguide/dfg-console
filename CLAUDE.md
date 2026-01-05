# DFG Project Context

This file provides context for Claude Code when working on the DFG codebase.

## Project Overview

DFG (Durgan Field Guide) is an operator tool for identifying undervalued physical assets at auction and producing conservative flip guidance. The frontend is a Next.js 14 app; the backend consists of Cloudflare Workers.

## iOS Safari / Mobile Patterns

DFG operators primarily use the app on iOS Safari. All UI changes must follow these patterns:

### Layout

- Use `flex flex-col md:flex-row` for page containers (mobile stacks vertically, desktop is side-by-side with Navigation)
- The Navigation component renders a fixed mobile header (h-14) on small screens
- Add `h-14` spacer div after Navigation on mobile to prevent content from being hidden under the header
- Use `min-h-screen` instead of `h-screen` to avoid iOS Safari viewport issues

### Fixed/Sticky Elements

- Prefer `position: sticky` over `position: fixed` where possible
- **Critical**: Never use `-webkit-transform: translateZ(0)` on body or ancestor elements - this breaks `position: fixed` children by creating a new stacking context
- For bottom-fixed elements (buttons, toolbars), use `pb-safe` class for safe area inset
- Sticky headers should use responsive top values: `sticky top-14 md:top-0`

### Touch Interactions

- Minimum tap target size: 44x44px (iOS Human Interface Guidelines)
- Ensure adequate spacing between interactive elements
- Test scroll behavior - avoid scroll blocking or rubber-banding issues

### Common Gotchas

1. **Transforms break fixed positioning**: If a parent has `transform`, `filter`, or `perspective`, fixed children are positioned relative to that parent, not the viewport
2. **100vh includes Safari's address bar**: Use `min-h-screen` with flexbox instead
3. **Portals for overlays**: Use React's `createPortal()` to render modals/sheets at document root to escape any stacking context issues

### Example Page Layout

```tsx
<div className="flex flex-col md:flex-row min-h-screen w-full">
  <Navigation />
  <main className="flex-1 min-w-0">
    {/* Mobile spacer for fixed nav */}
    <div className="h-14 md:hidden" />

    {/* Page content */}
    <div className="p-4">
      {children}
    </div>
  </main>
</div>
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (no CSS modules)
- Components in `src/components/`, pages in `src/app/`
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes
