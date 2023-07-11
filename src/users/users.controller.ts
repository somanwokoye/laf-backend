import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
  Req,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { User } from './models/user.entity';
import { UpdateUserDto } from './dtos/update/updateUserdto';
import { InsertResult, UpdateResult } from 'typeorm';
import { Request } from 'src/global/custom.interfaces';
import { CreateUserDtos } from './dtos/create/createUserdto';

@Controller('users')
export class UsersController {
  /**
   *
   * @param usersService
   */
  constructor(private readonly usersService: UsersService) {}

  /**READ section */
  /**
   * Get all users. Returns an array of users found and the total number of users
   * @param query May contain findOptions
   */
  @Get()
  findAll(@Query() query: string): Promise<[User[], number]> {
    for (const queryKey of Object.keys(query)) {
      if (queryKey == 'findOptions') {
        return this.usersService.findAllWithOptions(decodeURI(query[queryKey]));
      }
    }

    return this.usersService.findAll();
  }

  /**
   * Find user by id
   * @param id
   *
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<User> {
    return this.usersService.findOne(id);
  }

  /**
   * Post a single user
   * @param createUserDto
   * @param req
   */
  @Post()
  //TODO: still to find out why CreateUserDto as type is failing below. I am using User meanwhile
  create(@Body() createUserDto: User, @Req() req: Request): Promise<User> {
    return this.usersService.create(createUserDto, req);
  }

  /**
   * Post multiple users
   * @param createUserDtos
   * @param req
   */
  @Post('insert')
  insert(
    @Body() createUserDtos: CreateUserDtos,
    @Req() req: Request,
  ): Promise<InsertResult> {
    return this.usersService.insertUsers(createUserDtos.dtos, req);
  }

  /**
   * Do partial update of a user.
   * @param id The user id
   * @param updateUserDto This dto does not contain user id. Deconstruct in usersService
   */

  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    return this.usersService.update(id, updateUserDto);
  }

  /**
   *
   * @param user
   * Non-partial update. Takes a full tenant without param.
   */

  @Put()
  save(@Body() user: User): Promise<User> {
    return this.usersService.save(user);
  }

  /**
   * Delete a user with the given id
   * @param id
   */

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.usersService.delete(id);
  }

  /*Some user perculiarities*/
  /**
   * Set the password of a user with userId
   * @param userId
   * @param password
   */
  @Patch(':userId/set-password')
  setUserPassword(
    @Param('userId', ParseIntPipe) userId: number,
    @Body() password: string,
  ): Promise<UpdateResult> {
    return this.usersService.setUserPassword(userId, password);
  }

  //

  //
}
