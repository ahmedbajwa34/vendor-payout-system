

import pool from "../db/pool.js";
import { AppError } from "../types/app-error.js";

export const approveVendorService = async (vendorId: number) => {
    const result = await pool.query(
        `
        UPDATE vendors
        SET
            status = 'ACTIVE',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'PENDING'
        RETURNING id, name, email, phone, status, updated_at
        `,
        [vendorId]
    );

    if (result.rows.length === 0) {
        throw new Error("Vendor not found or cannot be approved");
    }

    return result.rows[0];
};


export const getVendorService = async (vendorId: number) => {
    const result = await pool.query(
        `
        SELECT
            id,
            name,
            email,
            phone,
            status,
            created_at,
            updated_at
        FROM vendors
        WHERE id = $1
        `,
        [vendorId]
    );

    if (result.rows.length === 0) {
        throw new Error("Vendor not found");
    }

    return result.rows[0];
};


export const updateVendorService = async (
    vendorId: number,
    data: {
        name?: string;
        email?: string;
        phone?: string;
    }
) => {
    const result = await pool.query(
        `
        UPDATE vendors
        SET
            name = COALESCE($1, name),
            email = COALESCE($2, email),
            phone = COALESCE($3, phone),
            updated_at = NOW()
        WHERE id = $4
        RETURNING
            id,
            name,
            email,
            phone,
            status,
            created_at,
            updated_at
        `,
        [
            data.name ?? null,
            data.email ?? null,
            data.phone ?? null,
            vendorId
        ]
    );

    if (result.rows.length === 0) {
        throw new Error("Vendor not found");
    }

    return result.rows[0];
};



export const suspendVendorService = async (vendorId: number) => {
    const result = await pool.query(
        `
        UPDATE vendors
        SET
            status = 'SUSPENDED',
            updated_at = NOW()
        WHERE id = $1
          AND status = 'ACTIVE'
        RETURNING
            id,
            name,
            email,
            phone,
            status,
            updated_at
        `,
        [vendorId]
    );

    if (result.rows.length === 0) {
        throw new Error("Vendor not found or cannot be suspended");
    }

    return result.rows[0];
};


export const createTaxProfileService = async (
    vendorId: number,
    data: {
        taxId: string;
        taxForm: string;
        validFrom: string;
        validUntil?: string | null;
    }
) => {
    const vendorResult = await pool.query(
        `SELECT id FROM vendors WHERE id = $1`,
        [vendorId]
    );

    if (vendorResult.rows.length === 0) {
        throw new AppError(
            "VENDOR_NOT_FOUND",
            "Vendor not found",
            404
        );
    }

    const overlapResult = await pool.query(
        `
        SELECT id
        FROM vendor_tax_profiles
        WHERE vendor_id = $1
          AND valid_from <= COALESCE($3::date, '9999-12-31'::date)
          AND COALESCE(valid_until, '9999-12-31'::date) >= $2::date
        `,
        [
            vendorId,
            data.validFrom,
            data.validUntil ?? null
        ]
    );

    if (overlapResult.rows.length > 0) {
        throw new AppError(
            "TAX_PROFILE_OVERLAP",
            "Tax profile validity period overlaps with an existing profile",
            400
        );
    }

    const result = await pool.query(
        `
        INSERT INTO vendor_tax_profiles
            (vendor_id, tax_id, tax_form, valid_from, valid_until)
        VALUES
            ($1, $2, $3, $4, $5)
        RETURNING
            id,
            vendor_id,
            tax_id,
            tax_form,
            valid_from,
            valid_until,
            created_at,
            updated_at
        `,
        [
            vendorId,
            data.taxId,
            data.taxForm,
            data.validFrom,
            data.validUntil ?? null
        ]
    );

    return result.rows[0];
};


export const getTaxProfilesService = async (
    vendorId: number
) => {
    const vendorResult = await pool.query(
        `SELECT id FROM vendors WHERE id = $1`,
        [vendorId]
    );

    if (vendorResult.rows.length === 0) {
        throw new AppError(
            "VENDOR_NOT_FOUND",
            "Vendor not found",
            404
        );
    }

    const result = await pool.query(
        `
        SELECT
            id,
            vendor_id,
            tax_id,
            tax_form,
            valid_from,
            valid_until,
            created_at,
            updated_at
        FROM vendor_tax_profiles
        WHERE vendor_id = $1
        ORDER BY valid_from DESC
        `,
        [vendorId]
    );

    return result.rows;
};


export const getTaxProfileByIdService = async (
    vendorId: number,
    taxProfileId: number
) => {
    const result = await pool.query(
        `
        SELECT
            id,
            vendor_id,
            tax_id,
            tax_form,
            valid_from,
            valid_until,
            created_at,
            updated_at
        FROM vendor_tax_profiles
        WHERE id = $1
          AND vendor_id = $2
        `,
        [taxProfileId, vendorId]
    );

    if (result.rows.length === 0) {
        throw new AppError(
            "TAX_PROFILE_NOT_FOUND",
            "Tax profile not found",
            404
        );
    }

    return result.rows[0];
};


export const updateTaxProfileService = async (
    vendorId: number,
    taxProfileId: number,
    data: {
        taxId?: string;
        taxForm?: string;
        validFrom?: string;
        validUntil?: string | null;
    }
) => {
    const existingResult = await pool.query(
        `
        SELECT
            id,
            tax_id,
            tax_form,
            valid_from,
            valid_until
        FROM vendor_tax_profiles
        WHERE id = $1
          AND vendor_id = $2
        `,
        [taxProfileId, vendorId]
    );

    if (existingResult.rows.length === 0) {
        throw new AppError(
            "TAX_PROFILE_NOT_FOUND",
            "Tax profile not found",
            404
        );
    }

    const existing = existingResult.rows[0];

    const taxId = data.taxId ?? existing.tax_id;
    const taxForm = data.taxForm ?? existing.tax_form;
    const validFrom = data.validFrom ?? existing.valid_from;
    const validUntil =
        data.validUntil !== undefined
            ? data.validUntil
            : existing.valid_until;

    const overlapResult = await pool.query(
        `
        SELECT id
        FROM vendor_tax_profiles
        WHERE vendor_id = $1
          AND id <> $2
          AND valid_from <= COALESCE($4::date, '9999-12-31'::date)
          AND COALESCE(valid_until, '9999-12-31'::date) >= $3::date
        `,
        [
            vendorId,
            taxProfileId,
            validFrom,
            validUntil
        ]
    );

    if (overlapResult.rows.length > 0) {
        throw new AppError(
            "TAX_PROFILE_OVERLAP",
            "Tax profile validity period overlaps with an existing profile",
            400
        );
    }

    const result = await pool.query(
        `
        UPDATE vendor_tax_profiles
        SET
            tax_id = $1,
            tax_form = $2,
            valid_from = $3,
            valid_until = $4,
            updated_at = NOW()
        WHERE id = $5
          AND vendor_id = $6
        RETURNING
            id,
            vendor_id,
            tax_id,
            tax_form,
            valid_from,
            valid_until,
            created_at,
            updated_at
        `,
        [
            taxId,
            taxForm,
            validFrom,
            validUntil,
            taxProfileId,
            vendorId
        ]
    );

    return result.rows[0];
};