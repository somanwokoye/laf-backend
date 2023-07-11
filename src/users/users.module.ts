import { Module } from '@nestjs/common';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { User } from './models/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Item } from 'src/items/models/item.entity';

@Module({
  imports: [TypeOrmModule.forFeature([User, Item])],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
