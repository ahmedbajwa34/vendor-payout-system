

import { Request, Response } from "express";
import { createInvoiceSchema } from "../validator/invoice.validator.js";
import { createInvoiceService } from "../services/invoice.service.js";

export const createInvoice = async (
    req: Request,
    res: Response
) => {
    const data = createInvoiceSchema.parse(req.body);

    const vendorId = req.user!.vendorId!;

    const invoice = await createInvoiceService(
        vendorId,
        data
    );

    res.status(201).json({
        success: true,
        data: invoice
    });
};