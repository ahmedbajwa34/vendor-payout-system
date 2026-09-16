
import { z } from "zod";

export const updateVendorSchema = z.object({
    name: z.string().min(2).max(100).optional(),
    email: z.string().email().max(150).optional(),
    phone: z.string().max(20).optional()
}).refine(
    (data) => Object.keys(data).length > 0,
    {
        message: "At least one field must be provided"
    }
);

export const createTaxProfileSchema = z.object({
    taxId: z.string().min(1).max(50),
    taxForm: z.string().min(1).max(20),
    validFrom: z.string(),
    validUntil: z.string().nullable().optional()
});

export const updateTaxProfileSchema = z.object({
    taxId: z.string().min(1).max(50).optional(),
    taxForm: z.string().min(1).max(20).optional(),
    validFrom: z.string().optional(),
    validUntil: z.string().nullable().optional()
});