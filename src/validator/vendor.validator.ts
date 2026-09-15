
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