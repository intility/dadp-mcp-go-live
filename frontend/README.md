# MCP Go-Live Frontend

React-based web interface for reviewing and managing MCP server go-live reports.

This project was bootstrapped with the [Intility React Template](https://github.com/Intility/templates/).

## Purpose

This frontend application provides a user-friendly interface for the platform team to review, approve, and reject MCP server go-live reports submitted by developers. It solves the problem of manual report management by providing:

- Dashboard with overview statistics
- Filterable report list (pending, approved, rejected)
- Detailed report viewing with markdown rendering
- One-click approve/reject workflow

## Intended consumers

This application is intended for the **Intility Platform Team** who need to:
- Review MCP server submissions before they go live
- Track the status of all submitted servers
- Approve or reject submissions with notes

## Main technologies

- **React 19** - UI framework
- **TypeScript** - Type safety
- **Vite** - Build tool and dev server
- **Bifrost** - Intility design system
- **TanStack Query** - Data fetching
- **React Router 7** - Client-side routing

## Available at

**Local Development:** http://localhost:5173

**Production:** Not yet deployed (POC)

## Getting Started

### Prerequisites

- Node.js 18+ (preferably 20+)
- Access to Intility NPM registry (configured in `.npmrc`)
- Rust API running on http://localhost:8080

### First-time setup

```bash
# From repository root
cd frontend

# Install dependencies
npm install
```

### Running the project

**Option 1: Using npm directly**
```bash
npm run dev
# Opens at http://localhost:5173
```

**Option 2: Using justfile (from repository root)**
```bash
just run-frontend
```

**Full stack setup:**
```bash
# Terminal 1: Start API and database
just run-api

# Terminal 2: Start frontend
just run-frontend
```

### Available Scripts

| Script | Description |
|--------|-------------|
| `npm start` | Start development server (alias for `dev`) |
| `npm run dev` | Start Vite dev server at http://localhost:5173 |
| `npm run build` | Build for production to `dist/` folder |
| `npm run preview` | Preview production build |
| `npm test` | Run tests with Vitest |
| `npm run lint` | Lint code with Biome |

## Project Structure

```
src/
├── api/                    # API client and React Query hooks
│   ├── client.ts           # HTTP client (ky)
│   └── queries.ts          # React Query hooks
├── components/             # Reusable components
│   ├── ReportCard.tsx      # Report summary card
│   ├── StatusBadge.tsx     # Status indicator
│   ├── ReviewForm.tsx      # Approve/reject form
│   └── RootLayout.tsx      # App navigation layout
├── routes/                 # Page components
│   ├── Dashboard.tsx       # Home page with stats
│   ├── ReportList.tsx      # Filterable report list
│   └── ReportDetail.tsx    # Full report with review
├── types/                  # TypeScript definitions
│   └── api.ts              # API response types
└── router.tsx              # Route configuration
```

## Configuration

Environment variables in `.env`:

```bash
# API Configuration
VITE_API_BASE_URL=http://localhost:8080/api/v1
```

## Features

- **Dashboard**: Overview statistics and quick links
- **Report List**: Filter by status, click to view details
- **Report Detail**: Full report with approve/reject actions
- **Markdown Rendering**: Reports displayed with proper formatting
- **Real-time Updates**: React Query automatically refreshes data

## Development

### Connecting to API

The frontend expects the Rust API to be running. Start it with:

```bash
# From repository root
just run-api

# Or from rust-api directory
cd rust-api && just run
```

### Using Bifrost Components

```tsx
import { Button, Card, Message } from "@intility/bifrost-react";

function Example() {
  return (
    <Card>
      <Card.Body>
        <Message variant="success">Success!</Message>
        <Button variant="primary">Click me</Button>
      </Card.Body>
    </Card>
  );
}
```

[Bifrost Documentation](https://bifrost.intility.com/react)

## Deployment

**POC:** Not yet deployed

**Future:**
1. Build: `npm run build`
2. Deploy `dist/` to static hosting (Azure Static Web Apps, etc.)
3. Configure production API URL
4. Enable authentication (MSAL)

## Troubleshooting

### API calls failing

- Ensure Rust API is running on port 8080
- Check CORS is enabled in API
- Verify `VITE_API_BASE_URL` in `.env`

### Frontend won't start

```bash
rm -rf node_modules package-lock.json
npm install
```

## Learn More

- [Bifrost Design System](https://bifrost.intility.com)
- [React Documentation](https://react.dev)
- [Vite Documentation](https://vitejs.dev)
- [TanStack Query](https://tanstack.com/query/latest)

## Support

- **Slack:** #programming or #devinfra
- **Email:** platform-team@intility.no
