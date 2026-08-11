# Mini ERP + CRM Operations Portal

## 1. Project Overview

This portal supports the day-to-day customer, product, warehouse, and sales-challan work of a wholesale or distribution business. It keeps customer follow-ups, product stock, inventory movements, and sales challans in one role-controlled application.

## 2. Features

- JWT login with bcrypt password verification and four seeded roles.
- Customer CRM: create, search, filter, view, update follow-up dates, status, and notes.
- Product master: create, search, filter, and update product metadata.
- Inventory: current-stock list, low-stock indication/filter, manual IN/OUT movements, and movement history for warehouse-authorized users.
- Sales challans: create DRAFT challans with multiple items, view details, confirm, and cancel.
- Dashboard API and UI with customer/product/challan counts, recent challans, and low-stock products.
- Protected React routes, role-aware navigation, loading, empty, error, and submit-feedback states.

## 3. Tech Stack

**Frontend:** React, TypeScript, Vite, Tailwind CSS, Axios, React Router.

**Backend:** Node.js, TypeScript, Express, Prisma, PostgreSQL, JWT (`jsonwebtoken`), bcrypt (`bcryptjs`), and Zod validation.

## 4. Architecture

```text
React frontend
  -> REST API (/api)
  -> Express routes, middleware, controllers, and services
  -> Prisma Client
  -> PostgreSQL
```

The frontend uses Axios to attach the JWT from local storage. Express authenticates the token and authorizes the route role before controllers call services. Services contain database and business logic; Prisma accesses PostgreSQL.

## 5. Folder Structure

```text
.
├── client/
│   ├── src/
│   │   ├── components/       # Protected route component
│   │   ├── context/          # Authentication context
│   │   ├── layouts/          # Dashboard layout/navigation
│   │   ├── pages/            # Login, dashboard, CRM, product, inventory, challan pages
│   │   ├── services/         # Axios API client
│   │   └── types/            # Frontend types
│   ├── .env.example
│   └── package.json
└── server/
    ├── prisma/
    │   ├── migrations/
    │   ├── schema.prisma
    │   └── seed.ts
    ├── src/
    │   ├── controllers/
    │   ├── lib/              # Prisma client
    │   ├── middleware/       # Auth, validation, error handling
    │   ├── routes/
    │   ├── services/
    │   ├── utils/
    │   └── validators/
    ├── .env.example
    └── package.json
```

## 6. Database Design

- `User`: name, unique email, password hash, and `Role`; creates challans and stock movements.
- `Customer`: CRM contact/business details, type, status, follow-up date, notes, and related challans.
- `Product`: unique SKU, category, price, current/minimum stock, warehouse, related movements, and challan items.
- `StockMovement`: an IN or OUT quantity, reason, timestamp, product, and creating user.
- `Challan`: unique challan number, customer, creator, total quantity, and DRAFT/CONFIRMED/CANCELLED status.
- `ChallanItem`: product reference plus immutable product-name, SKU, and unit-price snapshots and quantity. Challan items cascade when their challan is deleted.

## 7. Authentication & RBAC

`POST /api/auth/login` verifies a bcrypt password hash and returns a signed JWT containing the user ID and role. Authenticated frontend requests send `Authorization: Bearer <token>`.

Authentication establishes who the user is. Authorization checks whether that authenticated user has the role required by a route.

- `ADMIN`: all implemented operations.
- `SALES`: customer CRM write access and challan creation/confirmation/cancellation; read access to products and inventory stock.
- `WAREHOUSE`: product write access and stock-movement access; read access to products and inventory stock.
- `ACCOUNTS`: read access to customers, products, inventory stock, challans, and dashboard.

## 8. Customer CRM

Customers support contact and business details, optional GST number, RETAIL/WHOLESALE/DISTRIBUTOR type, LEAD/ACTIVE/INACTIVE status, follow-up date, and notes. The UI supports search, type/status filters, pagination, create, detail view, and CRM follow-up/status/note updates.

## 9. Product & Inventory

