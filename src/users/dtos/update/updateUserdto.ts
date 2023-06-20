import { IsEmail } from 'class-validator';

export class UpdateUserDto {
  readonly firstName: string;

  readonly middleName?: string;

  readonly lastName: string;

  readonly commonName?: string;

  //readonly isActive?: boolean;

  @IsEmail()
  readonly primaryEmailAddress: string;

  @IsEmail()
  readonly backupEmailAddress?: string;

  readonly isPrimaryEmailAddressVerified?: boolean;

  readonly passwordSalt?: string;

  passwordHash: string; //not readonly because it will be replaced by hash in the insertusers function

  readonly isPasswordChangeRequired?: boolean;
  readonly refreshTokenHash?: string;
}
