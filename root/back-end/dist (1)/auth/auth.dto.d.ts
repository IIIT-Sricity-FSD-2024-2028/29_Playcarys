export declare class SessionPingDto {
    user_id: number;
    session_token: string;
}
export declare class ForgotPasswordDto {
    email: string;
    role_id?: number;
}
export declare class ResetPasswordDto {
    email: string;
    code: string;
    new_password: string;
    role_id?: number;
}
export declare class LoginDto {
    email?: string;
    username?: string;
    password: string;
    role_id?: number;
    force?: boolean;
}
export declare class ChangePasswordDto {
    user_id: number;
    current_password: string;
    new_password: string;
}
export declare class RegisterDto {
    user_name: string;
    email: string;
    password: string;
    role_id?: number;
}
