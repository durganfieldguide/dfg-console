# Durgan Field Guide - Frontend

A modern, production-ready Next.js frontend for the Durgan Field Guide AI-powered deal discovery platform.

## Tech Stack

- **Framework**: Next.js 14+ (App Router)
- **Language**: TypeScript
- **Styling**: Tailwind CSS 4
- **UI Components**: Custom components with Headless UI
- **State Management**: TanStack Query + Zustand
- **Authentication**: NextAuth.js v5
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Access to DFG Scout and Analyst APIs

### Installation

```bash
# Install dependencies
npm install

# Copy environment variables
cp .env.example .env.local

# Edit .env.local with your credentials
```

### Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `AUTH_SECRET` | NextAuth.js secret (generate with `openssl rand -base64 32`) | Yes |
| `AUTH_URL` | Your app URL (e.g., `http://localhost:3000`) | Yes |
| `ADMIN_EMAIL` | Admin login email | Yes |
| `ADMIN_PASSWORD` | Admin login password | Yes |
| `OPS_TOKEN` | Bearer token for Scout/Analyst APIs | Yes |
| `SCOUT_API_URL` | Scout Worker URL | No (has default) |
| `ANALYST_API_URL` | Analyst Worker URL | No (has default) |

### Development

```bash
# Start development server
npm run dev

# Open http://localhost:3000
```

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## Project Structure

```
src/
├── app/                      # Next.js App Router pages
│   ├── (dashboard)/          # Authenticated dashboard routes
│   │   ├── dashboard/        # Main dashboard
│   │   ├── opportunities/    # Deal candidates list
│   │   ├── analysis/[id]/    # Analysis results
│   │   └── settings/         # User settings
│   ├── api/                  # API route handlers
│   │   ├── auth/             # NextAuth.js handlers
│   │   ├── scout/            # Scout API proxy
│   │   └── analyst/          # Analyst API proxy
│   ├── login/                # Login page
│   └── layout.tsx            # Root layout
├── components/
│   ├── ui/                   # Reusable UI components
│   │   ├── button.tsx
│   │   ├── badge.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   ├── select.tsx
│   │   ├── skeleton.tsx
│   │   ├── table.tsx
│   │   ├── tabs.tsx
│   │   └── toast.tsx
│   └── features/             # Feature-specific components
│       ├── countdown.tsx
│       ├── score-indicator.tsx
│       ├── sidebar.tsx
│       ├── stat-card.tsx
│       └── verdict-badge.tsx
└── lib/
    ├── api/                  # API client and mock data
    │   ├── client.ts
    │   └── mock-data.ts
    ├── hooks/                # Custom React hooks
    │   └── use-mock-mode.ts
    ├── types/                # TypeScript type definitions
    │   └── index.ts
    ├── utils/                # Utility functions
    │   ├── cn.ts
    │   └── format.ts
    ├── auth.ts               # NextAuth.js configuration
    └── providers.tsx         # React context providers
```

## Features

### Dashboard (`/dashboard`)
- Stats overview (total candidates, runs, analyzed, purchased)
- Recent runs table with status and actions
- Run Scout button with source selection
- Load More button to sync pending candidates
- Auto-refresh every 30 seconds

### Opportunities (`/opportunities`)
- Filterable data table with all deal candidates
- Filters: source, category, status, score, search
- Sortable columns
- Bulk selection and rejection
- Analyze button triggers AI analysis
- Countdown timer for auction end dates

### Analysis (`/analysis/[id]`)
- Verdict badge (BUY/MARGINAL/PASS)
- Max bid recommendation with copy button
- Key metrics: retail estimate, expected profit, margin, confidence
- Tabbed view: Summary, Condition, Investor Lens, Buyer Lens, Full Report
- Re-analyze and export PDF buttons

### Settings (`/settings`)
- Development mode toggle (mock vs live data)
- API token management
- Theme selection (light/dark/system)
- Source and category configuration
- Notification preferences
- Billing placeholder

## Mock Data Mode

The application includes a mock data mode for development and testing without hitting the live APIs:

1. Toggle in Settings page
2. Or set in localStorage: `dfg-mock-mode`

Mock data includes sample runs, listings, and analysis results.

## API Integration

All API calls are proxied through Next.js API routes to:
- Keep the OPS_TOKEN secure on the server
- Handle CORS properly
- Add proper error handling

### Scout API Endpoints
- `POST /api/scout/run` - Trigger new scout run
- `GET /api/scout/stats` - Get stats and recent runs
- `GET /api/scout/sync-next-batch` - Load more candidates
- `GET /api/scout/listings` - Get listings with filters
- `POST /api/scout/listings/reject` - Bulk reject listings

### Analyst API Endpoints
- `POST /api/analyst/analyze` - Run AI analysis
- `GET /api/analyst/analysis/[id]` - Get analysis results

## Deployment

### Vercel (Recommended)

1. Push to GitHub
2. Import project in Vercel
3. Add environment variables
4. Deploy

```bash
# Or deploy with CLI
npm i -g vercel
vercel
```

### Environment Variables in Vercel

Set in Vercel Dashboard > Project > Settings > Environment Variables:

```
AUTH_SECRET=<generated-secret>
AUTH_URL=https://your-app.vercel.app
ADMIN_EMAIL=your@email.com
ADMIN_PASSWORD=your-password
OPS_TOKEN=your-ops-token
SCOUT_API_URL=https://dfg-scout.automation-ab6.workers.dev
ANALYST_API_URL=https://dfg-analyst.automation-ab6.workers.dev
```

## Design System

### Colors
- **Primary**: Blue (#2563eb / #3b82f6 dark)
- **Success/BUY**: Green (#22c55e)
- **Warning/MARGINAL**: Yellow (#f59e0b)
- **Danger/PASS**: Red (#ef4444)

### Typography
- Sans: Geist Sans
- Mono: Geist Mono

### Components
All components support dark mode and follow WCAG 2.1 AA accessibility guidelines.

## Questions Addressed

1. **State Management**: React Query for server state, Zustand for client state (mock mode toggle, filters)

2. **Real-time Updates**: Polling every 30s on dashboard. SSE can be added later if needed.

3. **Table Library**: Custom table using Tailwind UI patterns. TanStack Table can be added for advanced features.

4. **PDF Export**: Placeholder for client-side export. Can use jsPDF or server-side Puppeteer.

5. **Image Handling**: Next.js Image component with external image domains configured.

## Future Enhancements

- [ ] Analytics page with charts
- [ ] Email notification integration
- [ ] Stripe billing integration
- [ ] Mobile app (React Native)
- [ ] Slack integration
- [ ] Server-Sent Events for live updates
- [ ] PDF export functionality
- [ ] Multi-tenant support

## License

Proprietary - SMDurgan LLC
