

import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { createInvoice, getInvoices, getInvoiceById, submitInvoice, reviewInvoice, approveInvoice, rejectInvoice } from "../controllers/invoice.controller.js";
import { requireActiveVendor } from "../middlewear/vendor-status.middleware.js";
import { all, staff, vendor } from "../types/role-group.js";

const router = Router();


router.get(
    "/",
    authenticate,
    authorize(...all),
    getInvoices
);  


router.post(
    "/",
    authenticate,
    authorize(...vendor),
    requireActiveVendor,
    createInvoice
);

router.get(
    "/:id",
    authenticate,
    authorize(...all),
    getInvoiceById
);

router.patch(
    "/:id/submit",
    authenticate,
    authorize(...vendor),
    submitInvoice
);


router.patch(
    "/:id/review",
    authenticate,
    authorize(...staff),
    reviewInvoice
);

router.patch(
    "/:id/approve",
    authenticate,
    authorize(...staff),
    approveInvoice
);

router.patch(
    "/:id/reject",
    authenticate,
    authorize(...staff),
    rejectInvoice
);



export default router;