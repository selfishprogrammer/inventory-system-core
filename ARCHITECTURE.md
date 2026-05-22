# Architecture — Multi-Tenant Inventory Management System

Internal design reference. Documents key decisions, rejected alternatives, and the reasoning behind them. Not a tutorial.

---

## 1. Multi-Tenancy: Row-Level Isolation

Every MongoDB document carries a `tenantId` field. The `auth` middleware extracts it from the JWT and injects it into `req.tenantId`. Every query is scoped to that value — no exceptions.

We considered three approaches before settling on this:

**Separate databases per tenant** gives perfect isolation and makes per-tenant backups trivial, but it doesn't scale. Managing thousands of database connections and provisioning a new DB on every signup is operationally painful. Good for enterprises with five big clients; bad for SaaS with hundreds of small ones.

**Schema-based isolation** works well in PostgreSQL but MongoDB has no native equivalent. Emulating it adds a layer of abstraction that solves a problem we don't need solved this way.

**Row-level isolation** is what we went with. Single connection pool, single deployment, zero per-tenant infrastructure. The cost is discipline — if a developer writes a query without `tenantId`, data leaks across tenants. We accept this tradeoff with code review conventions and will add a query-level lint rule if the team grows.

From a security standpoint: a JWT from Tenant A cannot touch Tenant B's data because `tenantId` comes from a server-signed token, not user input. The attack surface is the JWT signing key, not the query layer.

---

## 2. Product Variant Modeling

Variants are embedded as an array inside the parent Product document, not stored in a separate collection.

```json
{
  "_id": "...",
  "tenantId": "acme-corp",
  "name": "Classic T-Shirt",
  "attributes": [
    { "name": "size", "values": ["S", "M", "L"] },
    { "name": "color", "values": ["White", "Black"] }
  ],
  "variants": [
    {
      "sku": "TSHIRT-S-WHITE",
      "attributes": { "size": "S", "color": "White" },
      "price": 799,
      "costPrice": 350,
      "stock": 50,
      "lowStockThreshold": 10
    },
    {
      "sku": "TSHIRT-M-BLACK",
      "attributes": { "size": "M", "color": "Black" },
      "price": 799,
      "costPrice": 350,
      "stock": 20,
      "lowStockThreshold": 10
    }
  ]
}
```

The primary reason is atomicity. When stock changes, it changes on a single document — MongoDB's document-level atomicity handles this without a transaction. A `findOne` returns the product and all variants in one round-trip; no `$lookup`, no join.

The alternative — a separate `ProductVariant` collection with a `productId` foreign key — forces a `$lookup` on every product read and makes atomic multi-variant updates significantly harder. We didn't see enough upside to justify it.

The known limitation is MongoDB's 16MB document cap. A product with 4 sizes × 5 colors = 20 variants sits comfortably within limits. If a tenant somehow ends up with 500+ variants on a single product, we revisit. That's not a realistic scenario for the inventory use cases we're building for.

---

## 3. Concurrent Orders and Race Conditions

The classic oversell problem: two users simultaneously order the last unit. Both read `stock: 1`, both decrement, stock goes to `-1`.

We solve this with a single atomic `findOneAndUpdate` that checks the stock condition and applies the decrement in one operation:

```javascript
const updatedProduct = await Product.findOneAndUpdate(
  {
    _id: productId,
    tenantId,
    variants: {
      $elemMatch: { sku: variantSku, stock: { $gte: quantity } }
    }
  },
  { $inc: { 'variants.$[elem].stock': -quantity } },
  { arrayFilters: [{ 'elem.sku': variantSku }], new: true, session }
);

if (!updatedProduct) {
  throw new Error(`Insufficient stock for SKU: ${variantSku}`);
}
```

MongoDB evaluates the `$elemMatch` filter and the `$inc` atomically at the document level. One of the two concurrent requests wins; the other gets `null` back and throws. No pessimistic locking, no Redis-based mutex, no retry loop needed.

For multi-item orders, the whole thing runs inside a session transaction. If stock runs out on item 3 of 5, the entire order rolls back. No partial writes reach the database.

---

## 4. Low-Stock Alerts

Naive low-stock logic — alert when `stock < threshold` — generates false positives whenever a Purchase Order is already in flight. We suppress those.

The effective stock formula:

```
effectiveStock = currentStock + pendingPOQuantity
```

where `pendingPOQuantity` is the sum of `(item.quantity - item.receivedQuantity)` for all PO line items matching that `(productId, variantSku)` pair, filtered to POs in `draft`, `sent`, `confirmed`, or `partially_received` status.

The `/api/dashboard/low-stock` endpoint runs this as a single aggregation pipeline. It builds a lookup map of pending PO quantities keyed by `${productId}-${variantSku}`, then sweeps active variants once, flagging only those where `currentStock + pendingQty < threshold`. No N+1 queries.

---

## 5. Performance at Scale

The system is designed to handle 10,000+ products per tenant with dashboard response times under 2 seconds. The strategy is straightforward: get the indexes right, avoid N+1 patterns, and never load more data than the current page needs.

Every compound index leads with `tenantId` because every query is tenant-scoped. An index that doesn't start with `tenantId` is useless here.

```javascript
// Products
{ tenantId: 1, category: 1 }
{ tenantId: 1, isActive: 1 }
{ tenantId: 1, 'variants.sku': 1 }
{ tenantId: 1, createdAt: -1 }
{ tenantId: 1, name: 'text', description: 'text' }

// Stock Movements
{ tenantId: 1, productId: 1, createdAt: -1 }
{ tenantId: 1, type: 1, createdAt: -1 }

// Purchase Orders
{ tenantId: 1, status: 1 }
{ tenantId: 1, poNumber: 1 }
```

Dashboard stats run as four parallel queries via `Promise.all`. Top sellers and stock trends hit the `(tenantId, type, createdAt)` index directly. All list endpoints paginate with `skip/limit`.

If we hit a ceiling, the next moves are Redis caching for dashboard stats (30-second staleness is acceptable for analytics), pre-aggregated daily movement totals, and routing dashboard reads to MongoDB secondaries.

---

## 6. Purchase Order State Machine

```
draft → sent → confirmed → partially_received → received
  ↓       ↓        ↓               ↓
cancelled
```

Transitions are validated server-side. An invalid transition returns a 400. There's no client-enforced state — the server is the only source of truth on what moves are legal.

Stock is incremented only when `/receive` is called, moving a PO from `confirmed` to `received`. We deliberately don't touch stock on confirmation — goods aren't in the warehouse until they physically arrive.

---

## 7. Real-Time Updates

Clients join a Socket.io room keyed by their `tenantId` on authentication. Events — `stock-updated`, `order-created`, `po-received` — are emitted to that room only. The dashboard subscribes to these and refreshes the relevant widgets automatically.

If the connection drops, the UI shows a disconnected indicator in the header. The data stays consistent because all mutations go through REST; the socket is a push layer, not a data transport.

---

## 8. Security

Auth is JWT-based and stateless. Tokens carry only `userId` — `tenantId` is fetched from the database on every request. This means tenant permission changes take effect immediately without requiring token re-issuance.

The RBAC hierarchy is Owner > Manager > Staff. Create and delete operations are gated at Manager and above. Staff accounts are read-only. This is enforced server-side on every route, not in the frontend.

Passwords are hashed with bcryptjs at cost factor 12. Input validation runs at two layers: Mongoose schema constraints catch type and format errors; route-level checks handle business logic constraints like negative quantities or invalid SKU references.