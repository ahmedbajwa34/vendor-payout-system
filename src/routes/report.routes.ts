



import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear";
import { authorize } from "../middlewear/authorize.middlewear";
import { staff } from "../types/role-group";
import { getVendorPayoutSummary,getInvoiceStatusSummary } from "../controllers/report.controller.js";

const router = Router();

router.get(
    "/vendor-payout-summary",
    authenticate,
    authorize(...staff),
    getVendorPayoutSummary
);

router.get(
    "/invoice-status-summary",
    authenticate,
    authorize(...staff),
    getInvoiceStatusSummary
);

export default router;