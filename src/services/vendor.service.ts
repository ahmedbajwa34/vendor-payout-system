

import pool from "../db/pool.js";

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