






import pool from "../db/pool.js";

export const getVendorPayoutSummaryService = async () => {
    const result = await pool.query(`
        WITH invoice_totals AS (
            SELECT
                vendor_id,
                SUM(total_amount) AS approved_invoice_amount
            FROM invoices
            WHERE status IN ('APPROVED', 'PAID')
            GROUP BY vendor_id
        ),
        payout_totals AS (
            SELECT
                i.vendor_id,

                SUM(
                    CASE
                        WHEN p.status = 'COMPLETED'
                        THEN p.amount
                        ELSE 0
                    END
                ) AS paid_amount,

                SUM(
                    CASE
                        WHEN p.status IN ('SCHEDULED', 'PROCESSING')
                        THEN p.amount
                        ELSE 0
                    END
                ) AS pending_payout_amount

            FROM payouts p
            JOIN invoices i
                ON i.id = p.invoice_id
            GROUP BY i.vendor_id
        )
        SELECT
    v.id AS vendor_id,
    v.name AS vendor_name,

    COALESCE(it.approved_invoice_amount, 0)
        AS approved_invoice_amount,

    COALESCE(pt.paid_amount, 0)
        AS paid_amount,

    COALESCE(pt.pending_payout_amount, 0)
        AS pending_payout_amount,

    COALESCE(it.approved_invoice_amount, 0)
    - COALESCE(pt.paid_amount, 0)
    - COALESCE(pt.pending_payout_amount, 0)
        AS remaining_payout_amount

     FROM vendors v
    LEFT JOIN invoice_totals it
    ON it.vendor_id = v.id
    LEFT JOIN payout_totals pt
    ON pt.vendor_id = v.id
    ORDER BY v.id;
    `);

    return result.rows;
};


export const getInvoiceStatusSummaryService = async () => {
    const result = await pool.query(`
        WITH statuses AS (
            SELECT unnest(enum_range(NULL::invoice_status)) AS status
        ),
        summary AS (
            SELECT
                status,
                COUNT(*) AS invoice_count,
                SUM(total_amount) AS total_amount
            FROM invoices
            GROUP BY status
        ),
        report AS (
            SELECT
                s.status,
                COALESCE(sm.invoice_count, 0) AS invoice_count,
                COALESCE(sm.total_amount, 0) AS total_amount
            FROM statuses s
            LEFT JOIN summary sm
                ON sm.status = s.status
        )
        SELECT
            status,
            invoice_count,
            total_amount,
            ROUND(
                (
                    total_amount
                    /
                    NULLIF(SUM(total_amount) OVER (), 0)
                ) * 100,
                2
            ) AS percentage_of_total
        FROM report
        ORDER BY status;
    `);

    return result.rows;
};