

import pool from "../db/pool.js";
import { PoolClient } from "pg";
import { AppError } from "../types/app-error.js";
import { withTransaction } from "../db/transaction.js";
import { UserRole } from "../types/auth.types.js";




interface CreateInvoiceData {
    invoiceNumber: string;
    invoiceDate: string;
    dueDate: string;
    totalAmount: number;
    items: {
        description: string;
        quantity: number;
        unitPrice: number;
    }[];
}

export const createInvoiceService = async (
    vendorId: number,
    data: CreateInvoiceData
) => {
    const itemsTotal = data.items.reduce(
        (sum, item) =>
            sum + item.quantity * item.unitPrice,
        0
    );

    if (itemsTotal !== data.totalAmount) {
        throw new Error(
            "Invoice total does not match the sum of invoice items"
        );
    }

    return withTransaction(async (client) => {

        // Create invoice
        const invoiceResult = await client.query(
            `
            INSERT INTO invoices
                (
                    vendor_id,
                    invoice_number,
                    invoice_date,
                    due_date,
                    total_amount
                )
            VALUES
                ($1, $2, $3, $4, $5)
            RETURNING
                id,
                vendor_id,
                invoice_number,
                status,
                invoice_date,
                due_date,
                total_amount,
                created_at
            `,
            [
                vendorId,
                data.invoiceNumber,
                data.invoiceDate,
                data.dueDate,
                data.totalAmount
            ]
        );

        const invoice = invoiceResult.rows[0];

        // Create invoice items
        const values: unknown[] = [];
        const placeholders: string[] = [];

        data.items.forEach((item, index) => {
            const offset = index * 4;

            placeholders.push(
                `($${offset + 1}, $${offset + 2}, $${offset + 3}, $${offset + 4})`
            );

            values.push(
                invoice.id,
                item.description,
                item.quantity,
                item.unitPrice
            );
        });

        await client.query(
            `
            INSERT INTO invoice_items
                (
                    invoice_id,
                    description,
                    quantity,
                    unit_price
                )
            VALUES ${placeholders.join(", ")}
            `,
            values
        );

        return invoice;
    });
};


export const getInvoicesService = async (
    role: UserRole,
    vendorId: number | null,
    page: number,
    limit: number,
    status?: string
) => {
    const offset = (page - 1) * limit;

    let query = `
        SELECT
            i.id,
            i.vendor_id,
            v.name AS vendor_name,
            i.invoice_number,
            i.status,
            i.invoice_date,
            i.due_date,
            i.total_amount,
            i.created_at,
            i.updated_at
        FROM invoices i
        JOIN vendors v
            ON i.vendor_id = v.id
    `;

    const values: (number | string)[] = [];
    const conditions: string[] = [];

    if (role === UserRole.VENDOR) {
        conditions.push(`i.vendor_id = $${values.length + 1}`);
        values.push(vendorId!);
    }

    if (status) {
        conditions.push(`i.status = $${values.length + 1}`);
        values.push(status);
    }

    if (conditions.length > 0) {
        query += ` WHERE ${conditions.join(" AND ")}`;
    }

    // Count matching invoices
    const countValues = [...values];

    const countQuery = `
        SELECT COUNT(*) AS total
        FROM invoices i
        ${conditions.length > 0
            ? `WHERE ${conditions.join(" AND ")}`
            : ""}
    `;

     query += `
     ORDER BY i.created_at DESC
     LIMIT $${values.length + 1}
     OFFSET $${values.length + 2}
`;

    values.push(limit, offset);

    const [countResult, result] = await Promise.all([
    pool.query(countQuery, countValues),
    pool.query(query, values)
]);

const total = Number(countResult.rows[0].total);

    const totalPages = Math.ceil(total / limit);

    return {
        invoices: result.rows,
        pagination: {
            page,
            limit,
            total,
            totalPages
        }
    };
};



export const getInvoiceByIdService = async (
    invoiceId: number,
    role: UserRole,
    vendorId: number | null
) => {
    let invoiceQuery = `
        SELECT
            i.id,
            i.vendor_id,
            v.name AS vendor_name,
            i.invoice_number,
            i.status,
            i.invoice_date,
            i.due_date,
            i.total_amount,
            i.created_at,
            i.updated_at
        FROM invoices i
        INNER JOIN vendors v ON i.vendor_id = v.id
        WHERE i.id = $1
    `;

    const invoiceValues: number[] = [invoiceId];

    if (role === UserRole.VENDOR) {
        invoiceQuery += ` AND i.vendor_id = $2`;
        invoiceValues.push(vendorId!);
    }

    const [invoiceResult, itemsResult] = await Promise.all([
        pool.query(invoiceQuery, invoiceValues),

        pool.query(
            `
            SELECT
                id,
                description,
                quantity,
                unit_price,
                created_at
            FROM invoice_items
            WHERE invoice_id = $1
            ORDER BY id
            `,
            [invoiceId]
        )
    ]);

    if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    return {
        ...invoice,
        items: itemsResult.rows
    };
};


