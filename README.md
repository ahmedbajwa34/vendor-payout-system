# Vendor Payout & Tax Management System

A backend REST API for managing vendors, invoices, payouts, tax profiles, tax rules, and financial reporting.

The system models a real-world vendor payment workflow where vendors submit invoices, finance/admin users review and approve them, payouts are created and processed, and applicable withholding tax is calculated and recorded for audit purposes.

---

## Features

### Authentication & Authorization

* JWT-based authentication
* Role-based access control
* Three user roles:

  * `ADMIN`
  * `FINANCE`
  * `VENDOR`
* Protected API routes
* Vendor ownership protection
* Vendors can only access their own vendor-related data
* Staff users can access staff-level operations

### Vendor Management

* Create vendors and vendor users
* Vendor approval
* Vendor suspension
* Vendor information management
* Vendor-specific access control
* Vendor status validation before invoice creation

### Tax Management

* Vendor tax profiles
* Tax profile validity periods
* Historical tax profiles
* Tax profile date validation
* Prevention of overlapping tax profiles
* Configurable withholding tax rules
* Tax rule validity periods
* Prevention of overlapping tax rules
* Active/inactive tax rules
* Historical tax snapshots for completed payouts

### Invoice Management

* Vendor invoice creation
* Invoice item management
* Transactional invoice creation
* Invoice ownership protection
* Invoice status workflow
* Invoice status history
* Invoice submission
* Invoice review
* Invoice approval
* Invoice rejection with reason
* Validation of invoice items against invoice total
* Validation of vendor status
* Validation of applicable tax profile
* Pagination
* Status filtering

### Payout Management

* Payout creation for approved invoices
* Partial/multiple payouts
* Remaining invoice balance validation
* Protection against overpayment
* Transaction-safe payout creation
* Payout processing
* Payout completion
* Payout failure
* Payout cancellation
* Payout status history
* Vendor payout ownership protection

### Tax Withholding

When a payout is completed, the system:

1. Finds the vendor's applicable tax profile.
2. Finds the active withholding tax rule.
3. Calculates the withholding amount.
4. Calculates the vendor's net amount.
5. Stores the tax calculation as a historical record.
6. Marks the payout as completed.

Example:

```text
Gross Payout       = $1,000.00
Tax Rate           = 10%
Tax Withheld       = $100.00
Net Amount         = $900.00
```

The tax record stores the rate and calculated amounts so historical payouts remain auditable even if the tax rule changes later.

### Reporting

The system provides:

* Vendor payout summary
* Invoice status summary
* Tax withholding report

Reports use SQL aggregation, CTEs, joins, and window functions where appropriate.

### Error Handling

* Centralized error handling
* Custom `AppError`
* Consistent API error responses
* Zod validation errors
* HTTP status codes
* Database/business errors handled through the global error middleware

---

# Architecture

The application follows a layered backend architecture:

```text
Client
  │
  ▼
Route
  │
  ▼
Middleware
  │
  ├── Authentication
  ├── Authorization
  └── Request validation
  │
  ▼
Controller
  │
  ▼
Service
  │
  ├── Business logic
  ├── Transactions
  └── Database operations
  │
  ▼
PostgreSQL
  │
  ▼
Service
  │
  ▼
Controller
  │
  ▼
HTTP Response
```

### Responsibility of each layer

#### Routes

Define:

* HTTP method
* Endpoint
* Middleware
* Controller

Routes do not contain business logic.

#### Middleware

Responsible for cross-cutting concerns such as:

* Authentication
* Authorization
* Vendor ownership
* Vendor status validation
* Global error handling

#### Controllers

Responsible for:

* Receiving HTTP requests
* Validating request data
* Calling services
* Returning HTTP responses

Controllers do not contain database queries or business rules.

#### Services

Responsible for:

* Business logic
* Database operations
* Transactions
* State transitions
* Validation involving database state
* Financial calculations

#### PostgreSQL

Responsible for:

* Data persistence
* Relationships
* Constraints
* Foreign keys
* Unique constraints
* Checks
* Query filtering
* Aggregation
* Locking

---

# Main Business Flow

## Vendor → Invoice → Review → Payout

