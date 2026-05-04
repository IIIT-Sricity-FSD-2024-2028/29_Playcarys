import { Role } from '../data/store';
export declare class RolesRepository {
    findAll(): Role[];
    findById(role_id: number): Role | undefined;
    findByName(role_name: string): Role | undefined;
}
