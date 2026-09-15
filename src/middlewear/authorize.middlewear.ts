import { Request, Response, NextFunction } from "express";
import { AuthUser } from "../types/auth.types.js";

type Role = AuthUser["role"];

export const authorize = (...allowedRoles: Role[]) => {
    return (req: Request, res: Response, next: NextFunction) => {

        if (!req.user) {
            return res.status(401).json({
                success: false,
                error: {
                    code: "UNAUTHORIZED",
                    message: "Authentication required"
                }
            });
        }

        if (!allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You do not have permission to perform this action"
                }
            });
        }

        next();
    };
};