import { AuthRepository } from './auth.repository';
import { LoginDto, RegisterDto } from './auth.dto';
export declare class AuthService {
    private readonly authRepository;
    constructor(authRepository: AuthRepository);
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
