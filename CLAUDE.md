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

## Agent Routing (3 agents)

| Role | Agent File | Tier Class | When to Use |
|---|---|---|---|
| module-architect | `.claude/agents/module-architect.md` | architect | Component architecture, routing patterns, API client design |
| implementer | `.claude/agents/implementer.md` | implementer | Component implementation, page coding, styling |
| reviewer | `.claude/agents/reviewer.md` | reviewer | Type safety, accessibility, component pattern review |

Selection rule: SMA dispatches the appropriate agent based on task type. Module-architect for design tasks, implementer for coding tasks, reviewer for review tasks.
