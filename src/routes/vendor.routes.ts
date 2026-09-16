import { Router } from "express";
import { authenticate } from "../middlewear/auth.middlewear.js";
import { authorizeVendorAccess } from "../middlewear/vendor-access.middlewear.js";
import { getVendor, approveVendor, updateVendor, suspendVendor, createTaxProfile, getTaxProfiles,getTaxProfileById, updateTaxProfile} from "../controllers/vendor.controller.js";
import { authorize } from "../middlewear/authorize.middlewear.js";
import { authorizeVendorUpdate } from "../middlewear/vendor-update.middlewear.js";
import { AuthUser, UserRole } from "../types/auth.types.js";
import { all } from "../types/role-group.js";


const router = Router();

router.post(
    "/:id/approve",
    authenticate,
    authorize(UserRole.ADMIN),
    approveVendor
);

router.get(
    "/:id",
    authenticate,
    authorizeVendorAccess,
    getVendor
);


router.get(
    "/:id/tax-profiles",
    authenticate,
    authorize(...all),
    authorizeVendorAccess,
    getTaxProfiles
);

router.get(
    "/:id/tax-profiles/:taxId",
    authenticate,
    authorize(...all),
    authorizeVendorAccess,
    getTaxProfileById
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
    authorize(UserRole.ADMIN),
    suspendVendor
);


router.post(
    "/:id/tax-profiles",
    authenticate,
    authorize(...all),
    authorizeVendorAccess,
    createTaxProfile
);

router.patch(
    "/:id/tax-profiles/:taxId",
    authenticate,
    authorize(...all),
    authorizeVendorAccess,
    updateTaxProfile
);

export default router;