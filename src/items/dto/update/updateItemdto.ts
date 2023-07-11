import { IsNotEmpty } from 'class-validator';
import { ItemStatus } from 'src/global/custom.interfaces';
import { CreateUserDto } from '../../../users/dtos/create/createUserdto';

export class UpdateItemDto {
  @IsNotEmpty()
  readonly itemName: string;

  readonly description: string;

  @IsNotEmpty()
  readonly image: string;

  @IsNotEmpty()
  readonly createdBy: CreateUserDto;

  readonly itemStatus: ItemStatus;

  @IsNotEmpty()
  readonly createdAt: Date | null = new Date();

  readonly brand?: string;

  readonly location: string;
}
