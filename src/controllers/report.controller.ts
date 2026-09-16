


import { Request, Response } from "express";
import { getVendorPayoutSummaryService,getInvoiceStatusSummaryService } from "../services/report.service.js";

export const getVendorPayoutSummary = async (
    _req: Request,
    res: Response
) => {
    const report = await getVendorPayoutSummaryService();

    return res.status(200).json({
        success: true,
        data: report
    });
};

export const getInvoiceStatusSummary = async (
    _req: Request,
    res: Response
) => {
    const report = await getInvoiceStatusSummaryService();

    return res.status(200).json({
        success: true,
        data: report
    });
};