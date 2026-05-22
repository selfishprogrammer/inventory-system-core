# InventoryOS — Multi-Tenant Inventory Management System

A SaaS platform where multiple businesses (tenants) independently manage inventory, suppliers, and orders with complete data isolation.

---

## Quick Start

### Prerequisites
- Node.js v18+
- MongoDB (local or MongoDB Atlas)

### 1. Clone & Setup Backend

```bash
cd backend
npm install
cp .env.example .env
# Edit .env and set your MONGODB_URI and JWT_SECRET
npm run seed      # Populate demo data
npm run dev       # Start backend on :5000
```

### 2. Setup Frontend

```bash
cd frontend
npm install
cp .env.example .env
npm run dev       # Start frontend on :5173
```

### 3. Open in browser

```
http://localhost:5173
```

---

## Test Credentials

### Tenant 1 — FashionHub Store
| Role | Email | Password |
|------|-------|----------|
| Owner | owner@fashionhub.com | password123 |
| Manager | manager@fashionhub.com | password123 |
| Staff | staff@fashionhub.com | password123 |

**Tenant slug:** `fashionhub`

### Tenant 2 — TechGadgets Wholesale
| Role | Email | Password |
|------|-------|----------|
| Owner | owner@techgadgets.com | password123 |
| Staff | staff@techgadgets.com | password123 |

**Tenant slug:** `techgadgets`

> Data is completely isolated — logging in as FashionHub shows only FashionHub's inventory, even though both tenants share the same MongoDB database.

---

## Features Implemented

### Multi-Tenancy
- [x] Row-level tenant isolation via `tenantId` on every document
- [x] JWT auth with tenant scoping
- [x] Role-based access: Owner / Manager / Staff
- [x] Invite users to tenant

### Inventory Management
- [x] Products with multi-attribute variants (e.g., size × color = N SKUs)
- [x] Auto-generate all variant combinations from attribute definitions
- [x] Per-variant stock tracking, pricing (sell + cost), and low-stock thresholds
- [x] Manual stock adjustments with full audit trail
- [x] Complete stock movement history (purchase / sale / return / adjustment)
- [x] Smart low-stock alerts — excludes items covered by pending Purchase Orders

### Suppliers & Purchase Orders
- [x] Full supplier management with contact details and payment terms
- [x] Create Purchase Orders with multiple line items
- [x] PO status machine: Draft → Sent → Confirmed → (Partially) Received → Received
- [x] Record partial deliveries — stock auto-updates on receipt
- [x] Price variance support (actual unit price can differ from ordered price)
- [x] Cancel POs

### Sales Orders
- [x] Create customer orders with multiple products/variants
- [x] Concurrency-safe stock deduction (atomic MongoDB operation)
- [x] Race condition protection — two users ordering the last item: one succeeds, one gets a clear error
- [x] Cancel orders — restores stock automatically via transaction
- [x] Order history with expandable item details

### Dashboard & Analytics
- [x] Real-time inventory stats (products, SKUs, inventory value, revenue)
- [x] 7-day stock movement area chart (Recharts)
- [x] Top 5 sellers by quantity — last 30 days
- [x] Smart low-stock panel with effective stock calculation
- [x] Real-time updates via Socket.io (stock/order events trigger dashboard refresh)

---

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/auth/register` | Register new tenant + owner |
| POST | `/api/auth/login` | Login |
| GET | `/api/auth/me` | Current user + tenant |
| GET | `/api/products` | List products (pagination, search, filter) |
| POST | `/api/products` | Create product with variants |
| POST | `/api/products/:id/adjust` | Manual stock adjustment |
| GET | `/api/products/:id/movements` | Stock movement history |
| GET | `/api/suppliers` | List suppliers |
| POST | `/api/suppliers` | Create supplier |
| GET | `/api/purchase-orders` | List POs (filter by status) |
| POST | `/api/purchase-orders` | Create purchase order |
| PATCH | `/api/purchase-orders/:id/status` | Update PO status |
| POST | `/api/purchase-orders/:id/receive` | Record stock receipt |
| GET | `/api/orders` | List sales orders |
| POST | `/api/orders` | Create order (atomic stock deduction) |
| POST | `/api/orders/:id/cancel` | Cancel order + restore stock |
| GET | `/api/dashboard/stats` | Inventory stats |
| GET | `/api/dashboard/low-stock` | Smart low-stock items |
| GET | `/api/dashboard/top-sellers` | Top 5 sellers (30 days) |
| GET | `/api/dashboard/stock-movements` | 7-day chart data |

---

## Technical Decisions

See [ARCHITECTURE.md](./ARCHITECTURE.md) for full documentation of:
- Multi-tenancy approach (row-level isolation) with pros/cons
- Product variant data modeling in MongoDB
- Race condition prevention strategy
- Low-stock alert algorithm
- Performance indexing strategy
- Security considerations

---

## Assumptions

1. A "sale" is immediately fulfilled (stock deducted at order creation). Backorders are out of scope.
2. Product SKUs are unique within a tenant (not globally).
3. Purchase Orders use cost prices for valuation; sell prices are tracked separately per variant.
4. "Low stock" threshold is per-variant, not per-product.
5. Tenant owners are created via registration; additional users are invited by owners/managers.

---

## Known Limitations

1. **No real-time PO updates across tabs** — Socket.io events cover stock and orders but not PO status changes (easy to add, omitted for time).
2. **No product image upload** — File storage (S3/Cloudinary) is out of scope.
3. **No barcode/QR scanning** — SKU entry is manual.
4. **Pagination on low-stock dashboard** — Currently shows top 12 items; full list requires a dedicated page.
5. **No email notifications** — Low-stock and PO status alerts would need a mail service integration.
6. **Stock movement `previousStock` on cancel** — When restoring stock on order cancellation, `previousStock` in the movement record is approximate (doesn't account for concurrent adjustments between order creation and cancellation). The actual restored stock count is correct; only the historical record is approximate.

---

## Time Breakdown (estimated ~18 hours)

| Task | Hours |
|------|-------|
| Architecture planning & decisions | 1.5h |
| MongoDB models + indexes | 1.5h |
| Auth + multi-tenant middleware | 1h |
| Products & variants API | 2h |
| Orders API (concurrency, transactions) | 2h |
| Purchase Orders API (state machine, receive) | 2h |
| Dashboard aggregations | 1.5h |
| Socket.io real-time | 0.5h |
| Seed script (2 tenants) | 1h |
| React frontend (all pages + components) | 4h |
| ARCHITECTURE.md + README | 1h |

---

## Tech Stack

**Backend:** Node.js, Express, MongoDB (Mongoose), JWT, Socket.io, bcryptjs

**Frontend:** React 18, Vite, React Router v6, Recharts, Axios, Socket.io-client, Tailwind CSS
