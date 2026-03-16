import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatreAdmin, TheatreAdminStatus } from '../../entities';
import { User, Role } from '@moviebooking/database';
import {
  throwError,
  PaginatedResponse,
  encryptId,
  decryptId,
  ROLES,
} from '@moviebooking/common';
import { CreateTheatreAdminDto } from './dto/create-theatre-admin.dto';
import { UpdateTheatreAdminStatusDto } from './dto/update-theatre-admin-status.dto';
import { ListTheatreAdminsQueryDto } from './dto/list-theatre-admins-query.dto';

@Injectable()
export class TheatreAdminsService {
  constructor(
    @InjectRepository(TheatreAdmin)
    private readonly theatreAdminRepository: Repository<TheatreAdmin>,
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async create(dto: CreateTheatreAdminDto) {
    const userId = decryptId(dto.userId);
    const theatreId = decryptId(dto.theatreId);

    if (!userId || !theatreId) {
      throwError('VALIDATION_ERROR', 'Invalid encrypted ID');
    }

    // Validate user has THEATRE_ADMIN role
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    if (user.role?.code !== ROLES.THEATRE_ADMIN) {
      throwError('BUSINESS_RULE_VIOLATION', 'User must have THEATRE_ADMIN role');
    }

    // Check no existing ACTIVE assignment
    const existing = await this.theatreAdminRepository.findOne({
      where: { userId, status: TheatreAdminStatus.ACTIVE },
    });

    if (existing) {
      throwError('DUPLICATE_RESOURCE', 'User already has an active theatre assignment');
    }

    const assignment = this.theatreAdminRepository.create({
      userId,
      theatreId,
      status: TheatreAdminStatus.ACTIVE,
    });

    const saved = await this.theatreAdminRepository.save(assignment);

    // Reload with relations
    const full = await this.theatreAdminRepository.findOne({
      where: { id: saved.id },
      relations: ['theatre', 'user', 'user.role'],
    });

    return this.mapResponse(full!);
  }

  async findAll(query: ListTheatreAdminsQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const [assignments, total] = await this.theatreAdminRepository.findAndCount({
      relations: ['theatre', 'user', 'user.role'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    return new PaginatedResponse(
      assignments.map((a) => this.mapResponse(a)),
      total,
      page,
      pageSize,
    );
  }

  async updateStatus(id: number, dto: UpdateTheatreAdminStatusDto) {
    const assignment = await this.theatreAdminRepository.findOne({
      where: { id },
      relations: ['theatre', 'user', 'user.role'],
    });

    if (!assignment) {
      throwError('NOT_FOUND', 'Theatre admin assignment not found');
    }

    assignment.status = dto.status;
    const updated = await this.theatreAdminRepository.save(assignment);
    return this.mapResponse(updated);
  }

  private mapResponse(assignment: TheatreAdmin) {
    return {
      id: encryptId(assignment.id),
      theatre: assignment.theatre
        ? {
            id: encryptId(assignment.theatre.id),
            name: assignment.theatre.name,
            city: assignment.theatre.city,
          }
        : null,
      user: assignment.user
        ? {
            id: encryptId(assignment.user.id),
            name: assignment.user.name,
            email: assignment.user.email,
            role: assignment.user.role?.name,
          }
        : null,
      status: assignment.status,
      createdAt: assignment.createdAt,
    };
  }
}
