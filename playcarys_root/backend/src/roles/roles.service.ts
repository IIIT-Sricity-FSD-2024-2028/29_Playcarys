import { Injectable, NotFoundException } from '@nestjs/common';
import { RolesRepository } from './roles.repository';

@Injectable()
export class RolesService {
  constructor(private readonly rolesRepository: RolesRepository) {}

  findAll() {
    return this.rolesRepository.findAll();
  }

  findOne(id: number) {
    const role = this.rolesRepository.findById(id);
    if (!role) throw new NotFoundException(`Role ${id} not found`);
    return role;
  }
}
