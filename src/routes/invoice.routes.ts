

import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { createInvoice, getInvoices, getInvoiceById, submitInvoice, reviewInvoice, approveInvoice, rejectInvoice } from "../controllers/invoice.controller.js";
import { requireActiveVendor } from "../middlewear/vendor-status.middleware.js";

const router = Router();


router.get(
    "/",
    authenticate,
    authorize("ADMIN", "FINANCE", "VENDOR"),
    getInvoices
);  


router.post(
    "/",
    authenticate,
    authorize("VENDOR"),
    requireActiveVendor,
    createInvoice
);

router.get(
    "/:id",
    authenticate,
    authorize("ADMIN", "FINANCE", "VENDOR"),
    getInvoiceById
);

router.patch(
    "/:id/submit",
    authenticate,
    authorize("VENDOR"),
    submitInvoice
);


router.patch(
    "/:id/review",
    authenticate,
    authorize("ADMIN", "FINANCE"),
    reviewInvoice
);

router.patch(
    "/:id/approve",
    authenticate,
    authorize("ADMIN", "FINANCE"),
    approveInvoice
);

router.patch(
    "/:id/reject",
    authenticate,
    authorize("ADMIN", "FINANCE"),
    rejectInvoice
);



export default router;