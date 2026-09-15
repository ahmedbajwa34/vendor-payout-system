import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import { AuthUser } from "../types/auth.types.js";

export const authenticate = (
    req: Request,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({
            success: false,
            error: {
                code: "UNAUTHORIZED",
                message: "Authentication token is required"
            }
        });
    }

    const token = authHeader.split(" ")[1];
    
   console.log("VERIFY SECRET:", process.env.JWT_SECRET);
   try {
    const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET!
    ) as AuthUser;

    req.user = decoded;

    next();
} catch (error) {
    console.error("JWT ERROR:", error);

    return res.status(401).json({
        success: false,
        error: {
            code: "INVALID_TOKEN",
            message: "Invalid or expired token"
        }
    });
}
};