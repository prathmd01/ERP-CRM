# Mini ERP + CRM Operations Portal

Full-stack operations portal built for the **Parul University Full Stack Developer Case Study — Round 1**. It brings customer CRM, product master data, an auditable stock ledger, and sales-challan operations into one role-protected application.

**Live application:** https://erp-crm-ochre.vercel.app

**Production API:** https://erp-crm-api1.vercel.app/api
**Repository:** https://github.com/prathmd01/ERP-CRM

## Contents

- [Features](#features)
- [Architecture](#architecture)
- [Technology](#technology)
- [Roles and permissions](#roles-and-permissions)
- [Business modules](#business-modules)
- [Core business rules](#core-business-rules)
- [API reference](#api-reference)
- [Validation and error handling](#validation-and-error-handling)
- [Database design](#database-design)
- [Local setup](#local-setup)
- [Demo access](#demo-access)
- [Testing](#testing)
- [Deployment](#deployment)
- [Assumptions and limitations](#assumptions-and-limitations)

## Features

- JWT login with bcrypt password verification and backend role-based authorization.
- Customer CRM with customer type, lifecycle status, follow-up date, notes, search, filters, pagination, detail view, create, update, and delete operations.
- Product master with SKU uniqueness, category filtering, low-stock status, pagination, and metadata maintenance.
- Inventory current-stock view plus an `IN`/`OUT` movement ledger recording reason, operator, and timestamp.
- Sales challans with multiple item lines, immutable product snapshots, DRAFT/CONFIRMED/CANCELLED states, and stock-safe confirmation.
- Dashboard totals, five recent challans, and five lowest-stock products.
- Responsive React UI with protected routes, role-aware navigation/actions, loading, empty, and error states.

## Architecture

```text
React + TypeScript + Vite
        │ Axios (Bearer token)
        ▼
Express REST API (/api)
        │ authentication → authorization → validation
        ▼
Controllers → services → Prisma Client
        ▼
PostgreSQL (Neon in production)
```

The frontend keeps the login token and user in browser `localStorage`; Axios attaches `Authorization: Bearer <token>` to requests. Express authenticates the JWT and authorizes the caller before a controller delegates to a service. Services own query, inventory, and challan business logic; Prisma persists to PostgreSQL.

## Technology

| Area | Implementation |
| --- | --- |
| Frontend | React 18, TypeScript, Vite, React Router, Axios, Tailwind CSS |
| Backend | Node.js, Express, TypeScript |
| Data | PostgreSQL, Prisma ORM, Prisma migration and seed script |
| Security | `bcryptjs`, `jsonwebtoken`, CORS, backend RBAC |
| Validation | Zod request schemas |
| Tests | Node test runner via `tsx`, Prisma service mocks |
| Hosting | Vercel frontend and backend; Neon PostgreSQL |

## Roles and permissions

Authentication answers **“Who are you?”**: the login endpoint verifies the password and supplies a signed token. Authorization answers **“What are you allowed to do?”**: protected backend routes check the JWT role. Hiding a frontend button improves usability, but the backend middleware is the security boundary.

| Module / action | ADMIN | SALES | WAREHOUSE | ACCOUNTS |
| --- | --- | --- | --- | --- |
| Dashboard | Read | Read | Read | Read |
| Customers: list/detail | Read | Read | — | Read |
| Customers: create/update/delete | Write | Write | — | — |
| Products: list/detail | Read | Read | Read | Read |
| Products: create/update | Write | — | Write | — |
| Inventory: current stock | Read | Read | Read | Read |
| Inventory: movement history / adjustment | Write | — | Write | — |
| Challans: list/detail | Read | Read | — | Read |
| Challans: create/confirm/cancel | Write | Write | — | — |

The matrix is derived from route authorization middleware, rather than UI visibility.

### Authentication flow

1. `POST /api/auth/login` validates an email and non-empty password.
2. The backend fetches the user by email and uses `bcrypt.compare()` against `passwordHash`.
3. On success it signs a JWT that contains `userId` and `role`, with a 24-hour expiry, and returns the token plus non-sensitive user fields.
4. The Axios request interceptor sends the token as a bearer token. `authenticate` verifies it for protected routes; `authorize` checks the route’s allowed roles.
5. Missing, invalid, or expired tokens return `401`. A valid token without the required role returns `403`.

The frontend restores a stored session at startup, redirects unauthenticated visitors to `/login`, and clears stored credentials/redirects to login after an API `401`.

## Business modules

### Customer CRM

`Customer` stores `name`, `mobile`, `email`, `businessName`, optional `gstNumber`, `customerType`, `address`, `status`, optional `followUpDate`, `notes`, and timestamps. Types are `RETAIL`, `WHOLESALE`, or `DISTRIBUTOR`; statuses are `LEAD`, `ACTIVE`, or `INACTIVE`.

- Customer listing searches name, mobile, or business name case-insensitively and filters by status and type.
- Detail retrieval includes up to ten most recent challans and their items.
- Sales and administrators create, update, and delete customers. Updating the follow-up date accepts an ISO date-time or `null`; notes default to an empty string on creation.

### Products

`Product` stores `name`, unique `sku`, `category`, decimal `unitPrice`, `currentStock`, `minimumStock`, `warehouse`, and timestamps.

- Listing searches name, SKU, or category case-insensitively; it can filter to products where `currentStock <= minimumStock` and returns `isLowStock`.
- Sales, warehouse, accounts, and administrators can read products. Only warehouse and administrators can create or update product metadata.
- Product updates deliberately exclude `currentStock`; stock changes use the inventory movement endpoint so each normal adjustment has a ledger entry.
- Creating a product with positive initial stock runs in a transaction and creates an `IN` movement with reason `Initial stock balance`.

### Inventory

Current inventory is the product list, including current stock, minimum stock, warehouse, and low-stock status. The separate movement ledger records product, positive quantity, `IN` or `OUT` type, reason, creating user, and timestamp.

- Warehouse and administrators can view the ledger and post manual movements.
- An `IN` movement adds its quantity. An `OUT` movement subtracts it only if the resulting stock is not negative; the product update and movement creation occur in one Prisma transaction.
- Ledger history can filter by `productId`. Current inventory supports search across name, SKU, and category plus `lowStock=true`; its validated query parameters do not include a standalone category filter.

### Sales challans

A challan is created for one customer with one or more product/quantity lines. It contains a generated `CH-YYYYMMDD-NNNN` number, total quantity, creator, timestamps, and a status of `DRAFT`, `CONFIRMED`, or `CANCELLED`.

When created, each `ChallanItem` snapshots the product name, SKU, and unit price. These snapshot values remain on the item even if product master data changes later. Creating a draft does **not** change inventory.

```text
Create (DRAFT)
  → confirm
  → aggregate repeated product lines
  → validate all stock requirements
  → guarded stock decrements + OUT movements (one transaction)
  → CONFIRMED
```

Confirmation reads the draft in a Prisma transaction, rejects non-draft states, totals quantities for duplicate product lines, checks every product’s available stock, then performs a conditional `updateMany` decrement (`currentStock >= required quantity`) for each product. It creates a corresponding `OUT` movement with the challan number in its reason, then marks the challan confirmed. The final conditional decrement guards against concurrent confirmation races; transaction failure rolls back all related changes.

Cancellation is only valid for a DRAFT challan and changes its status to `CANCELLED`; it does not reverse inventory because a draft has not deducted it.

### Dashboard and UI

`GET /api/dashboard` returns total customer/product/challan counts, low-stock count, the five most recent challans, and up to five low-stock products ordered by current stock ascending. Every role can view the dashboard. The React app also provides role-aware navigation and protected client routes, while the server continues to enforce permission checks.

## Core business rules

1. Stock values cannot become negative through manual `OUT` movements or challan confirmation.
2. A new challan is always a DRAFT and does not alter stock.
3. Only DRAFT challans can be confirmed or cancelled; confirmed and cancelled challans cannot transition again.
4. Confirming a challan validates customer/products at creation time and validates all aggregated stock requirements at confirmation time.
5. Insufficient stock fails confirmation before any stock decrement. The confirmation transaction prevents partial stock/movement commits.
6. Successful confirmation decrements stock and writes `OUT` ledger movements in the same transaction.
7. Repeated lines for the same product are aggregated before confirmation, preventing separate deductions from bypassing the combined stock requirement.
8. Product name, SKU, and price are captured per challan item when the draft is created.
9. Positive initial stock at product creation produces an auditable `IN` movement.

## API reference

Base URL: `https://erp-crm-api1.vercel.app/api`

Local base URL: `http://localhost:5000/api`

Successful API responses use `{ "success": true, "data": ... }`; errors use `{ "success": false, "message": "..." }`. All routes except health and login require `Authorization: Bearer <token>`.

| Method | Route | Access | Purpose and key inputs |
| --- | --- | --- | --- |
| GET | `/health` | Public | API health check. |
| POST | `/auth/login` | Public | Body: `email`, `password`; returns JWT and user. |
| GET | `/customers` | ADMIN, SALES, ACCOUNTS | `page`, `limit`, `search`, `status`, `customerType`. |
| GET | `/customers/:id` | ADMIN, SALES, ACCOUNTS | Customer plus up to ten recent challans. |
| POST | `/customers` | ADMIN, SALES | Create a customer. |
| PUT | `/customers/:id` | ADMIN, SALES | Update any validated customer fields. |
| DELETE | `/customers/:id` | ADMIN, SALES | Delete a customer. |
| GET | `/products` | All roles | `page`, `limit`, `search`, `category`, `lowStock=true`. |
| GET | `/products/:id` | All roles | Product plus calculated low-stock flag. |
| POST | `/products` | ADMIN, WAREHOUSE | Create product; positive initial stock creates an `IN` movement. |
| PUT | `/products/:id` | ADMIN, WAREHOUSE | Update metadata; current stock is not accepted. |
| GET | `/inventory` | All roles | Current-stock listing; `page`, `limit`, `search`, `lowStock=true`. |
| GET | `/inventory/movements` | ADMIN, WAREHOUSE | `page`, `limit`, optional `productId`. |
| POST | `/inventory/movements` | ADMIN, WAREHOUSE | Body: `productId`, positive `quantity`, `movementType`, `reason`. |
| GET | `/challans` | ADMIN, SALES, ACCOUNTS | `page`, `limit`, `status`, `search`. |
| GET | `/challans/:id` | ADMIN, SALES, ACCOUNTS | Challan, customer, creator, items, and snapshots. |
| POST | `/challans` | ADMIN, SALES | Body: `customerId`, `items: [{ productId, quantity }]`; creates DRAFT. |
| POST | `/challans/:id/confirm` | ADMIN, SALES | Confirms DRAFT, deducts stock, and records movements. |
| POST | `/challans/:id/cancel` | ADMIN, SALES | Cancels DRAFT. |
| GET | `/dashboard` | All roles | Operational counts, recent challans, low-stock products. |

### Request bodies

Customer creation requires `name`, `mobile` (at least 10 characters), `email`, `businessName`, `customerType`, and `address`; optional fields are `gstNumber`, `status`, ISO `followUpDate`, and `notes`.

Product creation requires `name`, `sku`, `category`, positive numeric `unitPrice`, and `warehouse`; `currentStock` and `minimumStock` are optional non-negative integers. Challan items require a product ID and positive integer quantity.

### Pagination, search, and filters

All paginated list endpoints return `items`, `total`, `page`, `limit`, and `totalPages`. Defaults are `page=1` and `limit=10`; limit is constrained to 1–100.

| Resource | Search | Filters |
| --- | --- | --- |
| Customers | name, mobile, business name | `status`, `customerType` |
| Products | name, SKU, category | `category`, `lowStock=true` |
| Inventory | name, SKU, category | `lowStock=true` |
| Stock movements | — | `productId` |
| Challans | challan number, customer name | `status` |

### Postman collection

Import [`postman/Fundsroom-ERP.postman_collection.json`](postman/Fundsroom-ERP.postman_collection.json) into Postman. Set its `baseUrl` variable to the production or local base URL, run **Auth → Login** to populate `token`, then supply `customerId`, `productId`, and `challanId` from API responses for ID-based calls. The collection uses the ADMIN demo account by default.

## Validation and error handling

Zod schemas validate login, customer create/update, product create/update, stock movements, challan creation, and supported list query parameters before controllers invoke services.

```text
Request → route middleware validation → controller → service → Prisma/PostgreSQL
```

The central error middleware formats:

- Zod validation failures as `400` with field-oriented messages.
- Missing/invalid/expired authentication as `401`.
- Insufficient permissions as `403`.
- Explicit missing resources as `404`.
- Business-rule failures, including insufficient stock and invalid challan states, as `400`.
- Prisma duplicate-key errors as `409` and missing-record errors as `404`.
- Invalid JSON as `400`; unhandled errors as `500` (generic message in production).

## Database design

The Prisma schema uses PostgreSQL enums for roles, customer type/status, movement type, and challan state. Unique constraints protect user email, product SKU, and challan number. Indexes support common lookups such as customer identifiers/status, product fields, stock-movement foreign keys/time, and challan number/customer/status/time.

```mermaid
erDiagram
    USER ||--o{ STOCK_MOVEMENT : creates
    USER ||--o{ CHALLAN : creates
    CUSTOMER ||--o{ CHALLAN : receives
    CHALLAN ||--o{ CHALLAN_ITEM : contains
    PRODUCT ||--o{ CHALLAN_ITEM : referenced_by
    PRODUCT ||--o{ STOCK_MOVEMENT : has
```

- `User` owns authentication data and has one of four roles.
- `Customer` is related to its sales challans.
- `Product.currentStock` is the current balance; `StockMovement` provides the operational movement record.
- `ChallanItem` references a product while persisting name, SKU, and price snapshots. Items cascade when their parent challan is deleted; other relations are restricted by database foreign keys.

## Local setup

### Prerequisites

- Node.js and npm
- PostgreSQL database

### Configure and install

```bash
cd server
npm install
copy .env.example .env

cd ../client
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env`.

`server/.env`:

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_db
JWT_SECRET=replace-with-a-strong-secret
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

`client/.env`:

```dotenv
VITE_API_URL=http://localhost:5000/api
```

Never commit production database URLs or JWT secrets.

### Database and application commands

```bash
cd server
npm run db:generate
npm run db:migrate
npm run db:seed
npm run dev
```

In a second terminal:

```bash
cd client
npm run dev
```

Vite serves locally on port 5173 and proxies `/api` to port 5000. `npm run db:push`, `npm run db:studio`, `npm run build`, and `npm start` are also available in the relevant package.

> Warning: the seed script deletes existing challan items, challans, stock movements, products, customers, and users before creating its demo dataset. Do not run it against production data.

## Demo access

All seeded users use the intentionally provided demo password `Demo@123`.

| Role | Email |
| --- | --- |
| ADMIN | `admin@erp.demo` |
| SALES | `sales@erp.demo` |
| WAREHOUSE | `warehouse@erp.demo` |
| ACCOUNTS | `accounts@erp.demo` |

## Testing

Run the focused backend suite:

```bash
cd server
npm test
```

The tests use Node’s built-in test runner through `tsx` and mocked Prisma service calls, so they do not write to the development database. They cover successful/failed login, auth and authorization rejection, initial-stock movement creation, draft behavior and snapshots, confirmation stock deduction and `OUT` movement creation, insufficient-stock prevention before updates, and invalid confirmation states.

## Deployment

The confirmed production deployment uses Vercel for the frontend (`erp-crm`) and backend (`erp-crm-api1`), with Neon PostgreSQL. The production branch is `main`.

- Frontend: https://erp-crm-ochre.vercel.app
- Backend health check: https://erp-crm-api1.vercel.app/api/health
- API base URL: https://erp-crm-api1.vercel.app/api

Production configuration must supply `DATABASE_URL`, `JWT_SECRET`, `CLIENT_URL`, `NODE_ENV`, and the frontend `VITE_API_URL` without exposing their real secret values. No Vercel configuration file is tracked in this repository.

## Assumptions and limitations

- Customer deletion may be blocked by database foreign-key relationships when a customer has challans; there is no archival workflow.
- There is no user-management UI, password reset, token refresh, or product deletion endpoint.
- No inventory reversal workflow exists for confirmed challans or manual movements.
- Challan numbers use a date plus random four-digit suffix with up to five application-level collision retries, not a sequential database counter.
- Automated tests are focused unit/service-level coverage; browser UI tests and live database integration tests are not included.
- No OpenAPI specification is provided; this README and the Postman collection are the API reference.
