import { UsersRepository } from './users.repository';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, AssignRoleDto } from './users.dto';
export declare class UsersService {
    private readonly usersRepository;
    constructor(usersRepository: UsersRepository);
    findAll(): any[];
    findOne(id: number): any;
    findByRole(roleId: number): any[];
    create(dto: CreateUserDto): any;
    update(id: number, dto: UpdateUserDto): any;
    updateStatus(id: number, dto: UpdateUserStatusDto): any;
    assignRole(id: number, dto: AssignRoleDto): any;
    remove(id: number): {
        message: string;
    };
    private ensureProfile;
    private serialize;
}
