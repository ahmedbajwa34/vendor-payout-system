# Vendor Payout & Tax Management System

A backend API for managing vendors, invoices, tax profiles, invoice approvals, payouts, payment history, and financial reporting.

The project is built with **TypeScript, Express.js, and PostgreSQL**, with a focus on clean backend architecture, validation, authorization, transactions, SQL optimization, and maintainable business logic.

## Tech Stack

* TypeScript
* Node.js
* Express.js
* PostgreSQL
* `pg`
* Zod
* JWT
* bcrypt
* dotenv
* Postman

## Architecture

The application follows a layered backend architecture:

```text
Request
   ↓
Route
   ↓
Middleware
   ↓
Controller
   ↓
Service
   ↓
PostgreSQL
   ↓
Service
   ↓
Controller
   ↓
Response
```

### Responsibilities

**Routes**

* Define API endpoints.
* Apply authentication and authorization middleware.

**Middleware**

* JWT authentication.
* Role-based authorization.
* Vendor ownership checks.
* Vendor status checks.
* Global error handling.

**Controllers**

* Receive HTTP requests.
* Validate request data.
* Call services.
* Return HTTP responses.

**Services**

* Contain business logic.
* Execute database operations.
* Handle transactions and business rules.

**PostgreSQL**

* Stores application data.
* Enforces relationships and constraints.
* Handles transactional operations and reporting queries.

## Database Design

Main entities:

```text
users
vendors
vendor_tax_profiles
invoices
invoice_items
invoice_status_history
payouts
payout_status_history
```

### Main relationships

```text
Vendor
 ├── Users
 ├── Tax Profiles
 └── Invoices
       ├── Invoice Items
       ├── Status History
       └── Payouts
             └── Status History
```

## Authentication & Authorization

The API uses JWT-based authentication.

JWT payload contains:

```text
userId
role
vendorId
```

Supported roles:

```text
ADMIN
FINANCE
VENDOR
```

### Access model

**ADMIN**

* Manage vendors and users.
* Approve and suspend vendors.
* Access system-wide data.

**FINANCE**

* Review invoices.
* Approve/reject invoices.
* Manage payouts.
* Access financial reports.

**VENDOR**

* Access their own vendor data.
* Create and submit invoices.
* View their own invoices and payouts.
* Manage their tax information.

Vendor ownership is enforced using the authenticated user's `vendorId`.

## Vendor Registration

Vendor registration creates:

1. Vendor
2. Vendor user

Both operations occur inside a PostgreSQL transaction.

```text
Registration
    ↓
Create Vendor
    ↓
Hash Password
    ↓
Create Vendor User
    ↓
COMMIT
```

If either operation fails, the transaction is rolled back.

New vendors start with:

```text
PENDING
```

Admin approval changes the vendor to:

```text
ACTIVE
```

## Invoice Workflow

```text
DRAFT
  ↓
SUBMITTED
  ↓
UNDER_REVIEW
  ↓
APPROVED
  ↓
PAID
```

Alternative paths include:

```text
UNDER_REVIEW → REJECTED
```

and:

```text
DRAFT → CANCELLED
```

Invoice status changes are recorded in `invoice_status_history`.

### Invoice approval validation

Before approval, the system verifies:

* Invoice exists.
* Invoice is currently `UNDER_REVIEW`.
* Vendor is active.
* Invoice contains at least one item.
* Invoice total matches the sum of its items.
* Vendor has a currently valid tax profile.

A failed validation does not automatically reject the invoice. The invoice remains available for the appropriate business decision.

## Payout Workflow

```text
APPROVED
   ↓
SCHEDULED
   ↓
PROCESSING
   ↓
COMPLETED
```

Alternative states:

```text
PROCESSING → FAILED
SCHEDULED → CANCELLED
```

Payout status changes are stored in `payout_status_history`.

### Payout allocation

The system prevents payouts from exceeding the invoice total.

The invoice row is locked with:

```sql
SELECT ...
FROM invoices
WHERE id = $1
FOR UPDATE;
```

This protects the allocation check against concurrent payout creation.

Only these payout states count toward the invoice's allocated amount:

```text
SCHEDULED
PROCESSING
COMPLETED
```

`FAILED` and `CANCELLED` payouts do not consume the invoice's allocation.

## Tax Profiles

Vendor tax profiles support historical validity periods.

The system prevents overlapping tax-profile periods for the same vendor.

Example:

```text
Tax Profile A
2026-01-01 → 2026-06-30

Tax Profile B
2026-07-01 → NULL
```

The current profile can be determined from its validity period.

## Reporting

Current reports include:

### Vendor Payout Summary

Provides:

* Approved invoice amount
* Completed/paid amount
* Pending payout amount
* Remaining payout allocation

### Invoice Status Summary

