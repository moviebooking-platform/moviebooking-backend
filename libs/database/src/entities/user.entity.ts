import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Role } from './role.entity';
import { UserStatus } from '../enums';

@Entity('users')
export class User extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 255, unique: true })
  email: string;

  @Column({ type: 'varchar', length: 255, name: 'password_hash' })
  passwordHash: string;

  @Column({ name: 'role_id' })
  roleId: number;

  @ManyToOne(() => Role, (role) => role.users)
  @JoinColumn({ name: 'role_id' })
  role: Role;

  @Column({
    type: 'varchar',
    length: 20,
    default: UserStatus.ACTIVE,
  })
  status: UserStatus;

  @Column({ name: 'must_change_password', type: 'bit', default: false })
  mustChangePassword: boolean;

  @Column({ name: 'password_expires_at', type: 'datetime2', nullable: true })
  passwordExpiresAt: Date | null;

  // TheatreAdmin relationship will be added in M3
}
