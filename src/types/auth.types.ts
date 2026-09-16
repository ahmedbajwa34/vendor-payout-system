
export enum UserRole {
    ADMIN = "ADMIN",
    FINANCE = "FINANCE",
    VENDOR = "VENDOR"
}

export interface AuthUser {
    userId: number;
    role: UserRole;
    vendorId: number | null;
}

