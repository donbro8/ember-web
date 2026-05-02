# ember-web

## What this package does

Standalone Next.js frontend for the Ember Bio platform. Provides the chat
interface for scientist queries, report rendering with scores and citations,
and file upload for internal documents.

## Key directories

- `src/app/` — Next.js App Router pages
- `src/components/` — React components (Chat, Message, FileUpload, ReportCard)
- `src/lib/` — API client and utilities

## How to run

```bash
npm install
npm run dev
```

## Conventions

- Communicates with ember-api via REST only — no Python dependency
- TypeScript strict mode
- App Router (not Pages Router)
- All API calls go through src/lib/api.ts
