import { Module } from '@nestjs/common';
import { ItemsController } from './items.controller';
import { ItemsService } from './items.service';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from './models/item.entity';
import { User } from 'src/users/models/user.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Item, User])],
  controllers: [ItemsController],
  providers: [ItemsService],
})
export class ItemsModule {}
