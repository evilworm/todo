import {
  Column,
  Entity,
  Generated,
  OneToMany,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { Item } from './item.entity';

@Entity()
export class Todo {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  name: string;

  @Column()
  @Generated('uuid')
  uuid: string;

  @Column({
    nullable: false,
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;

  @Column({
    nullable: true,
    type: 'datetime',
    precision: 3,
    default: () => 'NULL',
  })
  deletedAt: Date | null;

  @OneToMany(() => Item, (item) => item.todo)
  items: Item[];
}
