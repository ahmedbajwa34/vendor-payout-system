


import { Request, Response, NextFunction } from "express";
import { AppError } from "../types/app-error.js";

export const errorHandler = (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
) => {

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