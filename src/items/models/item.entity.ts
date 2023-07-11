import { BaseAbstractEntity } from 'src/global/base-abstract-entity';
import { User } from 'src/users/models/user.entity';
import { Column, Entity, Generated, ManyToOne } from 'typeorm';
import { ItemStatus } from '../../global/custom.interfaces';

@Entity()
export class Item extends BaseAbstractEntity {
  @Generated('uuid')
  @Column()
  uuid: string;

  @Column()
  itemName: string;

  @Column()
  description: string;

  @Column()
  image: string;

  @ManyToOne((type) => User, (user) => user.finderForWhichItems, {
    cascade: true,
    onUpdate: 'CASCADE',
  })
  createdBy: User;

  @Column({
    type: 'enum',
    enum: ItemStatus,
    default: ItemStatus[ItemStatus.AVAILABLE],
  })
  ItemStatus: ItemStatus;

  @Column()
  createdAt: Date | null = new Date();

  @Column()
  brand: string;

  @Column({ nullable: true })
  location: string;
}
