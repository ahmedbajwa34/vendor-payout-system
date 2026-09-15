

import pool from "../db/pool.js";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";

export const registerUser = async (data: {
    vendor: {
        name: string;
        email: string;
        phone?: string;
    };
    user: {
        name: string;
        email: string;
        password: string;
    };
}) => {
    const client = await pool.connect();

    try {
        await client.query("BEGIN");

        // 1. Create vendor
        const vendorResult = await client.query(
            `
            INSERT INTO vendors
                (name, email, phone)
            VALUES
                ($1, $2, $3)
            RETURNING id, name, email, phone, status, created_at
            `,
            [
                data.vendor.name,
                data.vendor.email,
                data.vendor.phone ?? null
            ]
        );

        const vendor = vendorResult.rows[0];

        // 2. Hash password
        const passwordHash = await bcrypt.hash(
            data.user.password,
            10
        );

        // 3. Create first user for this vendor
        const userResult = await client.query(
            `
            INSERT INTO users
                (name, email, password_hash, role, vendor_id)
            VALUES
                ($1, $2, $3, 'VENDOR', $4)
            RETURNING id, name, email, role, vendor_id, created_at
            `,
            [
                data.user.name,
                data.user.email,
                passwordHash,
                vendor.id
            ]
        );

        const user = userResult.rows[0];

        // 4. Everything succeeded
        await client.query("COMMIT");

        return {
            vendor,
            user
        };

    } catch (error) {
        // Something failed → undo everything
        await client.query("ROLLBACK");
        throw error;

    } finally {
        // Always return connection to pool
        client.release();
    }
};


export const loginUser = async(
    email: string,
    password: string
) => {
    const result = await pool.query(
        `SELECT id, email, password_hash, role, vendor_id
         FROM users
         WHERE email = $1`,
         [email]
    )

    if (result.rows.length === 0) {
    throw new Error("Invalid email or password");
    }
       const user = result.rows[0];

    const passwordMatch = await bcrypt.compare(
        password,
        user.password_hash
    );

    if (!passwordMatch) {
        throw new Error("Invalid email or password");
    }

    console.log("SIGN SECRET:", process.env.JWT_SECRET);
      const token = jwt.sign(
    {
        userId: user.id,
        role: user.role,
        vendorId: user.vendor_id
    },
    process.env.JWT_SECRET!,
    {
        expiresIn: "1h"
    }
);
    return {
        token
    }


}