```text
Vendor
   │
   ▼
Vendor Account
   │
   ▼
Create Invoice
   │
   ▼
DRAFT
   │
   ▼
SUBMITTED
   │
   ▼
UNDER_REVIEW
   │
   ├───────────────┐
   │               │
   ▼               ▼
APPROVED         REJECTED
   │
   ▼
Create Payout
   │
   ▼
SCHEDULED
   │
   ▼
PROCESSING
   │
   ├───────────────┐
   │               │
   ▼               ▼
COMPLETED        FAILED
```

Scheduled payouts can also be cancelled before processing.

---

# Tax Flow

```text
Vendor
   │
   ▼
Vendor Tax Profile
   │
   ▼
Invoice
   │
   ▼
Approved Invoice
   │
   ▼
Payout
   │
   ▼
Applicable Tax Rule
   │
   ▼
Tax Calculation
   │
   ├── Gross Amount
   ├── Tax Rate
   ├── Tax Amount
   └── Net Amount
   │
   ▼
Payout Tax Record
   │
   ▼
Payout Completed
```

The current project records the accounting/payment workflow but does not transfer real money through an external bank or payment provider.

---

# Database Design

The system uses PostgreSQL with the following main entities:

```text
users
vendors
vendor_tax_profiles
invoices
invoice_items
invoice_status_history
payouts
payout_status_history
tax_rules
payout_tax_records
```

## Relationships

```text
Vendor
  │
  ├────────── Users
  │
  ├────────── Invoices
  │              │
  │              ├──── Invoice Items
  │              │
  │              └──── Invoice Status History
  │
  └────────── Tax Profiles

Invoice
  │
  └────────── Payouts
                 │
                 ├──── Payout Status History
                 │
                 └──── Payout Tax Record
                              │
                              └──── Tax Rule
```

---

# Important Database Rules

The database contains constraints to protect data integrity.

### User/vendor relationship

Vendor users must have a `vendor_id`.

Admin and Finance users must not have a `vendor_id`.

### Invoice

* Invoice number is unique.
* Invoice total must be positive.
* Due date cannot be before invoice date.
* Invoice must belong to an existing vendor.

### Invoice items

* Quantity must be greater than zero.
* Unit price cannot be negative.
* Items must belong to an existing invoice.

### Payouts

* Payout amount must be positive.
* Payout must belong to an existing invoice.
* Total eligible payouts cannot exceed the invoice total.

Eligible payout statuses:

```text
SCHEDULED
PROCESSING
COMPLETED
```

Failed and cancelled payouts do not consume the invoice's available payout balance.

### Tax Profiles

Tax profiles contain validity periods.

Overlapping validity periods for the same vendor are rejected.

### Tax Rules

Tax rules contain validity periods.

Overlapping rules of the same rule type are rejected.

### Payout Tax Records

Each payout can have only one tax record.

This is enforced with:

```text
UNIQUE(payout_id)
```

---

# Transaction Handling

Transactions are used whenever multiple database operations must succeed or fail together.

A reusable transaction helper is used:

```text
BEGIN
   │
   ▼
Execute operations
   │
   ├── Success ──► COMMIT
   │
   └── Error ────► ROLLBACK
```

For example, completing a payout involves:

```text
Lock payout
   ↓
Find tax profile
   ↓
Find tax rule
   ↓
Calculate tax
   ↓
Create tax record
   ↓
Complete payout
   ↓
Create status history
   ↓
COMMIT
```

If one operation fails, the transaction is rolled back.

---

# Concurrency Control

Payout creation uses PostgreSQL row-level locking.

The approved invoice is locked using:

```sql
FOR UPDATE
```

This prevents concurrent payout requests from both reading the same remaining balance and creating payouts that collectively exceed the invoice total.

Conceptually:

```text
Request A ──► Lock Invoice ──► Check Balance ──► Create Payout ──► Commit
                                      │
                                      │
Request B ──► waits for invoice lock ┘
```

This protects the financial integrity of the payout system.

---

# Technology Stack

### Backend

* TypeScript
* Node.js
* Express.js

### Database

* PostgreSQL
* `pg`

### Validation

* Zod

### Authentication

* JSON Web Tokens (JWT)
* bcrypt

### Development Tools

* TypeScript compiler
* tsx
* Prettier
* Postman

---

# Project Structure

```text
vendor-payout-system/
│
├── src/
│   │
│   ├── app.ts
│   │
│   ├── db/
│   │   ├── pool.ts
│   │   └── transaction.ts
│   │
│  
```