export const submitInvoiceService = async (
    invoiceId: number,
    vendorId: number,
    changedBy: number
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE invoices
            SET
                status = 'SUBMITTED',
                updated_at = NOW()
            WHERE id = $1
              AND vendor_id = $2
              AND status = 'DRAFT'
            RETURNING
                id,
                vendor_id,
                invoice_number,
                status,
                invoice_date,
                due_date,
                total_amount,
                updated_at
            `,
            [invoiceId, vendorId]
        );

        if (result.rows.length === 0) {
            throw new Error(
                "Invoice not found or cannot be submitted"
            );
        }

        const invoice = result.rows[0];

        await addInvoiceStatusHistory(
            client,
            invoiceId,
            changedBy,
            "DRAFT",
            "SUBMITTED"
        );

        return invoice;
    });
};



export const reviewInvoiceService = async (
    invoiceId: number,
    changedBy: number
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE invoices
            SET
                status = 'UNDER_REVIEW',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'SUBMITTED'
            RETURNING
                id,
                vendor_id,
                invoice_number,
                status,
                total_amount,
                updated_at
            `,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error(
                "Invoice not found or cannot be moved to review"
            );
        }

        const invoice = result.rows[0];

        await addInvoiceStatusHistory(
            client,
            invoiceId,
            changedBy,
            "SUBMITTED",
            "UNDER_REVIEW"
        );

        return invoice;
    });
};


export const approveInvoiceService = async (
    invoiceId: number,
    changedBy: number
) => {
    return withTransaction(async (client) => {

        // 1. Get invoice + vendor status
        const invoiceResult = await client.query(
            `
            SELECT
                i.id,
                i.vendor_id,
                i.invoice_number,
                i.status,
                i.total_amount,
                v.status AS vendor_status
            FROM invoices i
            JOIN vendors v
                ON i.vendor_id = v.id
            WHERE i.id = $1
            `,
            [invoiceId]
        );

        if (invoiceResult.rows.length === 0) {
            throw new AppError(
                "INVOICE_NOT_FOUND",
                "Invoice not found",
                404
            );
        }

        const invoice = invoiceResult.rows[0];

        // 2. Invoice must be under review
        if (invoice.status !== "UNDER_REVIEW") {
            throw new AppError(
                "INVALID_INVOICE_STATUS",
                "Only invoices under review can be approved",
                400
            );
        }

        // 3. Vendor must still be active
        if (invoice.vendor_status !== "ACTIVE") {
            throw new AppError(
                "VENDOR_NOT_ACTIVE",
                "Invoice cannot be approved because vendor is not active",
                403
            );
        }

        // 4. Check invoice items
        const itemsResult = await client.query(
            `
            SELECT
                COALESCE(
                    SUM(quantity * unit_price),
                    0
                ) AS items_total
            FROM invoice_items
            WHERE invoice_id = $1
            `,
            [invoiceId]
        );

        const itemsTotal = Number(itemsResult.rows[0].items_total);
        const invoiceTotal = Number(invoice.total_amount);

        if (itemsTotal === 0) {
            throw new AppError(
                "INVALID_INVOICE_ITEMS",
                "Invoice must contain at least one item",
                400
            );
        }

        if (itemsTotal !== invoiceTotal) {
            throw new AppError(
                "INVALID_INVOICE_TOTAL",
                "Invoice total does not match invoice items",
                400
            );
        }

        // 5. Check valid tax profile
        const taxResult = await client.query(
            `
            SELECT id
            FROM vendor_tax_profiles
            WHERE vendor_id = $1
              AND valid_from <= CURRENT_DATE
              AND (
                  valid_until IS NULL
                  OR valid_until >= CURRENT_DATE
              )
            LIMIT 1
            `,
            [invoice.vendor_id]
        );

        if (taxResult.rows.length === 0) {
            throw new AppError(
                "INVALID_TAX_PROFILE",
                "Vendor does not have a valid tax profile",
                400
            );
        }

        // 6. Approve invoice
        const result = await client.query(
            `
            UPDATE invoices
            SET
                status = 'APPROVED',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'UNDER_REVIEW'
            RETURNING
                id,
                vendor_id,
                invoice_number,
                status,
                total_amount,
                updated_at
            `,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error(
                "Invoice could not be approved"
            );
        }

        const approvedInvoice = result.rows[0];

        // 7. Record history
        await addInvoiceStatusHistory(
            client,
            invoiceId,
            changedBy,
            "UNDER_REVIEW",
            "APPROVED"
        );

        return approvedInvoice;
    });
};


export const rejectInvoiceService = async (
    invoiceId: number,
    changedBy: number,
    reason: string
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE invoices
            SET
                status = 'REJECTED',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'UNDER_REVIEW'
            RETURNING
                id,
                vendor_id,
                invoice_number,
                status,
                total_amount,
                updated_at
            `,
            [invoiceId]
        );

        if (result.rows.length === 0) {
            throw new Error(
                "Invoice not found or cannot be rejected"
            );
        }

        const invoice = result.rows[0];

        await addInvoiceStatusHistory(
            client,
            invoiceId,
            changedBy,
            "UNDER_REVIEW",
            "REJECTED",
            reason
        );

        return invoice;
    });
};


const addInvoiceStatusHistory = async (
    client: PoolClient,
    invoiceId: number,
    changedBy: number,
    oldStatus: string,
    newStatus: string,
    reason?: string
) => {
    await client.query(
        `
        INSERT INTO invoice_status_history
            (invoice_id, changed_by, old_status, new_status, reason)
        VALUES
            ($1, $2, $3, $4, $5)
        `,
        [
            invoiceId,
            changedBy,
            oldStatus,
            newStatus,
            reason ?? null
        ]
    );
};