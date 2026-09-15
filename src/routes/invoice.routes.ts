

import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { createInvoice } from "../controllers/invoice.controller.js";

const router = Router();

router.post(
    "/",
    authenticate,
    authorize("VENDOR"),
    createInvoice
);

export default router;