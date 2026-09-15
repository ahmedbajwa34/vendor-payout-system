

import { Request, Response} from "express";
import { registerSchema, loginSchema } from "../validator/auth.validator";
import { registerUser, loginUser } from "../services/auth.service";

export const register = async (req: Request, res: Response) => {
    const data = registerSchema.parse(req.body);

    const result = await registerUser(data);

    res.status(201).json({
        success: true,
        data: result
    });
};



export const login = async(req: Request, res: Response) => {
    const data = loginSchema.parse(req.body)

    const user =  await loginUser(
        data.email,
        data.password
    )

    res.status(200).json({
        success: true,
        data: user

    })
}