Provides:

* Invoice count by status
* Total invoice value by status
* Percentage of total invoice value represented by each status

The report includes all defined invoice statuses, including statuses with zero records.

## Pagination & Filtering

`GET /invoices` supports:

```text
?page=1
&limit=10
&status=APPROVED
```

Supported status values:

```text
DRAFT
SUBMITTED
UNDER_REVIEW
APPROVED
REJECTED
PAID
CANCELLED
```

Pagination response includes:

```json
{
  "pagination": {
    "page": 1,
    "limit": 10,
    "total": 1,
    "totalPages": 1
  }
}
```

The implementation uses:

* `LIMIT`
* `OFFSET`
* `COUNT(*)`
* Dynamic SQL conditions
* Parameterized queries
* `Promise.all()` for independent read queries

## Validation

Zod is used at the API boundary for request validation.

Examples include:

* Authentication requests
* Vendor registration
* Invoice creation
* Invoice rejection
* Payout creation
* Payout failure/cancellation
* Invoice query parameters

Invalid Zod requests are handled centrally through the global error middleware.

## Error Handling

The project uses a custom `AppError` class for expected application errors.

Example categories include:

```text
INVOICE_NOT_FOUND
INVALID_INVOICE_STATUS
PAYOUT_LIMIT_EXCEEDED
VENDOR_NOT_ACTIVE
FORBIDDEN
VALIDATION_ERROR
```

Unexpected errors are converted into a generic:

```text
500 INTERNAL_SERVER_ERROR
```

without exposing internal implementation details to the client.

## Transactions

Transactions are centralized through a reusable helper:

```text
BEGIN
   ↓
Execute operations
   ↓
COMMIT

On failure:
ROLLBACK
```

This is used where multiple database operations must succeed or fail together.

Examples:

* Vendor registration
* Invoice creation with items
* Invoice status changes with history
* Payout creation
* Payout status changes with history

## Project Structure

```text
src/
├── app.ts
│
├── db/
│   ├── pool.ts
│   └── transaction.ts
│
├── middlewear/
│   ├── error.middlewear.ts
│   ├── auth.middleware.ts
│   ├── authorize.middleware.ts
│   ├── vendor-access.middleware.ts
│   ├── vendor-update.middleware.ts
│   └── vendor-status.middleware.ts
│
├── routes/
│   ├── auth.routes.ts
│   ├── vendor.routes.ts
│   ├── invoice.routes.ts
│   ├── payout.routes.ts
│   └── report.routes.ts
│
├── controllers/
│   ├── auth.controller.ts
│   ├── vendor.controller.ts
│   ├── invoice.controller.ts
│   ├── payout.controller.ts
│   └── report.controller.ts
│
├── services/
│   ├── auth.service.ts
│   ├── vendor.service.ts
│   ├── invoice.service.ts
│   ├── payout.service.ts
│   └── report.service.ts
│
├── validator/
│   ├── auth.validator.ts
│   ├── vendor.validator.ts
│   ├── invoice.validator.ts
│   └── payout.validator.ts
│
└── types/
    ├── auth.types.ts
    ├── role-groups.ts
    ├── express.d.ts
    └── app-error.ts
```

## Environment Variables

Create a `.env` file:

```env
DB_HOST=
DB_PORT=
DB_USER=
DB_PASSWORD=
DB_NAME=
JWT_SECRET=
```

Never commit `.env` to GitHub.

A `.env.example` file is included to show the required variables.

## Installation

Clone the repository and install dependencies:

```bash
npm install
```

Run the development server:

```bash
npm run dev
```

Build the project:

```bash
npm run build
```

Run the compiled application:

```bash
npm start
```

## Development Approach

The project is being developed incrementally:

```text
Database Design
      ↓
Authentication
      ↓
Authorization
      ↓
Invoice Management
      ↓
Payout Management
      ↓
Tax Management
      ↓
Reporting
      ↓
Pagination & Filtering
      ↓
Performance Optimization
      ↓
Final Cleanup & Documentation
```

Performance optimization will be based on actual query measurements using:

```sql
EXPLAIN (ANALYZE, BUFFERS)
```

Indexes will be added based on real query patterns and measured performance rather than being added blindly.

## Current Status

Completed:

* Authentication
* JWT authorization
* Role-based access control
* Vendor management
* Vendor status management
* Invoice management
* Invoice status history
* Invoice approval validation
* Invoice item bulk insertion
* Payout management
* Payout status history
* Payout allocation/concurrency protection
* Vendor tax profiles
* Tax-period overlap protection
* Financial reports
* Pagination
* Invoice status filtering
* Query validation
* Centralized Zod error handling
* Pagination metadata
* Parallel count/data queries

Next phase:

**PostgreSQL query performance analysis and optimization.**