Products have SKU, category, unit price, current stock, minimum stock, and warehouse. Current stock at or below minimum stock is returned as low stock. New products with a non-zero initial stock create an `IN` movement named `Initial stock balance`; later stock changes use the movement endpoint, rather than direct product editing. Movement records include product, quantity, IN/OUT type, reason, creator, and timestamp.

## 10. Sales Challan Workflow

```text
DRAFT
  -> validate customer and product items
  -> on confirmation: check all required stock
  -> atomically deduct stock
  -> create OUT movement(s)
  -> CONFIRMED
```

Creating a challan saves a DRAFT and does not affect stock. Only DRAFT challans can be confirmed or cancelled. A cancelled or confirmed challan cannot change state again.

## 11. Important Business Logic

- Confirmation aggregates quantities for repeated products on one challan.
- Each stock deduction uses a conditional atomic decrement inside a Prisma transaction. If an item cannot be fulfilled, the transaction fails and no partial stock updates or movements are committed.
- Stock cannot become negative; insufficient stock returns a validation error.
- Confirmation creates OUT stock movements with the challan number in the reason.
- Product name, SKU, and unit price are captured when a challan item is created and are not overwritten at confirmation.

## 12. API Documentation

All responses use `{ success, data? , message? }`. All routes except login and health require a bearer token.

### Postman collection

Import [`postman/Fundsroom-ERP.postman_collection.json`](postman/Fundsroom-ERP.postman_collection.json) into Postman. Set `baseUrl` if the API is not running at `http://localhost:5000/api`, then run **Auth → Login** to populate the collection `token` variable. Set `customerId`, `productId`, and `challanId` from list/create responses before using ID-based requests. Use an ADMIN account for the full collection, or a role permitted by the endpoint.

| Method | Route | Auth / roles | Body | Purpose |
| --- | --- | --- | --- | --- |
| GET | `/api/health` | Public | — | API health response. |
| POST | `/api/auth/login` | Public | `{ "email", "password" }` | Authenticate and return JWT/user. |
| GET | `/api/customers` | ADMIN, SALES, ACCOUNTS | — | Paginated customers; supports `page`, `limit`, `search`, `status`, `customerType`. |
| GET | `/api/customers/:id` | ADMIN, SALES, ACCOUNTS | — | Customer and up to 10 recent challans. |
| POST | `/api/customers` | ADMIN, SALES | customer fields | Create a customer. |
| PUT | `/api/customers/:id` | ADMIN, SALES | Any customer fields | Update a customer. |
| DELETE | `/api/customers/:id` | ADMIN, SALES | — | Delete a customer. |
| GET | `/api/products` | All roles | — | Paginated products; supports `page`, `limit`, `search`, `category`, `lowStock=true`. |
| GET | `/api/products/:id` | All roles | — | Product with calculated low-stock flag. |
| POST | `/api/products` | ADMIN, WAREHOUSE | `{ "name", "sku", "category", "unitPrice", "currentStock?", "minimumStock?", "warehouse" }` | Create a product; initial positive stock produces an IN movement. |
| PUT | `/api/products/:id` | ADMIN, WAREHOUSE | Product metadata excluding `currentStock` | Update product metadata. |
| GET | `/api/inventory` | All roles | — | Paginated inventory stock; supports `page`, `limit`, `search`, `lowStock=true`. |
| GET | `/api/inventory/movements` | ADMIN, WAREHOUSE | — | Paginated movement history; supports `page`, `limit`, `productId`. |
| POST | `/api/inventory/movements` | ADMIN, WAREHOUSE | `{ "productId", "quantity", "movementType": "IN"\|"OUT", "reason" }` | Post a stock movement. |
| GET | `/api/challans` | ADMIN, SALES, ACCOUNTS | — | Paginated challans; supports `page`, `limit`, `status`, `search`. |
| GET | `/api/challans/:id` | ADMIN, SALES, ACCOUNTS | — | Challan, customer, creator, items, and snapshots. |
| POST | `/api/challans` | ADMIN, SALES | `{ "customerId", "items": [{ "productId", "quantity" }] }` | Create a DRAFT challan. |
| POST | `/api/challans/:id/confirm` | ADMIN, SALES | — | Confirm a DRAFT, deduct stock, and create OUT movements. |
| POST | `/api/challans/:id/cancel` | ADMIN, SALES | — | Cancel a DRAFT challan. |
| GET | `/api/dashboard` | All roles | — | Counts, recent challans, and low-stock products. |

