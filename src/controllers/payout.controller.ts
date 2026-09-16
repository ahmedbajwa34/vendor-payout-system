

import { Request, Response } from "express";
import { createPayoutService } from "../services/payout.service.js";
import { createPayoutSchema, cancelPayoutSchema } from "../validator/payout.validator.js";
import { processPayoutService, completePayoutService, failPayoutService,cancelPayoutService,getPayoutsService, getPayoutByIdService } from "../services/payout.service.js";
import { failPayoutSchema } from "../validator/payout.validator.js";



export const createPayout = async (
    req: Request,
    res: Response
) => {
    const data = createPayoutSchema.parse(req.body);

    const payout = await createPayoutService(data);

    return res.status(201).json({
        success: true,
        data: payout
    });
};

export const processPayout = async (
    req: Request,
    res: Response
) => {
    const payoutId = Number(req.params.id);

    const payout = await processPayoutService(
        payoutId,
        req.user!.userId
    );

    return res.status(200).json({
        success: true,
        data: payout
    });
};


export const completePayout = async (
    req: Request,
    res: Response
) => {
    const payoutId = Number(req.params.id);

    const payout = await completePayoutService(
        payoutId,
        req.user!.userId
    );

    return res.status(200).json({
        success: true,
        data: payout
    });
};


export const failPayout = async (
    req: Request,
    res: Response
) => {
    const data = failPayoutSchema.parse(req.body);

    const payoutId = Number(req.params.id);

    const payout = await failPayoutService(
        payoutId,
        req.user!.userId,
        data.reason
    );

    return res.status(200).json({
        success: true,
        data: payout
    });
};

export const cancelPayout = async (
    req: Request,
    res: Response
) => {
    const data = cancelPayoutSchema.parse(req.body);

    const payoutId = Number(req.params.id);

    const payout = await cancelPayoutService(
        payoutId,
        req.user!.userId,
        data.reason
    );

    return res.status(200).json({
        success: true,
        data: payout
    });
};



export const getPayouts = async (
    req: Request,
    res: Response
) => {
    const payouts = await getPayoutsService(
        req.user!.userId,
        req.user!.role,
        req.user!.vendorId
    );

    return res.status(200).json({
        success: true,
        data: payouts
    });
};



export const getPayoutById = async (
    req: Request,
    res: Response
) => {
    const payoutId = Number(req.params.id);

    const payout = await getPayoutByIdService(
        payoutId,
        req.user!.userId,
        req.user!.role,
        req.user!.vendorId
    );

    return res.status(200).json({
        success: true,
        data: payout
    });
};