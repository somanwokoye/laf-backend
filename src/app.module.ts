import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { UsersModule } from './users/users.module';
import { AuthModule } from './auth/auth.module';
import { RolesModule } from './roles/roles.module';
import { ItemsModule } from './items/items.module';
import { ConfigModule } from '@nestjs/config';
import { DatabaseModule } from './app.database.module';

@Module({
  imports: [
    UsersModule,
    AuthModule,
    RolesModule,
    ItemsModule,
    ConfigModule.forRoot({ cache: false }),
    DatabaseModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