Customer create fields are `name`, `mobile`, `email`, `businessName`, `customerType`, and `address`; optional fields are `gstNumber`, `status`, `followUpDate` (ISO date-time), and `notes`.

## 13. Environment Variables

Copy each example file to `.env`; never commit real credentials.

**`server/.env`**

```dotenv
DATABASE_URL=postgresql://postgres:password@localhost:5432/erp_db
JWT_SECRET=your-super-secret-jwt-key-change-in-production
PORT=5000
CLIENT_URL=http://localhost:5173
NODE_ENV=development
```

**`client/.env`**

```dotenv
VITE_API_URL=http://localhost:5000/api
```

## 14. Local Setup

Prerequisites: Node.js, npm, and a running PostgreSQL server.

```bash
cd server
npm install
copy .env.example .env

cd ../client
npm install
copy .env.example .env
```

On macOS/Linux, use `cp .env.example .env` instead of `copy`.

## 15. Database Setup

Set `DATABASE_URL` in `server/.env`, then run:

```bash
cd server
npm run db:generate
npm run db:migrate
```

`npm run db:push` is also available for schema synchronization, but migration-based setup is the reproducible path. `npm run db:studio` opens Prisma Studio.

## 16. Seed Data

```bash
cd server
npm run db:seed
```

The seed script deletes existing challan items, challans, movements, products, customers, and users before recreating demo data. Do not run it against production data.

## 17. Demo Credentials

All seeded accounts use password `Demo@123`.

| Role | Email |
| --- | --- |
| ADMIN | `admin@erp.demo` |
| SALES | `sales@erp.demo` |
| WAREHOUSE | `warehouse@erp.demo` |
| ACCOUNTS | `accounts@erp.demo` |

## 18. Frontend Run

```bash
cd client
npm run dev
```

The Vite development server uses port 5173 and proxies `/api` to port 5000. Build the frontend with `npm run build`.

## 19. Backend Run

```bash
cd server
npm run dev
```

For a production-style local run:

```bash
npm run build
npm start
```

## 20. Deployment

Deployment has not been performed. The repository includes separate frontend/backend build scripts, environment examples, a Prisma migration, configurable CORS origin (`CLIENT_URL`), backend `PORT`, and frontend API base URL (`VITE_API_URL`). A deployment must provide PostgreSQL, set production secrets/environment values, run migrations, build both applications, and serve the frontend from a configured host.

## 21. Testing

Run the focused backend business-logic suite with `cd server && npm test`. It uses Node's built-in test runner through `tsx` and isolated Prisma mocks, so it does not change the development database. It covers login, authentication/authorization rejection, initial-stock movements, draft/confirmation stock behavior, OUT movements, insufficient-stock atomicity, challan snapshots, and invalid state transitions. Manual/live API QA has also covered Prisma validation/generation and migration status; backend and frontend production builds; CRM, product/inventory, dashboard, and challan API flows.

## 22. Known Limitations

- The automated suite is focused on critical backend business logic; there are no browser/UI or database-integration tests.
- No password reset, user-management, or token refresh endpoint.
- No product deletion endpoint or inventory movement reversal workflow.
- Challan numbers use a date plus random suffix rather than a sequential database counter.
- No OpenAPI specification is included; the Postman collection and this README are the API documentation.

## 23. Future Improvements

- Add automated API and browser tests.
- Add an OpenAPI specification.
- Add user administration and password-reset workflows.
- Add pagination/search controls to the stock-movement ledger where needed by operations.
