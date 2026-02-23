import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Role } from '../../entities';

@Injectable()
export class RolesService {
  constructor(
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll() {
    const roles = await this.roleRepository.find({
      order: { id: 'ASC' },
    });

    return roles.map((role) => ({
      id: role.id,
      code: role.code,
      name: role.name,
    }));
  }
}
