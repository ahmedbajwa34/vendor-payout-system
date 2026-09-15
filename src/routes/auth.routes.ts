import { Router } from "express";
import { login, register } from "../controllers/auth.controller";
import { authenticate } from "../middlewear/auth.middlewear";
import { authorize } from "../middlewear/authorize.middlewear";

const router = Router();

router.post("/register", register);
router.post("/login", login);


router.get("/me", authenticate, (req, res)=> {
    res.json({
        success: true,
        user: req.user
    });

});

export default router;