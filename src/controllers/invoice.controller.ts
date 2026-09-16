

import { Request, Response } from "express";
import { createInvoiceSchema, rejectInvoiceSchema, invoiceQuerySchema } from "../validator/invoice.validator.js";
import { createInvoiceService, getInvoicesService, getInvoiceByIdService, submitInvoiceService, reviewInvoiceService, approveInvoiceService, rejectInvoiceService } from "../services/invoice.service.js";

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

export const getInvoices = async (
    req: Request,
    res: Response
) => {

    const query = invoiceQuerySchema.parse(req.query);

    const invoices = await getInvoicesService(
        req.user!.role,
        req.user!.vendorId,
        query.page,
        query.limit,
        query.status
    );

    return res.status(200).json({
        success: true,
        data: invoices
    });
};

export const getInvoiceById = async (
    req: Request,
    res: Response
) => {
    const invoiceId = Number(req.params.id);
    const user = req.user!;

    const invoice = await getInvoiceByIdService(
        invoiceId,
        user.role,
        user.vendorId
    );

    res.status(200).json({
        success: true,
        data: invoice
    });
};


export const submitInvoice = async (
    req: Request,
    res: Response
) => {
    const invoiceId = Number(req.params.id);
    const vendorId = req.user!.vendorId!;
    const changedBy = req.user!.userId;

    const invoice = await submitInvoiceService(
        invoiceId,
        vendorId,
        changedBy
    );

    res.status(200).json({
        success: true,
        data: invoice
    });
};


export const reviewInvoice = async (
    req: Request,
    res: Response
) => {
    const invoiceId = Number(req.params.id);

    const changedBy = req.user!.userId;

    const invoice = await reviewInvoiceService(
    invoiceId,
    changedBy
    );
    res.status(200).json({
        success: true,
        data: invoice
    });
};


export const approveInvoice = async (
    req: Request,
    res: Response
) => {
    const invoiceId = Number(req.params.id);

  const changedBy = req.user!.userId;

  const invoice = await approveInvoiceService(
    invoiceId,
    changedBy
);
    res.status(200).json({
        success: true,
        data: invoice
    });
};

export const rejectInvoice = async (
    req: Request,
    res: Response
) => {
    const data = rejectInvoiceSchema.parse(req.body);

    const invoiceId = Number(req.params.id);
    const changedBy = req.user!.userId;

    const invoice = await rejectInvoiceService(
        invoiceId,
        changedBy,
        data.reason
    );

    res.status(200).json({
        success: true,
        data: invoice
    });
};