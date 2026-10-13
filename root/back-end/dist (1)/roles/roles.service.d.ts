import { RolesRepository } from './roles.repository';
export declare class RolesService {
    private readonly rolesRepository;
    constructor(rolesRepository: RolesRepository);
    findAll(): import("../data/store").Role[];
    findOne(id: number): import("../data/store").Role;
}
