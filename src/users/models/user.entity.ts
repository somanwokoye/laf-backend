import { BaseAbstractEntity } from 'src/global/base-abstract-entity';
import { Column, Index } from 'typeorm';

export class User extends BaseAbstractEntity {
  @Column()
  firstName: string;

  @Column({ nullable: true })
  middleName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  commonName: string;

  /* @Column({ default: true })
  isActive: boolean; */

  @Column({ unique: true })
  @Index()
  primaryEmailAddress: string;

  @Column({ nullable: true })
  backupEmailAddress: string;

  @Column({ default: false })
  isPrimaryEmailAddressVerified: boolean;

  @Column({ nullable: true })
  passwordSalt: string;

  @Column({ select: false }) //don't select password whenever user is called. See https://typeorm.io/#/select-query-builder/hidden-columns
  passwordHash: string;

  //token to be generated when password change request is made
  @Column({ unique: true, nullable: true })
  resetPasswordToken: string;

  @Column({ nullable: true })
  resetPasswordExpiration: Date;

  @Column({ nullable: true })
  primaryEmailVerificationToken: string;
}
