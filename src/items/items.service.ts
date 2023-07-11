import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';

import {
  Connection,
  DataSource,
  DeleteResult,
  Repository,
  UpdateResult,
} from 'typeorm';
import { CreateItemDto } from './dto/create/createItemdto';
import { Item } from './models/item.entity';
import { PG_UNIQUE_CONSTRAINT_VIOLATION } from 'src/global/error.codes';
import { UpdateItemDto } from './dto/update/updateItemdto';
import { CreateUserDto } from 'src/users/dtos/create/createUserdto';

@Injectable()
export class ItemsService {
  /**
   *
   * @param itemRepository
   */
  constructor(
    @InjectRepository(Item) private readonly itemRepository: Repository<Item>,
    @InjectDataSource('default')
    private connection: DataSource,
  ) {}

  /*CREATE section*/
  /**
   * @param createItemDto
   */
  // eslint-disable-next-line @typescript-eslint/no-empty-function
  async create(createItemDto: CreateItemDto): Promise<Item> {
    try {
      const newItem = this.itemRepository.create(createItemDto);
      return await this.itemRepository.save(newItem);
    } catch (error) {
      console.log(error);
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem with item creation: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem with item creation: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  //insert using query builder - more efficient than save. Can be used for single or bulk save. See https://github.com/typeorm/typeorm/blob/master/docs/insert-query-builder.md
  async insertItems(items: CreateItemDto[]) {
    try {
      const insertResult = await this.itemRepository
        .createQueryBuilder()
        .insert()
        .into(Item)
        .values(items)
        .execute();

      return insertResult;
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem with item(s) insertion: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem with item(s) insertion: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /*UPDATE section*/
  async update(id: number, item: UpdateItemDto): Promise<UpdateResult> {
    try {
      return await this.itemRepository.update(id, { ...item });
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating item data: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating item data: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   *
   * @param item
   * No partial update allowed here. Saves the role object supplied
   */
  async save(item: Item): Promise<Item> {
    try {
      return await this.itemRepository.save(item);
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating item: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  //Let's also do partial update using query builder. Also more efficient
  async updateItem(
    itemId: number,
    updateItemDto: UpdateItemDto,
  ): Promise<UpdateResult> {
    try {
      return await this.itemRepository
        .createQueryBuilder()
        .update(Item)
        .set({ ...updateItemDto })
        .where('id = :id', { id: itemId })
        .execute();
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating item: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating item: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /* DELETE section */

  async delete(id: number): Promise<void> {
    try {
      await this.itemRepository.delete(id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem deleting role data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  //query builder equivalent of delete shown above
  async deleteRole(roleId: number): Promise<DeleteResult> {
    try {
      return await this.itemRepository
        .createQueryBuilder()
        .delete()
        .from(Item)
        .where('id = :id', { id: roleId })
        .execute();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem deleting role data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /** READ section
   */
  /**
   * You can set options e.g. fields, relations to be returned etc. See https://typeorm.io/#/find-options
   */
  async findAllWithOptions(findOptions: string): Promise<[Item[], number]> {
    try {
      return await this.itemRepository.findAndCount(JSON.parse(findOptions));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing items data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<[Item[], number]> {
    try {
      return await this.itemRepository.findAndCount();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing items data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *
   * @param id
   * find one by id
   */
  async findOne(id: number): Promise<Item> {
    try {
      return await this.itemRepository.findOne({ where: { id: id } });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing item data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /*Let's work on functions to set/add and unset/remove relations. set/unset applies to x-to-one and add/remove applies to x-to-many */
  //1. Users
  async addUserById(itemId: number, userId: number): Promise<Item> {
    try {
      await this.itemRepository
        .createQueryBuilder()
        .relation(Item, 'users')
        .of(itemId)
        .add(userId);
      //return the role just updated.
      return await this.itemRepository.findOne({ where: { id: itemId } });
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem adding user to role: ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem with adding user to role: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }
}
