import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { User } from '../../entities';

export interface InternalUserResponse {
  id: number;
  name: string;
  email: string;
  role: { id: number; code: string; name: string };
}

@Injectable()
export class InternalService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  async getUserById(id: number): Promise<InternalUserResponse | null> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['role'],
    });

    if (!user) return null;
    return this.mapUser(user);
  }

  async getUsersByIds(userIds: number[]): Promise<InternalUserResponse[]> {
    if (!userIds.length) return [];

    const users = await this.userRepository.find({
      where: { id: In(userIds) },
      relations: ['role'],
    });

    return users.map((u) => this.mapUser(u));
  }

  private mapUser(user: User): InternalUserResponse {
    return {
      id: user.id,
      name: user.name,
      email: user.email,
      role: {
        id: user.role.id,
        code: user.role.code,
        name: user.role.name,
      },
    };
  }
}
