import { RolesService } from './roles.service';
export declare class RolesController {
    private readonly rolesService;
    constructor(rolesService: RolesService);
    findAll(): import("../data/store").Role[];
    findOne(id: number): import("../data/store").Role;
}
