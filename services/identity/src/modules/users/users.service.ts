import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, FindOptionsWhere } from 'typeorm';
import * as bcrypt from 'bcrypt';
import { User, Role, UserStatus } from '../../entities';
import { throwError, PaginatedResponse, generateTempPassword, encryptId, decryptId } from '@moviebooking/common';
import { UpdateUserDto } from './dto/update-user.dto';
import { ListUsersQueryDto } from './dto/list-users-query.dto';
import { CreateUserDto } from './dto/create-user.dto';

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

  async create(UserDto: CreateUserDto) {
    const { email, name, roleId } = UserDto;

    // Check if email exists
    const existingUser = await this.userRepository.findOne({
      where: { email },
    });

    if (existingUser) {
      throwError('DUPLICATE_RESOURCE', 'Email already exists');
    }

    // Verify role exists
    const role = await this.roleRepository.findOne({ where: { id: roleId } });
    if (!role) {
      throwError('NOT_FOUND', 'Role not found');
    }

    // Generate temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Set password expiry to 24 hours from now
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setHours(passwordExpiresAt.getHours() + 24);

    // Create user with temp password
    const user = this.userRepository.create({
      name,
      email,
      passwordHash,
      roleId,
      status: UserStatus.ACTIVE,
      mustChangePassword: true,
      passwordExpiresAt,
    });

    const savedUser = await this.userRepository.save(user);

    // Reload with role
    const userWithRole = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['role'],
    });

    return {
      ...this.mapUserResponse(userWithRole!),
      tempPassword, // Return temp password for admin to share with user
    };
  }

  async findOne(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    return this.mapUserResponse(user);
  }

  async update(id: number, updateUserDto: UpdateUserDto) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    // Update fields
    if (updateUserDto.name !== undefined) {
      user.name = updateUserDto.name;
    }

    if (updateUserDto.status !== undefined) {
      user.status = updateUserDto.status;
    }

    if (updateUserDto.roleId !== undefined) {
      if (updateUserDto.roleId === null) {
        throwError('VALIDATION_ERROR', 'Invalid roleId format');
      }

      const role = await this.roleRepository.findOne({
        where: { id: updateUserDto.roleId },
      });
      if (!role) {
        throwError('NOT_FOUND', 'Role not found');
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
      id: encryptId(user.id),
      name: user.name,
      email: user.email,
      role: {
        id: encryptId(user.role.id),
        code: user.role.code,
        name: user.role.name,
      },
      status: user.status,
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
    };
  }

  async resetPassword(id: number) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    // Generate new temporary password
    const tempPassword = generateTempPassword();
    const passwordHash = await bcrypt.hash(tempPassword, 12);

    // Set password expiry to 24 hours from now
    const passwordExpiresAt = new Date();
    passwordExpiresAt.setHours(passwordExpiresAt.getHours() + 24);

    user.passwordHash = passwordHash;
    user.mustChangePassword = true;
    user.passwordExpiresAt = passwordExpiresAt;

    await this.userRepository.save(user);

    return {
      message: 'Password reset successfully',
      tempPassword, // Return temp password for admin to share with user
    };
  }

  async updateStatus(id: number, status: UserStatus) {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) {
      throwError('NOT_FOUND', 'User not found');
    }

    user.status = status;
    await this.userRepository.save(user);

    return this.mapUserResponse(user);
  }
}
