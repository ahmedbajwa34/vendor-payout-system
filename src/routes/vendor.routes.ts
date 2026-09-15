import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorizeVendorAccess } from "../middlewear/vendor-access.middlewear.js";
import { getVendor, approveVendor, updateVendor, suspendVendor} from "../controllers/vendor.controller.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { authorizeVendorUpdate } from "../middlewear/vendor-update.middlewear.js";
const router = Router();

router.post(
    "/:id/approve",
    authenticate,
    authorize("ADMIN"),
    approveVendor
);

router.get(
    "/:id",
    authenticate,
    authorizeVendorAccess,
    getVendor
);


router.patch(
    "/:id",
    authenticate,
    authorizeVendorUpdate,
    updateVendor
);

router.post(
    "/:id/suspend",
    authenticate,
    authorize("ADMIN"),
    suspendVendor
);

export default router;