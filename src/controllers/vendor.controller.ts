

import { Request, Response } from "express";
import { approveVendorService, getVendorService, updateVendorService, suspendVendorService } from "../services/vendor.service.js";
import { updateVendorSchema } from "../validator/vendor.validator.js";





export const approveVendor = async (
    req: Request,
    res: Response
) => {
    const vendorId = Number(req.params.id);

    const vendor = await approveVendorService(vendorId);

    res.status(200).json({
        success: true,
        data: vendor
    });
};

export const getVendor = async(
    req: Request,
    res: Response
) => {
    const vendorId = Number(req.params.id)

    const vendor = await getVendorService(
        vendorId
    )
    res.status(200).json({
      success: true,
      data: vendor
    });
};

export const updateVendor = async (
    req: Request,
    res: Response
) => {
    const vendorId = Number(req.params.id);

    const data = updateVendorSchema.parse(req.body);

    const vendor = await updateVendorService(
        vendorId,
        data
    );

    res.status(200).json({
        success: true,
        data: vendor
    });
};


export const suspendVendor = async (
    req: Request,
    res: Response
) => {
    const vendorId = Number(req.params.id);

    const vendor = await suspendVendorService(vendorId);

    res.status(200).json({
        success: true,
        data: vendor
    });
};