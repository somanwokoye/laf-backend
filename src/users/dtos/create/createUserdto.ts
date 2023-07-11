import { IsEmail, IsNotEmpty } from 'class-validator';

export class CreateUserDto {
  @IsNotEmpty()
  readonly firstName: string;

  readonly middleName?: string;

  @IsNotEmpty()
  readonly lastName: string;

  readonly commonName?: string;

  //readonly isActive?: boolean;

  @IsNotEmpty()
  @IsEmail()
  readonly primaryEmailAddress: string;

  @IsEmail()
  readonly backupEmailAddress?: string;

  readonly isPrimaryEmailAddressVerified?: boolean;

  readonly passwordSalt?: string;

  @IsNotEmpty()
  passwordHash: string; //not readonly because it will be replaced by hash in the insertusers function

  readonly isPasswordChangeRequired?: boolean;
}
export class CreateUserDtos {
  dtos: CreateUserDto[];
}
