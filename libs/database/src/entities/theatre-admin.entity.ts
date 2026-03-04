import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from './base.entity';
import { Theatre } from './theatre.entity';
import { User } from './user.entity';
import { TheatreAdminStatus } from '../enums';

@Entity('theatre_admins')
export class TheatreAdmin extends BaseEntity {
  @Column({ name: 'theatre_id' })
  theatreId: number;

  @ManyToOne(() => Theatre)
  @JoinColumn({ name: 'theatre_id' })
  theatre: Theatre;

  @Column({ name: 'user_id' })
  userId: number;

  @ManyToOne(() => User)
  @JoinColumn({ name: 'user_id' })
  user: User;

  @Column({
    type: 'varchar',
    length: 20,
    default: TheatreAdminStatus.ACTIVE,
  })
  status: TheatreAdminStatus;
}
