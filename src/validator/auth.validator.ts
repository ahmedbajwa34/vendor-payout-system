 

 import {email, z} from "zod";




export const registerSchema = z.object({
    vendor: z.object({
        name: z.string().min(2).max(100),
        email: z.string().email().max(150),
        phone: z.string().max(20).optional()
    }),

    user: z.object({
        name: z.string().min(2).max(30),
        email: z.string().email().max(50),
        password: z.string().min(8)
    })
});

 export const loginSchema = z.object({
    email: z.string().email().max(50),
    password: z.string().min(8)
 })