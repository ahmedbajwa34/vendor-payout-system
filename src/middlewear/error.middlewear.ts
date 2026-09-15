


import { Request, Response, NextFunction} from "express";


export const errorHandler = (error: Error, _req: Request, res: Response, _next: NextFunction) => {
    console.error(error);

    res.status(500).json({
        success: false,
        error: {
            code: "INTERVAL SERVER_ERROR",
            message: error.message
        }
    });

};
