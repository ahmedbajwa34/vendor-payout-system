

import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { createPayout, getPayouts , getPayoutById ,processPayout, completePayout, failPayout, cancelPayout } from "../controllers/payout.controller.js";
import { all, staff } from "../types/role-group.js";




const router = Router();

router.post(
    "/",
    authenticate,
    authorize(...staff),
    createPayout
);

router.get(
    "/",
    authenticate,
    authorize(...all),
    getPayouts
);

router.get(
    "/:id",
    authenticate,
    authorize(...all),
    getPayoutById
);

router.patch(
    "/:id/process",
    authenticate,
    authorize(...staff),
    processPayout
);


router.patch(
    "/:id/complete",
    authenticate,
    authorize(...staff),
    completePayout
);


router.patch(
    "/:id/fail",
    authenticate,
    authorize(...staff),
    failPayout
);


router.patch(
    "/:id/cancel",
    authenticate,
    authorize(...staff),
    cancelPayout
);

export default router;