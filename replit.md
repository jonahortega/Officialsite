# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Greek Life App — a campus event discovery & ticketing platform for fraternities, sororities, and campus organizations. Founded by Jonah Ortega & Preston Chan, targeting USC and Rutgers University.

## Artifacts

- `artifacts/greek-life` — Main app (Vite + React, Supabase auth/DB, preview at `/`)
- `artifacts/marketing-site` — Company marketing website (Vite + React, preview at `/marketing-site/`)
- `artifacts/api-server` — Express API server (preview at `/api`)
- `artifacts/mockup-sandbox` — Design mockup sandbox

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM (+ Supabase for the main app)
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
