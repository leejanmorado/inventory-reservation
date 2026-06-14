# Inventory Reservation API

> **Demo video**: _link to be added_
> **Deployed URL**: _link to be added after Vercel deployment_
> **GitHub repo**: _link to be added_

A concurrency-safe inventory reservation API built with Express.js, TypeScript, Supabase (PostgreSQL), and deployed on Vercel.

---

## Overview

This API allows a fictitious store to manage inventory with temporary holds (reservations), confirmations, cancellations, and automatic expiration. Key design decisions:

- **Concurrency safety**: Critical operations (`create`, `confirm`, `cancel`) are implemented as PostgreSQL functions using `SELECT ... FOR UPDATE` row-level locking. Called via `supabase.rpc()` since PostgREST cannot issue `FOR UPDATE` directly.
- **Idempotency**: Each function re-reads the locked row and short-circuits on terminal states — confirming or cancelling twice has no additional side effects.
- **Available quantity**: Computed dynamically from `reservations` aggregation — no separate column, so expirations take effect immediately without secondary writes.

---

## Tech Stack

- **Runtime**: Node.js + TypeScript
- **Framework**: Express.js v5
- **Database**: Supabase (PostgreSQL) via `@supabase/supabase-js`
- **Validation**: Zod v4
- **API Docs**: `@asteasolutions/zod-to-openapi` + `swagger-ui-express`
- **Deployment**: Vercel

---

## Environment Variables

| Variable | Description |
|---|---|
| `SUPABASE_URL` | Supabase project URL (`http://127.0.0.1:54321` locally, or your cloud URL) |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key — used server-side only, bypasses RLS |
| `PORT` | Local dev port (default: `3000`) |

Copy the example file (`.env.example` already contains the default local dev values):

```bash
cp .env.example .env
```

---

## Supabase Setup

### Local development

1. Install the [Supabase CLI](https://supabase.com/docs/guides/cli)
2. Start the local stack:
   ```bash
   supabase start
   ```
   This boots a local Postgres + PostgREST + Studio. The default credentials in `.env.example` already match what it prints.
3. Open **Supabase Studio** at `http://127.0.0.1:54323`
4. Go to **SQL Editor**, paste the entire contents of `migration.sql`, and click **Run**

### Cloud

1. Create a project at [supabase.com](https://supabase.com)
2. Go to **Settings → API** and copy the **Project URL** and **service_role** key into `.env`
3. Open **SQL Editor** in the dashboard, paste `migration.sql`, and click **Run**

Both options create the `items` and `reservations` tables, indexes, and the PostgreSQL functions the API depends on.

---

## Run Locally

```bash
npm install
cp .env.example .env   # fill in SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

The server starts at `http://localhost:3000`.

- Swagger UI: `http://localhost:3000/docs`
- OpenAPI JSON: `http://localhost:3000/openapi.json`

---

## API Reference

| Method | Path | Description |
|---|---|---|
| `POST` | `/v1/items` | Create an item with initial quantity |
| `GET` | `/v1/items/:id` | Get item status (total / available / held / confirmed) |
| `POST` | `/v1/reservations` | Create a reservation (10-min hold) |
| `POST` | `/v1/reservations/:id/confirm` | Confirm a reservation (idempotent) |
| `POST` | `/v1/reservations/:id/cancel` | Cancel a reservation (idempotent) |
| `POST` | `/v1/maintenance/expire-reservations` | Expire all stale PENDING reservations |

Full documentation available at `/docs` (Swagger UI) or `/openapi.json`.

---

## Deploy to Vercel

1. Install the Vercel CLI: `npm i -g vercel`
2. Run `vercel` and follow the prompts to link/create a project
3. In the Vercel dashboard, go to **Settings → Environment Variables** and add:
   - `SUPABASE_URL`
   - `SUPABASE_SERVICE_ROLE_KEY`
4. Deploy: `vercel --prod`

The `vercel.json` at the project root handles routing — all requests are rewritten to `api/index.ts`.

---

## Reproducing Concurrency Scenarios

### Simultaneous reservations exceeding stock

Create an item with quantity 5, then fire two reservation requests of quantity 4 simultaneously:

```bash
# Create item
curl -s -X POST http://localhost:3000/v1/items \
  -H 'Content-Type: application/json' \
  -d '{"name":"Widget","initial_quantity":5}' | jq .

# Store the item id, then fire two competing requests:
ITEM_ID="<item_id_from_above>"

curl -s -X POST http://localhost:3000/v1/reservations \
  -H 'Content-Type: application/json' \
  -d "{\"item_id\":\"$ITEM_ID\",\"customer_id\":\"cust-1\",\"quantity\":4}" &

curl -s -X POST http://localhost:3000/v1/reservations \
  -H 'Content-Type: application/json' \
  -d "{\"item_id\":\"$ITEM_ID\",\"customer_id\":\"cust-2\",\"quantity\":4}" &

wait
```

**Expected**: one request returns `201` with the reservation, the other returns `409 insufficient_inventory`.

### Idempotent confirmation

```bash
RES_ID="<reservation_id>"
curl -X POST http://localhost:3000/v1/reservations/$RES_ID/confirm
curl -X POST http://localhost:3000/v1/reservations/$RES_ID/confirm
```

**Expected**: both calls return `200` with `status: CONFIRMED`. Inventory is only deducted once.

### Expiration flow

```bash
# After a reservation's expires_at passes, run:
curl -X POST http://localhost:3000/v1/maintenance/expire-reservations

# Then check item status — available quantity should increase:
curl http://localhost:3000/v1/items/$ITEM_ID
```

---

## Known Limitations / Trade-offs

- **No background expiration worker**: `POST /v1/maintenance/expire-reservations` must be called manually (or via a scheduled job/cron). Supabase `pg_cron` or Vercel Cron Jobs can automate this.
- **No authentication**: endpoints are open. In production, the maintenance endpoint at minimum should be secured.
- **Service role key**: used for all operations (bypasses RLS). Production should use Row Level Security with appropriate policies.
- **Connection pooling**: Vercel functions are stateless; the Supabase JS SDK handles connections per invocation. For high throughput, consider Supabase's PgBouncer pooler URL.
