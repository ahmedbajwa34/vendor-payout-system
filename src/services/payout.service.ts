


import pool from "../db/pool.js";
import { withTransaction } from "../db/transaction.js";
import { AppError } from "../types/app-error.js";
import { UserRole } from "../types/auth.types.js";

interface CreatePayoutData {
    invoiceId: number;
    amount: number;
}

export const createPayoutService = async (
    data: CreatePayoutData
) => {
    return withTransaction(async (client) => {

        // 1. Lock the invoice row
        const invoiceResult = await client.query(
            `
            SELECT
                id,
                total_amount,
                status
            FROM invoices
            WHERE id = $1
            FOR UPDATE
            `,
            [data.invoiceId]
        );

        if (invoiceResult.rows.length === 0) {
            throw new AppError(
                "INVOICE_NOT_FOUND",
                "Invoice not found",
                404
            );
        }

        const invoice = invoiceResult.rows[0];

        // 2. Invoice must be approved
        if (invoice.status !== "APPROVED") {
            throw new AppError(
                "INVALID_INVOICE_STATUS",
                "Payout can only be created for an approved invoice",
                400
            );
        }

        // 3. Calculate existing payouts
        const payoutResult = await client.query(
            `
            SELECT
                COALESCE(SUM(amount), 0) AS total_payouts
            FROM payouts
            WHERE invoice_id = $1
            AND status IN ('SCHEDULED', 'PROCESSING', 'COMPLETED')
            `,
            [data.invoiceId]
        );

        const totalPayouts = Number(
            payoutResult.rows[0].total_payouts
        );

        const invoiceTotal = Number(invoice.total_amount);

        // 4. Check payout limit
        if (totalPayouts + data.amount > invoiceTotal) {
            throw new AppError(
                "PAYOUT_LIMIT_EXCEEDED",
                "Payout amount exceeds the remaining invoice balance",
                400
            );
        }

        // 5. Create payout
        const result = await client.query(
            `
            INSERT INTO payouts
                (
                    invoice_id,
                    amount,
                    status
                )
            VALUES
                ($1, $2, 'SCHEDULED')
            RETURNING
                id,
                invoice_id,
                amount,
                status,
                scheduled_at,
                processed_at,
                created_at,
                updated_at
            `,
            [
                data.invoiceId,
                data.amount
            ]
        );

        return result.rows[0];
    });
};




export const processPayoutService = async (
    payoutId: number,
    changedBy: number
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE payouts
            SET
                status = 'PROCESSING',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'SCHEDULED'
            RETURNING
                id,
                invoice_id,
                amount,
                status,
                scheduled_at,
                processed_at,
                updated_at
            `,
            [payoutId]
        );

        if (result.rows.length === 0) {
            throw new AppError(
                "INVALID_PAYOUT_STATUS",
                "Payout not found or cannot be processed",
                400
            );
        }

        const payout = result.rows[0];

        await client.query(
            `
            INSERT INTO payout_status_history
                (
                    payout_id,
                    changed_by,
                    old_status,
                    new_status
                )
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                payoutId,
                changedBy,
                "SCHEDULED",
                "PROCESSING"
            ]
        );

        return payout;
    });
};



export const completePayoutService = async (
    payoutId: number,
    changedBy: number
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE payouts
            SET
                status = 'COMPLETED',
                processed_at = NOW(),
                updated_at = NOW()
            WHERE id = $1
              AND status = 'PROCESSING'
            RETURNING
                id,
                invoice_id,
                amount,
                status,
                scheduled_at,
                processed_at,
                updated_at
            `,
            [payoutId]
        );

        if (result.rows.length === 0) {
            throw new AppError(
                "INVALID_PAYOUT_STATUS",
                "Payout not found or cannot be completed",
                400
            );
        }

        const payout = result.rows[0];

        await client.query(
            `
            INSERT INTO payout_status_history
                (
                    payout_id,
                    changed_by,
                    old_status,
                    new_status
                )
            VALUES
                ($1, $2, $3, $4)
            `,
            [
                payoutId,
                changedBy,
                "PROCESSING",
                "COMPLETED"
            ]
        );

        return payout;
    });
};



export const failPayoutService = async (
    payoutId: number,
    changedBy: number,
    reason: string
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE payouts
            SET
                status = 'FAILED',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'PROCESSING'
            RETURNING
                id,
                invoice_id,
                amount,
                status,
                scheduled_at,
                processed_at,
                updated_at
            `,
            [payoutId]
        );

        if (result.rows.length === 0) {
            throw new AppError(
                "INVALID_PAYOUT_STATUS",
                "Payout not found or cannot be marked as failed",
                400
            );
        }

        const payout = result.rows[0];

        await client.query(
            `
            INSERT INTO payout_status_history
                (
                    payout_id,
                    changed_by,
                    old_status,
                    new_status,
                    reason
                )
            VALUES
                ($1, $2, $3, $4, $5)
            `,
            [
                payoutId,
                changedBy,
                "PROCESSING",
                "FAILED",
                reason
            ]
        );

        return payout;
    });
};



