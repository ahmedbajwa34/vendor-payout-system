

import { z } from "zod";

export const createPayoutSchema = z.object({
    invoiceId: z.number().int().positive(),
    amount: z.number().positive()
});

export const failPayoutSchema = z.object({
    reason: z.string().min(1).max(255)
});

export const cancelPayoutSchema = z.object({
    reason: z.string().min(1).max(255)
});