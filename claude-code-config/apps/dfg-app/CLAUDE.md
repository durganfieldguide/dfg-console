# CLAUDE.md - DFG App (Frontend)

This file provides frontend-specific guidance for the DFG Next.js application.

## About This App

The DFG App is a Next.js 14 operator console for reviewing opportunities, managing listings, and tracking flip performance.

## Build Commands

```bash
# From apps/dfg-app/
npm run dev              # Start dev server (localhost:3000)
npm run build            # Production build
npm run type-check       # TypeScript validation
npm run lint             # ESLint
```

## Tech Stack

- Next.js 14 (App Router)
- React 18 with TypeScript
- Tailwind CSS
- NextAuth.js (GitHub OAuth)
- Radix UI components

## iOS Safari / Mobile Patterns (Critical)

DFG operators primarily use the app on **iOS Safari**. All UI changes must follow these patterns:

### Layout
- Use `flex flex-col md:flex-row` for page containers
- Navigation renders a fixed mobile header (h-14) - add spacer div on mobile
- Use `min-h-screen` instead of `h-screen` to avoid viewport issues

### Fixed/Sticky Elements
- Prefer `position: sticky` over `position: fixed`
- Never use `-webkit-transform: translateZ(0)` on body/ancestors (breaks fixed positioning)
- For bottom-fixed elements, use `pb-safe` class for safe area inset

### Touch Targets
- Minimum 44x44px tap targets for all interactive elements

### Example Page Layout
```tsx
<div className="flex flex-col md:flex-row min-h-screen w-full">
  <Navigation />
  <main className="flex-1 min-w-0">
    <div className="h-14 md:hidden" />
    <div className="p-4">{children}</div>
  </main>
</div>
```

## Code Style

- TypeScript strict mode
- Tailwind CSS for styling (no CSS modules)
- Use `cn()` utility from `src/lib/utils.ts` for conditional classes
- Client components: Add `'use client'` directive when using hooks or browser APIs
- Server components: Default for pages and layouts

## Component Patterns

### Server vs Client Components
- **Server components (default)**: Data fetching, layout, static content
- **Client components**: Interactive UI, hooks, browser APIs, event handlers

### Data Fetching
- Use server components for initial data loads
- Use `fetch()` with Next.js cache options
- Client-side fetching with `useSWR` or `useQuery` for dynamic updates

### Forms
- Use React Hook Form for validation
- Server Actions for mutations (Next.js 14)
- Toast notifications for user feedback

## API Integration

Base URL from environment variable:
```typescript
const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.dfg.dev'
```

Authentication headers:
```typescript
const headers = {
  'Authorization': `Bearer ${session.accessToken}`,
  'Content-Type': 'application/json'
}
```

## Money Math Display

Always use these exact definitions when displaying financials:
- **Acquisition Cost** = Bid + Buyer Premium + Transport + Immediate Repairs
- **Net Proceeds** = Sale Price − Listing Fees − Payment Processing
- **Profit** = Net Proceeds − Acquisition Cost
- **Margin %** = (Profit / Acquisition Cost) * 100

Format currency with `Intl.NumberFormat`:
```typescript
const formatCurrency = (amount: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount)
```

## Common Tasks

### Adding a New Page
1. Create `app/[route]/page.tsx`
2. Use server component by default
3. Add to navigation if needed
4. Test on iOS Safari

### Adding a New Component
1. Create in `src/components/` (shared) or `app/[route]/_components/` (route-specific)
2. Use TypeScript interfaces for props
3. Add `'use client'` only if needed
4. Test responsive behavior

### Styling Guidelines
- Mobile-first: Start with mobile styles, add `md:` for desktop
- Use Tailwind's spacing scale (4px increments)
- Prefer utility classes over custom CSS
- Use `cn()` for conditional classes

## Security

- No server secrets in client bundles
- Validate all user input
- Use NextAuth session for protected routes
- CSRF protection via NextAuth
