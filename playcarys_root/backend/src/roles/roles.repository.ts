import { Injectable } from '@nestjs/common';
import { roles, Role } from '../data/store';

@Injectable()
export class RolesRepository {
  findAll(): Role[] {
    return [...roles];
  }

  findById(role_id: number): Role | undefined {
    return roles.find((r) => r.role_id === role_id);
  }

  findByName(role_name: string): Role | undefined {
    return roles.find((r) => r.role_name === role_name);
  }
}
