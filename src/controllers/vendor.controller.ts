

import { Request, Response } from "express";
import { approveVendorService, getVendorService, updateVendorService, suspendVendorService, createTaxProfileService,getTaxProfilesService, getTaxProfileByIdService, updateTaxProfileService } from "../services/vendor.service.js";
import { updateVendorSchema, createTaxProfileSchema, updateTaxProfileSchema } from "../validator/vendor.validator.js";



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


export const createTaxProfile = async (
    req: Request,
    res: Response
) => {
    const data = createTaxProfileSchema.parse(req.body);

    const taxProfile = await createTaxProfileService(
        Number(req.params.id),
        data
    );

    return res.status(201).json({
        success: true,
        data: taxProfile
    });
};


export const getTaxProfiles = async (
    req: Request,
    res: Response
) => {
    const taxProfiles = await getTaxProfilesService(
        Number(req.params.id)
    );

    return res.status(200).json({
        success: true,
        data: taxProfiles
    });
};


export const getTaxProfileById = async (
    req: Request,
    res: Response
) => {
    const taxProfile = await getTaxProfileByIdService(
        Number(req.params.id),
        Number(req.params.taxId)
    );

    return res.status(200).json({
        success: true,
        data: taxProfile
    });
};


export const updateTaxProfile = async (
    req: Request,
    res: Response
) => {
    const data = updateTaxProfileSchema.parse(req.body);

    const taxProfile = await updateTaxProfileService(
        Number(req.params.id),
        Number(req.params.taxId),
        data
    );

    return res.status(200).json({
        success: true,
        data: taxProfile
    });
};