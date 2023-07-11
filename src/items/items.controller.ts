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
import { ItemsService } from './items.service';
import { CreateItemDto, CreateItemDtos } from './dto/create/createItemdto';
import { Item } from './models/item.entity';
import { InsertResult, UpdateResult } from 'typeorm';
import { UpdateItemDto } from './dto/update/updateItemdto';

@Controller('items')
export class ItemsController {
  /**
   *
   * @param itemsService
   * Inject itemsService
   */
  constructor(private readonly itemsService: ItemsService) {}
  /**
   * Create a new item
   * @param createItemDto
   * @param req
   * Handle Post request for create
   */
  @Post()
  create(@Body() createItemDto: CreateItemDto): Promise<Item> {
    return this.itemsService.create(createItemDto);
  }

  /**
   * Insert multiple new roles
   * @param createItemDtos
   * @param req
   */
  @Post('insert')
  insert(@Body() createItemDtos: CreateItemDtos): Promise<InsertResult> {
    return this.itemsService.insertItems(createItemDtos.dtos);
  }

  /**
   * Do partial update of item
   * @param id
   * @param updateItemDto
   */
  @Patch(':id')
  update(
    @Param('id', ParseIntPipe) id: number,
    @Body() updateItemDto: UpdateItemDto,
  ): Promise<UpdateResult> {
    return this.itemsService.update(id, updateItemDto);
  }

  /**
   *
   * @param item
   * Non-partial update. Takes a full item without param.
   */
  @Put()
  save(@Body() item: Item): Promise<Item> {
    return this.itemsService.save(item);
  }

  @Delete(':id')
  delete(@Param('id', ParseIntPipe) id: number) {
    return this.itemsService.delete(id);
  }

  /**READ section */
  /**
   * Handle Get request for find
   */
  @Get()
  findAll(@Query() query: string): Promise<[Item[], number]> {
    for (const queryKey of Object.keys(query)) {
      if (queryKey == 'findOptions') {
        return this.itemsService.findAllWithOptions(decodeURI(query[queryKey]));
      }
    }
    return this.itemsService.findAll();
  }

  /**
   *
   * @param id
   * Handle Get request for find by id
   */
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number): Promise<Item> {
    return this.itemsService.findOne(id);
  }
}
