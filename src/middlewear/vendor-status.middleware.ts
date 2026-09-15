


import { Request, Response, NextFunction } from "express";
import pool from "../db/pool.js";

export const requireActiveVendor = async (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const vendorId = req.user?.vendorId;

    if (!vendorId) {
        return res.status(403).json({
            success: false,
            error: {
                code: "FORBIDDEN",
                message: "Vendor account required"
            }
        });
    }

    const result = await pool.query(
        `
        SELECT status
        FROM vendors
        WHERE id = $1
        `,
        [vendorId]
    );

    if (result.rows.length === 0) {
        return res.status(404).json({
            success: false,
            error: {
                code: "VENDOR_NOT_FOUND",
                message: "Vendor not found"
            }
        });
    }

    if (result.rows[0].status !== "ACTIVE") {
        return res.status(403).json({
            success: false,
            error: {
                code: "VENDOR_NOT_ACTIVE",
                message: "Vendor account is not active"
            }
        });
    }

    next();
};