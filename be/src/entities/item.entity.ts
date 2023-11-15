import { Column, Entity, ManyToOne, PrimaryGeneratedColumn } from 'typeorm';
import { Todo } from './todo.entity';

@Entity()
export class Item {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ default: '' })
  name: string;

  @ManyToOne(() => Todo, (todo) => todo.items, { nullable: false })
  todo: Todo;

  @Column({ nullable: true, default: () => 'NULL' })
  parentId: number;

  @Column({ type: 'numeric', nullable: true, default: () => 'NULL' })
  afterId: number | null;

  @Column({ nullable: false, default: 0 })
  done: boolean;

  @Column({
    nullable: true,
    type: 'decimal',
    precision: 10,
    scale: 2,
    default: () => 'NULL',
  })
  cost: string | null;

  @Column({
    nullable: false,
    type: 'datetime',
    precision: 3,
    default: () => 'CURRENT_TIMESTAMP(3)',
  })
  createdAt: Date;
}
