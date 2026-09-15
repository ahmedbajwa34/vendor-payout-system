

import { z } from "zod";

export const createInvoiceSchema = z.object({
    invoiceNumber: z.string().min(1).max(50),

    invoiceDate: z.string(),

    dueDate: z.string(),

    totalAmount: z.number().positive(),

    items: z.array(
        z.object({
            description: z.string().min(1).max(255),
            quantity: z.number().positive(),
            unitPrice: z.number().nonnegative()
        })
    ).min(1)
});