export const cancelPayoutService = async (
    payoutId: number,
    changedBy: number,
    reason: string
) => {
    return withTransaction(async (client) => {

        const result = await client.query(
            `
            UPDATE payouts
            SET
                status = 'CANCELLED',
                updated_at = NOW()
            WHERE id = $1
              AND status = 'SCHEDULED'
            RETURNING
                id,
                invoice_id,
                amount,
                status,
                scheduled_at,
                processed_at,
                updated_at
            `,
            [payoutId]
        );

        if (result.rows.length === 0) {
            throw new AppError(
                "INVALID_PAYOUT_STATUS",
                "Payout not found or cannot be cancelled",
                400
            );
        }

        const payout = result.rows[0];

        await client.query(
            `
            INSERT INTO payout_status_history
                (
                    payout_id,
                    changed_by,
                    old_status,
                    new_status,
                    reason
                )
            VALUES
                ($1, $2, $3, $4, $5)
            `,
            [
                payoutId,
                changedBy,
                "SCHEDULED",
                "CANCELLED",
                reason
            ]
        );

        return payout;
    });
};


export const getPayoutsService = async (
    userId: number,
    role: UserRole,
    vendorId: number | null
) => {
    let query = `
        SELECT
            p.id,
            p.invoice_id,
            p.amount,
            p.status,
            p.scheduled_at,
            p.processed_at,
            p.created_at,
            p.updated_at,
            i.invoice_number,
            v.id AS vendor_id,
            v.name AS vendor_name
        FROM payouts p
        INNER JOIN invoices i ON i.id = p.invoice_id
        INNER JOIN vendors v ON v.id = i.vendor_id
    `;

    const values: number[] = [];

    if (role === UserRole.VENDOR) {
        query += ` WHERE v.id = $1`;
        values.push(vendorId!);
    }

    query += ` ORDER BY p.created_at DESC`;

    const result = await pool.query(query, values);

    return result.rows;
};




export const getPayoutByIdService = async (
    payoutId: number,
    userId: number,
    role: UserRole,
    vendorId: number | null
) => {
    const result = await pool.query(
        `
        SELECT
            p.id,
            p.invoice_id,
            p.amount,
            p.status,
            p.scheduled_at,
            p.processed_at,
            p.created_at,
            p.updated_at,
            i.invoice_number,
            i.total_amount AS invoice_total,
            v.id AS vendor_id,
            v.name AS vendor_name
        FROM payouts p
        INNER JOIN invoices i ON i.id = p.invoice_id
        INNER JOIN vendors v ON v.id = i.vendor_id
        WHERE p.id = $1
        `,
        [payoutId]
    );

    if (result.rows.length === 0) {
        throw new AppError(
            "PAYOUT_NOT_FOUND",
            "Payout not found",
            404
        );
    }

    const payout = result.rows[0];

    if (
        role === UserRole.VENDOR &&
        payout.vendor_id !== vendorId
    ) {
        throw new AppError(
            "FORBIDDEN",
            "You cannot access this payout",
            403
        );
    }

    const history = await pool.query(
        `
        SELECT
            psh.id,
            psh.old_status,
            psh.new_status,
            psh.reason,
            psh.created_at,
            psh.changed_by,
            u.name AS changed_by_name
        FROM payout_status_history psh
        INNER JOIN users u ON u.id = psh.changed_by
        WHERE psh.payout_id = $1
        ORDER BY psh.created_at
        `,
        [payoutId]
    );

    return {
        ...payout,
        history: history.rows
    };
};