import { AuthService } from './auth.service';
import { LoginDto, RegisterDto } from './auth.dto';
export declare class AuthController {
    private readonly authService;
    constructor(authService: AuthService);
    login(dto: LoginDto): {
        user_id: number;
        user_name: string;
        email: string;
        role: string;
        role_id: number;
        avatar: string;
        status: "active" | "suspended";
    };
    register(dto: RegisterDto): {
        message: string;
        user_id: number;
    };
}
