

import pool from "../db/pool.js";
import { PoolClient } from "pg";
import { AppError } from "../types/app-error.js";

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
    // 1. Calculate items total
    const itemsTotal = data.items.reduce(
        (sum, item) =>
            sum + item.quantity * item.unitPrice,
        0
    );

    // 2. Make sure invoice total matches items
    if (itemsTotal !== data.totalAmount) {
        throw new Error(
            "Invoice total does not match the sum of invoice items"
        );
    }

    const client = await pool.connect();

    try {
        // 3. Start transaction
        await client.query("BEGIN");

        // 4. Create invoice
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

        // 5. Create invoice items
        for (const item of data.items) {
            await client.query(
                `
                INSERT INTO invoice_items
                    (
                        invoice_id,
                        description,
                        quantity,
                        unit_price
                    )
                VALUES
                    ($1, $2, $3, $4)
                `,
                [
                    invoice.id,
                    item.description,
                    item.quantity,
                    item.unitPrice
                ]
            );
        }

        // 6. Commit everything
        await client.query("COMMIT");

        return invoice;

    } catch (error) {

        // 7. Undo everything if something fails
        await client.query("ROLLBACK");

        throw error;

    } finally {

        // 8. Return connection to pool
        client.release();
    }
};


export const getInvoicesService = async (
    role: "ADMIN" | "FINANCE" | "VENDOR",
    vendorId: number | null
) => {
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

    const values: number[] = [];

    if (role === "VENDOR") {
        query += `
            WHERE i.vendor_id = $1
        `;

        values.push(vendorId!);
    }

    query += `
        ORDER BY i.created_at DESC
    `;

    const result = await pool.query(query, values);

    return result.rows;
};


export const getInvoiceByIdService = async (
    invoiceId: number,
    role: "ADMIN" | "FINANCE" | "VENDOR",
    vendorId: number | null
) => {
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
        JOIN vendors v ON i.vendor_id = v.id
        WHERE i.id = $1
    `;

    const values: number[] = [invoiceId];

    if (role === "VENDOR") {
        query += ` AND i.vendor_id = $2`;
        values.push(vendorId!);
    }

    const invoiceResult = await pool.query(query, values);

    if (invoiceResult.rows.length === 0) {
        throw new Error("Invoice not found");
    }

    const invoice = invoiceResult.rows[0];

    const itemsResult = await pool.query(
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
    );

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
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

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

        await client.query("COMMIT");

        return invoice;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};



export const reviewInvoiceService = async (
    invoiceId: number,
    changedBy: number
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

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

        await client.query("COMMIT");

        return invoice;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};


export const approveInvoiceService = async (
    invoiceId: number,
    changedBy: number
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

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

        await client.query("COMMIT");

        return approvedInvoice;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
};

export const rejectInvoiceService = async (
    invoiceId: number,
    changedBy: number,
    reason: string
) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

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

        await client.query(
            `
            INSERT INTO invoice_status_history
                (
                    invoice_id,
                    changed_by,
                    old_status,
                    new_status,
                    reason
                )
            VALUES
                ($1, $2, $3, $4, $5)
            `,
            [
                invoiceId,
                changedBy,
                "UNDER_REVIEW",
                "REJECTED",
                reason
            ]
        );

        await client.query("COMMIT");

        return invoice;

    } catch (error) {
        await client.query("ROLLBACK");
        throw error;
    } finally {
        client.release();
    }
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