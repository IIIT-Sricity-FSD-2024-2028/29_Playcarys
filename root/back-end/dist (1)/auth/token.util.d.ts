export interface TokenPayload {
    sub: number;
    role_id: number;
    role: string;
    iat: number;
    exp: number;
}
export declare const TOKEN_TTL_MS: number;
export declare function signToken(user: {
    user_id: number;
    role_id: number;
}, roleName: string): string;
export declare function verifyToken(token: string | undefined | null): TokenPayload | null;
export declare function bearerFrom(headerValue: unknown): string | null;
