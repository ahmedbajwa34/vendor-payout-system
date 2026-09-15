

export class AppError extends Error {
    statusCode: number;
    code: string;

    constructor(
        code: string,
        message: string,
        statusCode: number
    ) {
        super(message);

        this.code = code;
        this.statusCode = statusCode;

        Error.captureStackTrace(this, this.constructor);
    }
}