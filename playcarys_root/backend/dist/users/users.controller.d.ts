import { UsersService } from './users.service';
import { CreateUserDto, UpdateUserDto, UpdateUserStatusDto, AssignRoleDto } from './users.dto';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(roleId?: string): any[];
    findOne(id: number): any;
    create(dto: CreateUserDto): any;
    update(id: number, dto: UpdateUserDto): any;
    updateStatus(id: number, dto: UpdateUserStatusDto): any;
    assignRole(id: number, dto: AssignRoleDto): any;
    remove(id: number): {
        message: string;
    };
}
