
import { Request, Response, NextFunction } from "express";

export const authorizeVendorAccess = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    // Authentication check
    if (!req.user) {
        return res.status(401).json({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication required"
            }
        });
    }

    // ADMIN and FINANCE can access any vendor
    if (
        req.user.role === "ADMIN" ||
        req.user.role === "FINANCE"
    ) {
        return next();
    }

    // Get vendor ID from URL
    const requestedVendorId = Number(req.params.id);

    // VENDOR can only access their own vendor
    if (
        req.user.role === "VENDOR" &&
        req.user.vendorId === requestedVendorId
    ) {
        return next();
    }

    // Vendor is trying to access another vendor
    return res.status(403).json({
        success: false,
        error: {
            code: "FORBIDDEN",
            message: "You do not have access to this vendor"
        }
    });
};