export declare class CreateUserDto {
    user_name: string;
    role_id: number;
    email: string;
    password: string;
    avatar?: string;
}
export declare class UpdateUserDto {
    user_name?: string;
    role_id?: number;
    email?: string;
    password?: string;
}
export declare class UpdateUserStatusDto {
    status: 'active' | 'banned' | 'suspended';
}
export declare class AssignRoleDto {
    role_id: number;
}
