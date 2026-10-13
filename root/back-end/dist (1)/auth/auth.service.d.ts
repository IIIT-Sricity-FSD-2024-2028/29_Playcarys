import { AuthRepository } from './auth.repository';
import { ChangePasswordDto, ForgotPasswordDto, LoginDto, RegisterDto, ResetPasswordDto, SessionPingDto } from './auth.dto';
export declare class AuthService {
    private readonly authRepository;
    constructor(authRepository: AuthRepository);
    private claimSession;
    login(dto: LoginDto): {
        user_id: any;
        user_name: any;
        username: any;
        email: any;
        role: string;
        role_id: any;
        avatar: any;
        status: any;
        token: string;
        session_token: string;
    };
    forgotPassword(dto: ForgotPasswordDto): {
        status: string;
        message: string;
    };
    resetPassword(dto: ResetPasswordDto): {
        status: string;
        message: string;
    };
    changePassword(dto: ChangePasswordDto): {
        message: string;
    };
    heartbeat(dto: SessionPingDto): {
        ok: boolean;
        evicted: boolean;
        reason: string;
    } | {
        ok: boolean;
        evicted?: undefined;
        reason?: undefined;
    };
    releaseSession(dto: SessionPingDto): {
        ok: boolean;
        reason?: undefined;
    } | {
        ok: boolean;
        reason: string;
    };
    register(dto: RegisterDto): {
        message: string;
        user_id: number;
        user_name: string;
        username: string;
        email: string;
        role: string;
        role_id: number;
        avatar: string;
        status: "active" | "banned" | "suspended";
        token: string;
        session_token: string;
    };
}
