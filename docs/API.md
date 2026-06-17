# HiSecure ERP — API Documentation

HiSecure ERP v2.0.0 exposes a secured, stateless REST API configured to support clients and integrations.

---

## 1. Authentication Flow

HiSecure ERP uses **JSON Web Tokens (JWT)** for secure request authentication.

### 1.1 Token Generation
*   **Endpoint**: `POST /api/auth/login`
*   **Payload**: `{ "username": "admin", "password": "..." }`
*   **Response**: Returns an access token:
    ```json
    {
      "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
      "user": {
        "user_id": 1,
        "username": "admin",
        "role": "SuperAdmin"
      }
    }
    ```

### 1.2 Request Header Injection
All endpoints (except public authentication and health checkers) require the token to be passed in the `Authorization` header:
```http
Authorization: Bearer <your_jwt_token>
```

### 1.3 Token Revocation & Blacklist
During logout (`POST /api/auth/logout`), the token's JTI claim is written to the `token_blacklist` table. The `authMiddleware` checks this blacklist on every incoming request. If a blacklisted token is encountered, the request is rejected with a `401 Unauthorized` status.

---

## 2. Authorization & RBAC

The system employs a strict Role-Based Access Control (RBAC) strategy:

1.  **Role Verification (`requireRole`)**: Restricts access based on overall roles (e.g. `SuperAdmin`, `Admin`, `Technician`).
2.  **Permission Gates (`requirePermission`)**: Checks for micro-permissions (e.g. `write:parts`, `delete:invoices`).
3.  **RBAC Permission Cache**: To avoid database roundtrips, permissions are cached in Redis under the key `user:permissions:${userId}` for **5 minutes (300 seconds)**. When permissions change, this cache is evicted.

---

## 3. Endpoints Directory

The base URL for all endpoints is `http://<host>:<port>/api`.

| Route Prefix | Auth | Middleware | Purpose |
| :--- | :--- | :--- | :--- |
| `/auth` | Public / Private | None / `authMiddleware` | User login, logout, and token refresh. |
| `/health` | Public | None | System status check (CPU, Memory, DB status). |
| `/dashboard` | Private | `authMiddleware` | Key performance indicators (KPIs) and operational counters. |
| `/customers` | Private | `authMiddleware` | Directory of client profiles and credit limits. |
| `/parts` | Private | `authMiddleware` | Product catalog items, barcode lookups. |
| `/catalog-review`| Private | `authMiddleware` | OCR processing queues and template parsers. |
| `/invoices` | Private | `authMiddleware` | Sales entries, invoices, and returns. |
| `/quotations` | Private | `authMiddleware` | POS estimates and quotations. |
| `/purchases` | Private | `authMiddleware` | Requisitions, PO cycles, and GRN receipts. |
| `/delivery-challans`| Private | `authMiddleware` | Multi-warehouse inventory stock transfers. |
| `/service` | Private | `authMiddleware` | Repair ticketers and technician dispatchers. |
| `/amc` | Private | `authMiddleware` | Annual Maintenance Contract scheduling and SLA checks. |
| `/accounting` | Private | `authMiddleware` | Immutable ledger, financial balance sheets. |
| `/banking` | Private | `authMiddleware` | CSV bank reconciliation statements. |
| `/gst` | Private | `authMiddleware` | Tax reports and scraper helpers. |
| `/audit` | Private | `authMiddleware` | Security log auditor viewer. |
| `/v1/tech` | Private | `authMiddleware` | Offline mobile sync and geo-check-ins for technicians. |

---

## 4. Sample Integration Requests

### 4.1 Create Sales Invoice
*   **Endpoint**: `POST /api/invoices`
*   **Headers**:
    ```http
    Authorization: Bearer <token>
    Content-Type: application/json
    X-Request-ID: <uuid_correlation_id>
    ```
*   **Request Body**:
    ```json
    {
      "customer_id": 4,
      "place_of_supply": "Karnataka",
      "items": [
        {
          "part_id": 12,
          "quantity": 2,
          "unit_price": 12000.00,
          "tax_rate": 18.00
        }
      ]
    }
    ```
*   **Response (201 Created)**:
    ```json
    {
      "invoice_id": 847,
      "invoice_number": "INV-2026-00042",
      "grand_total": "28320.00",
      "status": "draft"
    }
    ```

### 4.2 System Health Status Check
*   **Endpoint**: `GET /api/health`
*   **Headers**: None
*   **Response (200 OK)**:
    ```json
    {
      "status": "healthy",
      "database": "connected",
      "redis": "connected",
      "uptime": 86423
    }
    ```
