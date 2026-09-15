



import { Request, Response, NextFunction } from "express";

export const authorizeVendorUpdate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required"
            }
        });
    }

    // FINANCE cannot update vendors
    if (req.user.role === "FINANCE") {
        return res.status(403).json({
            success: false,
            error: {
                code: "FORBIDDEN",
                message: "Finance users cannot update vendors"
            }
        });
    }

    const requestedVendorId = Number(req.params.id);

    // VENDOR can update only their own vendor
    if (
        req.user.role === "VENDOR" &&
        req.user.vendorId !== requestedVendorId
    ) {
        return res.status(403).json({
            success: false,
            error: {
                code: "FORBIDDEN",
                message: "You do not have access to this vendor"
            }
        });
    }

    // ADMIN or authorized VENDOR
    next();
};