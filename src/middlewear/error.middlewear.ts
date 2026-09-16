


import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/app-error.js";
import { ZodError } from "zod";





export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {

    if (error instanceof ZodError) {
    return res.status(400).json({
        success: false,
        error: {
            code: "VALIDATION_ERROR",
            message: "Invalid request data",
            details: error.issues
        }
    });
}

    if (error instanceof AppError) {
        return res.status(error.statusCode).json({
            success: false,
            error: {
                code: error.code,
                message: error.message
            }
        });
    }

    console.error(error);

    return res.status(500).json({
        success: false,
        error: {
            code: "INTERNAL_SERVER_ERROR",
            message: "Something went wrong"
        }
    });
};