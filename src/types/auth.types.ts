
export interface AuthUser {
    userId: number;
    role: "ADMIN" | "FINANCE" | "VENDOR";
    vendorId: number | null;
}