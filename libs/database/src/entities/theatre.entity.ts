import { Entity, Column, OneToMany } from 'typeorm';
import { BaseEntity } from './base.entity';
import { TheatreStatus } from '../enums';

@Entity('theatres')
export class Theatre extends BaseEntity {
  @Column({ type: 'varchar', length: 255 })
  name: string;

  @Column({ type: 'varchar', length: 100 })
  city: string;

  @Column({ type: 'varchar', length: 255 })
  address: string;

  @Column({
    type: 'varchar',
    length: 20,
    default: TheatreStatus.ACTIVE,
  })
  status: TheatreStatus;

  // Relations will be added when Screen and TheatreAdmin entities are imported
  // @OneToMany(() => Screen, (screen) => screen.theatre)
  // screens: Screen[];

  // @OneToMany(() => TheatreAdmin, (admin) => admin.theatre)
  // theatreAdmins: TheatreAdmin[];
}
