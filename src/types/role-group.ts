


import { UserRole } from "./auth.types.js";

export const all = [
    UserRole.ADMIN,
    UserRole.FINANCE,
    UserRole.VENDOR
];

export const staff = [
    UserRole.ADMIN,
    UserRole.FINANCE
];

export const vendor = [
    UserRole.VENDOR
];