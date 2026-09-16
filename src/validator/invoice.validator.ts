

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



export const rejectInvoiceSchema = z.object({
    reason: z.string().min(1).max(255)
});


export const invoiceQuerySchema = z.object({
    page: z.coerce.number().int().positive().default(1),

    limit: z.coerce.number().int().positive().max(100).default(10),

    status: z.enum([
        "DRAFT",
        "SUBMITTED",
        "UNDER_REVIEW",
        "APPROVED",
        "REJECTED",
        "PAID",
        "CANCELLED"
    ]).optional()
});