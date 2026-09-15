

import pool from "../db/pool.js";

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