import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TheatreAdmin, TheatreAdminStatus } from '../../entities';
import {
  throwError,
  PaginatedResponse,
  encryptId,
  decryptId,
  ROLES,
} from '@moviebooking/common';
import { IdentityClient } from '../../clients/identity.client';
import { CreateTheatreAdminDto } from './dto/create-theatre-admin.dto';
import { UpdateTheatreAdminStatusDto } from './dto/update-theatre-admin-status.dto';
import { ListTheatreAdminsQueryDto } from './dto/list-theatre-admins-query.dto';

@Injectable()
export class TheatreAdminsService {
  constructor(
    @InjectRepository(TheatreAdmin)
    private readonly theatreAdminRepository: Repository<TheatreAdmin>,
    private readonly identityClient: IdentityClient,
  ) {}

  async create(dto: CreateTheatreAdminDto) {
    const userId = decryptId(dto.userId);
    const theatreId = decryptId(dto.theatreId);

    if (!userId || !theatreId) {
      throwError('VALIDATION_ERROR', 'Invalid encrypted ID');
    }

    // Validate user has THEATRE_ADMIN role via Identity Service
    const user = await this.identityClient.getUserById(userId);
    
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

    // Reload with theatre relation
    const full = await this.theatreAdminRepository.findOne({
      where: { id: saved.id },
      relations: ['theatre'],
    });

    return this.mapResponse(full!, user);
  }

  async findAll(query: ListTheatreAdminsQueryDto) {
    const { page = 1, pageSize = 20 } = query;

    const [assignments, total] = await this.theatreAdminRepository.findAndCount({
      relations: ['theatre'],
      order: { createdAt: 'DESC' },
      skip: (page - 1) * pageSize,
      take: pageSize,
    });

    // Batch fetch user data from Identity Service
    const userIds = [...new Set(assignments.map((a) => a.userId))];
    const users = await this.identityClient.getUsersByIds(userIds);
    const userMap = new Map(users.map((u) => [u.id, u]));

    return new PaginatedResponse(
      assignments.map((a) => this.mapResponse(a, userMap.get(a.userId) ?? null)),
      total,
      page,
      pageSize,
    );
  }

  async updateStatus(id: number, dto: UpdateTheatreAdminStatusDto) {
    const assignment = await this.theatreAdminRepository.findOne({
      where: { id },
      relations: ['theatre'],
    });

    if (!assignment) {
      throwError('NOT_FOUND', 'Theatre admin assignment not found');
    }

    assignment.status = dto.status;
    const updated = await this.theatreAdminRepository.save(assignment);

    // Fetch user data from Identity Service
    const user = await this.identityClient.getUserById(updated.userId);
    return this.mapResponse(updated, user);
  }

  private mapResponse(
    assignment: TheatreAdmin,
    user?: { id: number; name: string; email: string; role: { name: string } } | null,
  ) {
    return {
      id: encryptId(assignment.id),
      theatre: assignment.theatre
        ? {
            id: encryptId(assignment.theatre.id),
            name: assignment.theatre.name,
            city: assignment.theatre.city,
          }
        : null,
      user: user
        ? {
            id: encryptId(user.id),
            name: user.name,
            email: user.email,
            role: user.role?.name,
          }
        : null,
      status: assignment.status,
      createdAt: assignment.createdAt,
    };
  }
}
