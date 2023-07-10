import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { InjectConnection, InjectRepository } from '@nestjs/typeorm';
import { Connection, Repository, UpdateResult } from 'typeorm';
import { User } from './models/user.entity';
import * as bcrypt from 'bcrypt';
import { CreateUserDto } from './dtos/create/createUserdto';
import { PG_UNIQUE_CONSTRAINT_VIOLATION } from 'src/global/error.codes';
import { UpdateUserDto } from './dtos/update/updateUserdto';
import { randomBytes } from 'crypto';
import { Reply, Request } from 'src/global/custom.interfaces';
import { GenericBulmaNotificationResponseDto } from 'src/global/generic.dto';
import {
  API_VERSION,
  APP_NAME,
  AUTO_SEND_CONFIRM_EMAIL,
  EMAIL_VERIFICATION_EXPIRATION,
  PASSWORD_RESET_EXPIRATION,
  PROTOCOL,
  USE_API_VERSION_IN_URL,
  confirmEmailMailOptionSettings,
  mailSender,
  resetPasswordMailOptionSettings,
} from 'src/global/app.settings';
import { SendMailOptions } from 'nodemailer';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User) private userRepository: Repository<User>,
    @InjectConnection('default') //You can inject connection by name. See https://docs.nestjs.com/techniques/database#multiple-databases
    private connection: Connection,
  ) {}

  /** READ section
   */
  /**
   * You can set options e.g. fields, relations to be returned etc. See https://typeorm.io/#/find-options
   */

  async findAllWithOptions(findOptions: string): Promise<[User[], number]> {
    try {
      return await this.userRepository.findAndCount(JSON.parse(findOptions));
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing users data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findAll(): Promise<[User[], number]> {
    try {
      return await this.userRepository.findAndCount({
        cache: {
          id: 'users',
          milliseconds: 25000,
        },
      });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing users data: ${error.message}`,
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
  async findOne(id: number): Promise<User> {
    try {
      return await this.userRepository.findOne({ where: { id } });
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem accessing user data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /*CREATE section*/

  /**
   *
   * @param createUserDto
   */
  async create(createUserDto: CreateUserDto, req: Request): Promise<User> {
    try {
      const newUser = this.userRepository.create(createUserDto);
      //hash the password in dto
      await bcrypt.hash(newUser.passwordHash, 10).then((hash: string) => {
        newUser.passwordHash = hash;
      });
      const user = await this.userRepository.save(newUser);

      //remove any cache named users
      await this.connection.queryResultCache.remove(['users']);

      //call confirmEmailRequest() without await.
      if (AUTO_SEND_CONFIRM_EMAIL)
        this.confirmEmailRequest(user.primaryEmailAddress, null, true, req);
      return user;
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem with user creation: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem with user creation: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /*UPDATE section*/

  async update(id: number, user: UpdateUserDto): Promise<UpdateResult> {
    try {
      /*
            if (user.passwordHash != '') { //new password was sent. Not ideal though. There should be a different process for updating password
                await bcrypt.hash(user.passwordHash, 10).then((hash: string) => {
                    user.passwordHash = hash
                })
            }*/
      //exclude user password, if any. Password should be edited either by user setPassword or admin resetPassword
      const { passwordHash, ...userToSave } = user;
      //console.log(JSON.stringify(userToSave));
      const updateResult = await this.userRepository.update(id, {
        ...userToSave,
      });

      return updateResult;
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating user data: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating user data: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /**
   *
   * @param user
   * No partial update allowed here. Saves the user object supplied
   */
  async save(user: User): Promise<User> {
    try {
      /*
            if (user.passwordHash && user.passwordHash != '') { //new password was sent. Not ideal though. There should be a different process for updating password
                await bcrypt.hash(user.passwordHash, 10).then((hash: string) => {
                    user.passwordHash = hash
                })
            }*/
      //exclude user password if any. Password should be edited either by user setPassword or admin resetPassword
      const { passwordHash, ...userToSave } = user;
      //console.log(JSON.stringify(userToSave));
      const updatedUser = await this.userRepository.save({ ...userToSave });
      //update search index before return
      //this.usersSearchService.update(userToSave as User);

      //remove any cache named users
      //await this.connection.queryResultCache.remove(['users']);
      return updatedUser;
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating user: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating user: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  //Let's also do partial update using query builder. Also more efficient
  async updateUser(
    userId: number,
    updateUserDto: UpdateUserDto,
  ): Promise<UpdateResult> {
    try {
      /*
            if (updateUserDto.passwordHash != '') { //new password was sent. Not ideal though. There should be a different process for updating password
                await bcrypt.hash(updateUserDto.passwordHash, 10).then((hash: string) => {
                    updateUserDto.passwordHash = hash
                })
            }*/
      //exclude user password, if any. Password should be edited either by user setPassword or admin resetPassword
      const { passwordHash, ...userToSave } = updateUserDto;
      const updateResults = await this.userRepository
        .createQueryBuilder()
        .update(User)
        .set({ ...userToSave })
        .where('id = :id', { id: userId })
        .execute();
      //update search index before return
      //this.usersSearchService.update(await this.getUserForIndexing(userId));

      //remove any cache named users
      await this.connection.queryResultCache.remove(['users']);

      return updateResults;
    } catch (error) {
      if (error && error.code === PG_UNIQUE_CONSTRAINT_VIOLATION) {
        throw new HttpException(
          {
            status: HttpStatus.BAD_REQUEST,
            error: `There was a problem updating user: : ${error.message}`,
          },
          HttpStatus.BAD_REQUEST,
        );
      } else {
        throw new HttpException(
          {
            status: HttpStatus.INTERNAL_SERVER_ERROR,
            error: `There was a problem updating user: ${error.message}`,
          },
          HttpStatus.INTERNAL_SERVER_ERROR,
        );
      }
    }
  }

  /* DELETE section */

  async delete(id: number): Promise<void> {
    try {
      await this.userRepository.delete(id);
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem deleting user data: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /*Some user perculiarities*/

  async setUserPassword(
    userId: number,
    password: string,
  ): Promise<UpdateResult> {
    try {
      await bcrypt.hash(password, 10).then((hash: string) => {
        password = hash;
      });
      return await this.userRepository
        .createQueryBuilder()
        .update()
        .set({ passwordHash: password })
        .where('id = :userId', { userId })
        .execute();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem updating user password: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByPrimaryEmailAddress(primaryEmailAddress: string): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .leftJoinAndSelect('user.roles', 'roles')
        .addSelect('user.passwordHash')
        .where('user.primaryEmailAddress = :primaryEmailAddress', {
          primaryEmailAddress,
        })
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByConfirmedPrimaryEmailAddress(
    primaryEmailAddress: string,
  ): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.primaryEmailAddress = :primaryEmailAddress', {
          primaryEmailAddress,
        })
        .andWhere(
          'user.isPrimaryEmailAddressVerified = :isPrimaryEmailAddressVerified',
          { isPrimaryEmailAddressVerified: true },
        )
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByResetPasswordToken(resetPasswordToken: string): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where('user.resetPasswordToken = :resetPasswordToken', {
          resetPasswordToken,
        })
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByPrimaryEmailVerificationToken(
    primaryEmailVerificationToken: string,
  ): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where(
          'user.primaryEmailVerificationToken = :primaryEmailVerificationToken',
          { primaryEmailVerificationToken },
        )
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findByBackupEmailVerificationToken(
    backupEmailVerificationToken: string,
  ): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .where(
          'user.backupEmailVerificationToken = :backupEmailVerificationToken',
          { backupEmailVerificationToken },
        )
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async findById(id: number): Promise<User> {
    try {
      return await this.userRepository
        .createQueryBuilder('user')
        .addSelect('user.refreshTokenHash')
        .leftJoinAndSelect('user.roles', 'roles')
        .where('user.id = :id', { id })
        .getOne();
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `There was a problem with getting user: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * This service is for handling password reset requests.
   * In principle, it should be called via the user controller endpoint reset-password-request, from the login page under auth module
   * The login page should handle the notification response as well, via ajax, just like reset-password handles its notification response via ajax
   * It uses randomBytes from crypto module to generate a unique token that will be sent to the user in
   * a URL, by email. The user has to click on that URL with the right token, to be allowed to change the password
   * For sending emails, nodemailer installation (npm install nodemailer @types/nodemailer) is required.
   *
   * @param email
   */
  async resetPasswordRequest(
    email: string,
    req: Request,
  ): Promise<GenericBulmaNotificationResponseDto> {
    try {
      const user = await this.findByPrimaryEmailAddress(email);
      //console.log(email);
      if (user) {
        //generate the token
        randomBytes(256, async (error, buf) => {
          if (error) throw error; //strange. the catch part below will handle it
          const token = buf.toString('hex');
          //console.log(token);

          //success. Continue with email containing reset message with token
          user.resetPasswordToken = token;
          user.resetPasswordExpiration = new Date(
            Date.now() + PASSWORD_RESET_EXPIRATION,
          );
          //save the updated user
          await this.userRepository.save(user);

          //construct and send email using nodemailer
          const globalPrefixUrl = USE_API_VERSION_IN_URL
            ? `/${API_VERSION}`
            : '';
          const url = `${req.protocol || PROTOCOL}://${
            req.hostname
          }${globalPrefixUrl}/users/reset-password/${token}`;
          const mailText = resetPasswordMailOptionSettings.textTemplate.replace(
            '{url}',
            url,
          );

          //console.log(mailText);

          //mailOptions
          //console.log(user.primaryEmailAddress)
          const mailOptions: SendMailOptions = {
            to: user.primaryEmailAddress,
            from: resetPasswordMailOptionSettings.from,
            subject: resetPasswordMailOptionSettings.subject,
            text: mailText,
          };

          //send mail
          /*
                    smtpTransportGmail.sendMail(mailOptions, async (error: Error) => {
                        //if (error)
                        //    throw error; //throw error that will be caught at the end?
                        if (error)
                            console.log(error);
                    });
                    */
          mailSender(mailOptions);
        });
        //console.log('message successfully sent')
        return {
          notificationClass: 'is-success',
          notificationMessage: `If your email ${email} is found, you will receive email shortly for password reset`,
        };
      } else {
        //email address not found
        //log bad request here and still respond
        return {
          notificationClass: 'is-success',
          notificationMessage: `If your email ${email} is found, you will receive email shortly for password reset`,
        };
      }
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Problem with password reset request: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   * Called to reset password from email sent with token
   * @param token
   * @param newPassword
   * @param reply
   */

  async resetPassword(
    token: string,
    newPassword: string,
    reply: Reply,
  ): Promise<any> {
    try {
      const user = await this.findByResetPasswordToken(token);
      if (user) {
        if (user.resetPasswordExpiration.valueOf() > Date.now()) {
          //token has not expired, proceed!
          if (newPassword) {
            //proceed with saving
            //hash the password in dto
            await bcrypt.hash(newPassword, 10).then((hash: string) => {
              user.passwordHash = hash;
            });
            user.resetPasswordToken = null; //clear
            //save
            await this.userRepository.save(user);
            //consider sending mail here to the user to say that password has recently been reset

            reply.view('users/reset-password.html', {
              title: `${APP_NAME} - Reset Password`,
              sendForm: false,
              notificationVisibility: '',
              notificationClass: 'is-success',
              notificationMessage: 'New password successfully saved',
            });
          } else {
            //no newPassword yet. In principle, user should be sent back to form for entering new password.
            const globalPrefixUrl = USE_API_VERSION_IN_URL
              ? `/${API_VERSION}`
              : '';
            const returnUrl = `${globalPrefixUrl}/users/reset-password/${token}`;
            //await reply.send(, {sendForm: true, token: token});//send form with token for submit url
            reply.view('users/reset-password.html', {
              title: `${APP_NAME} - Reset Password`,
              sendForm: true,
              returnUrl: returnUrl,
              notificationVisibility: 'is-hidden',
            });
          }
        } else {
          //expired token
          reply.view('users/reset-password.html', {
            title: `${APP_NAME} - Reset Password`,
            sendForm: false,
            notificationVisibility: '',
            notificationClass: 'is-danger',
            notificationMessage: 'Invalid token: expired',
          });
        }
      } else {
        //user with the sent token not found
        reply.view('users/reset-password.html', {
          title: `${APP_NAME} - Reset Password`,
          sendForm: false,
          notificationVisibility: '',
          notificationClass: 'is-danger',
          notificationMessage: 'Invalid token: not found',
        });
      }
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Problem with password reset request: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  /**
   *
   * @param email This may be sent if called after user has just been added in usersService
   * @param userId This may be sent from controller
   * @param primary
   * @param backup
   */

  async confirmEmailRequest(
    email: string = null,
    userId: number = null,
    primary: boolean,
    req: Request,
  ) {
    try {
      let user: User = null;
      if (userId != null) {
        user = await this.userRepository.findOneById(userId);
      } else {
        user = primary
          ? await this.userRepository.findOne({
              where: { primaryEmailAddress: email },
            })
          : await this.userRepository.findOne({
              where: { backupEmailAddress: email },
            });
      }
      if (user != null) {
        //generate the token (for primary or backup). See resetPasswordRequest above for ideas
        randomBytes(256, async (error, buf) => {
          if (error) throw error; //strange. the catch part below will handle it
          const token = buf.toString('hex');

          //success. Continue with email containing reset message with token
          primary
            ? (user.primaryEmailVerificationToken = token)
            : (user.backupEmailVerificationToken = token);
          user.emailVerificationTokenExpiration = new Date(
            Date.now() + EMAIL_VERIFICATION_EXPIRATION,
          );
          //save the updated user
          await this.userRepository.save(user);

          //construct and send email using nodemailer
          const globalPrefixUrl = USE_API_VERSION_IN_URL
            ? `/${API_VERSION}`
            : '';
          const url = primary
            ? `${req.protocol || PROTOCOL}://${
                req.hostname
              }${globalPrefixUrl}/users/confirm-primary-email/${token}`
            : `${req.protocol}://${req.hostname}${globalPrefixUrl}/users/confirm-backup-email/${token}`;
          const mailText = confirmEmailMailOptionSettings.textTemplate.replace(
            '{url}',
            url,
          );

          //mailOptions
          const mailOptions: SendMailOptions = {
            to: primary ? user.primaryEmailAddress : user.backupEmailAddress,
            from: confirmEmailMailOptionSettings.from,
            subject: confirmEmailMailOptionSettings.subject,
            text: mailText,
          };

          //send mail
          /*
                    smtpTransportGmail.sendMail(mailOptions, async (error: Error) => {
                        //if (error)
                        //    throw error; //throw error that will be caught at the end?
                        if (error)
                            console.log(error)
                    });
                    */
          mailSender(mailOptions);
        });
        return {
          notificationClass: 'is-info',
          notificationMessage: `If valid user, you will receive email shortly for email address confirmation`,
        };
      } else {
        //email address or user not found
        //log bad request here and still respond
        return {
          notificationClass: 'is-info',
          notificationMessage: `If valid user, you will receive email shortly for email addres confirmation`,
        };
      }
    } catch (error) {
      throw new HttpException(
        {
          status: HttpStatus.INTERNAL_SERVER_ERROR,
          error: `Problem sending email address confirmation: ${error.message}`,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  async confirmEmail(token: string, primary: boolean, reply: Reply) {
    try {
      //find user by token (primary or backup)
      let user: User = null;
      primary
        ? (user = await this.findByPrimaryEmailVerificationToken(token))
        : await this.findByBackupEmailVerificationToken(token);
      if (user) {
        if (user.emailVerificationTokenExpiration.valueOf() > Date.now()) {
          if (primary) {
            user.isPrimaryEmailAddressVerified = true;
            user.primaryEmailVerificationToken = null;
          } else {
            user.isBackupEmailAddressVerified = true;
            user.backupEmailVerificationToken = null;
          }
          user.emailVerificationTokenExpiration = null;

          await this.userRepository.save(user);

          reply.view('users/confirm-email-feedback.html', {
            title: `${APP_NAME} - Confirm Email`,
            notificationClass: 'is-success',
            notificationMessage: 'Email confirmed!',
          });
        } else {
          //expired token
          reply.view('users/confirm-email-feedback.html', {
            title: `${APP_NAME} - Confirm Email`,
            notificationClass: 'is-danger',
            notificationMessage: 'Problem confirming email. Token has expired!',
          });
        }
      } else {
        //user with the sent token not found
        reply.view(null, {
          title: `${APP_NAME} - Confirm Email`,
          notificationClass: 'is-danger',
          notificationMessage: 'Problem confirming email',
        });
      }
    } catch (error) {
      reply.view('users/confirm-email-feedback.html', {
        title: `${APP_NAME} - Confirm Email`,
        notificationClass: 'is-danger',
        notificationMessage: 'Problem confirming email!',
      });
    }
  }

  /**
   * Invoked to setRefreshTokenHash after successful login.
   * @param refreshToken
   * @param userId
   */
  async setRefreshTokenHash(refreshToken: string, userId: number) {
    const refreshTokenHash = await bcrypt.hash(refreshToken, 10);
    await this.userRepository.update(userId, {
      refreshTokenHash,
    });
  }

  //

  //
}
