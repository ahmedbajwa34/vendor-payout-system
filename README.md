# Vendor Payout & Tax Management API

A real-world backend API for managing vendors, invoices, payouts, tax information, and financial workflows.

## Tech Stack

* TypeScript
* Express.js
* PostgreSQL
* pg
* Zod
* JWT
* bcrypt
* dotenv

## Current Features

### Authentication

* Vendor self-registration
* Secure password hashing with bcrypt
* Login with JWT
* JWT authentication middleware
* Role-based authorization

### Roles

* ADMIN
* FINANCE
* VENDOR

### Vendor Management

* Vendor self-registration
* Admin vendor approval
* Vendor retrieval
* Vendor ownership authorization
* Vendor profile updates
* Vendor suspension

### Invoice Management

* Invoice and invoice-item relational design
* Multiple items per invoice
* Invoice total validation
* Transactional invoice creation
* PostgreSQL rollback on failure
* Invoice status workflow design
* Invoice status history

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
PAYOUT
  ↓
PAID
```

Invoices can also be rejected or cancelled depending on the workflow.

## Architecture

The project follows a 3-layer architecture:

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
```

Business logic and database operations are kept in the service layer rather than inside route handlers.

## Database Design

Core entities:

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

Key relationships:

```text
Vendor
 ├── Users
 ├── Invoices
 │     ├── Invoice Items
 │     └── Status History
 │
 └── Tax Profiles

Invoice
 └── Payouts
       └── Status History
```

## Current Progress

* Authentication — Completed
* Vendor Management — Completed
* Invoice Database Design — Completed
* Invoice Creation — Implemented
* Invoice Retrieval — Next
* Invoice Workflow — Planned
* Payout Management — Planned
* Tax Management — Planned
* Reporting — Planned
* Performance Optimization — Planned

This project is being built as a practical backend system with an emphasis on PostgreSQL, transactions, authorization, business rules, and scalable API architecture.
