import {
  Injectable,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, UserStatus } from '../../entities';
import { ERROR_CODES, PaginatedResponse } from '@moviebooking/common';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Role)
    private readonly roleRepository: Repository<Role>,
  ) {}

  async findAll(query: ListUsersQueryDto) {
    const { page = 1, pageSize = 20, roleCode, status, search } = query;

    const where: FindOptionsWhere<User> = {};

    if (roleCode) {
      const role = await this.roleRepository.findOne({
        where: { code: roleCode },
      });
      if (role) {
        where.roleId = role.id;
      }
    }

    if (status) {
      where.status = status;
    }

    if (search) {
      // Search by name or email
      const [users, total] = await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.role', 'role')
        .where(where)
        .andWhere('(user.name LIKE :search OR user.email LIKE :search)', {
          search: `%${search}%`,
        })
        .skip((page - 1) * pageSize)
        .take(pageSize)
        .orderBy('user.createdAt', 'DESC')
        .getManyAndCount();

      return new PaginatedResponse(
        users.map(this.mapUserResponse),
        total,
        page,
        pageSize,
      );
    }

    const [users, total] = await this.userRepository.findAndCount({
      where,
      relations: ['role'],
      skip: (page - 1) * pageSize,
      take: pageSize,
      order: { createdAt: 'DESC' },
    });

    return new PaginatedResponse(
      users.map(this.mapUserResponse),
      total,
      page,
      pageSize,
    );
  }

  async create(createUserDto: CreateUserDto) {
    const { email, password, name, roleId } = createUserDto;

    // Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throw new ConflictException({
        code: ERROR_CODES.DUPLICATE_RESOURCE,
        message: 'Email already exists',
      });
    }

    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'Role not found',
      });
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12);

    // Create user
    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
      roleId,
      status: UserStatus.ACTIVE,
    });

    const savedUser = await this.userRepository.save(user);

    // Reload with role
    const userWithRole = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });

    return this.mapUserResponse(userWithRole!);
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
    }

    return this.mapUserResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throw new NotFoundException({
        code: ERROR_CODES.NOT_FOUND,
        message: 'User not found',
      });
    }

    // Update fields
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.status !== undefined) {
      user.status = updateUserDto.status;
    }

    if (updateUserDto.roleId !== undefined) {
      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throw new NotFoundException({
          code: ERROR_CODES.NOT_FOUND,
          message: 'Role not found',
        });
      }
      user.roleId = updateUserDto.roleId;
    }

    await this.userRepository.save(user);

    // Reload with role
    const updatedUser = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    return this.mapUserResponse(updatedUser!);
  }

  private mapUserResponse(user: User) {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }
}
