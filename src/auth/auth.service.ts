import { Injectable } from '@nestjs/common';
import { HttpAdapterHost } from '@nestjs/core';
import { UsersService } from 'src/users/users.service';
import * as bcrypt from 'bcrypt';
import { User } from 'src/users/models/user.entity';
import { AuthTokenPayload, Reply, Request } from 'src/global/custom.interfaces';
import { SignOptions } from 'jsonwebtoken';
import jwt_decode from 'jwt-decode';
import { FastifyInstance } from 'fastify';
import { API_VERSION, jwtConstants } from 'src/global/app.settings';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private adapterHost: HttpAdapterHost, //note that HttpAdapterHost has to be imported from @nestjs/core.
  ) {}

  /**
   * this function will be called each time a user is to be validated on the basis of primaryEmailAddress and password
   * It takes for granted that the password stored in database is hashed with bcrypt and the password being passed here
   * is a plain password, received from the client request, hopefully through a secure tls channel
   * @param email
   * @param password
   */
  async validateUser(email: string, passwordPlainText: string): Promise<any> {
    try {
      const user = await this.usersService.findByPrimaryEmailAddress(email);
      if (user) {
        //use bcrypt to compare plaintext password and the hashed one in database
        const isPasswordMatched = await bcrypt.compare(
          passwordPlainText,
          user.passwordHash,
        );

        if (!isPasswordMatched) {
          return null;
        }

        //read off passwordHash, tokens, etc. so that they are not carried around with user object.
        const {
          passwordHash,
          passwordSalt,
          resetPasswordToken,
          primaryEmailVerificationToken,
          backupEmailVerificationToken,
          emailVerificationTokenExpiration,
          otpSecret,
          refreshTokenHash,
          ...restOfUserFields
        } = user;

        return restOfUserFields;
      } else {
        return null;
      }
    } catch (error) {
      console.log(error);
      return null;
    }
  }

  /**
   * @param user
   */
  async login(user: User, req: Request, reply: Reply) {
    //the req and reply here is because of multitenancy
    //
    const access_token = await this.createAccessToken(user, req, reply);

    //we need to generate refresh token, save to database and send it with the primary access_token
    const refresh_token = await this.createRefreshToken(user, req, reply);

    //below we return both tokens in an object
    return {
      access_token,
      refresh_token,
    };
  }

  /**
   * Called when access_token has expired and client needs to renew
   * @param user
   * @param req
   * @param reply
   * @returns
   */
  async refresh(user: User, req: Request, reply: Reply) {
    //no need to send back refreshToken. Client already has it
    //We just need to refresh the accessToken. No creation of new refreshToken and saving to database is required.
    const access_token = await this.createAccessToken(user, req, reply);

    return {
      access_token,
    };
  }

  /**
   * This is also a login module like above. But it is for returning tokens in cookie.
   * Suitable for Web browser access. Invoked from loginweb in AuthController!
   * @param user
   */
  async loginAndReturnCookies(user: User, req: Request, reply: Reply) {
    const access_token = await this.createAccessToken(user, req, reply);
    const accessTokenCookie = `Authentication=${access_token}; HttpOnly; Path=/; Max-Age=${jwtConstants.SECRET_KEY_EXPIRATION}`;
    const refresh_token = await this.createRefreshToken(user, req, reply);
    const refreshTokenCookie = `Refresh=${refresh_token}; HttpOnly; Path=/; Max-Age=${jwtConstants.REFRESH_SECRET_KEY_EXPIRATION}`;
    //return the two cookies in an array.
    return [accessTokenCookie, refreshTokenCookie];
  }

  /**
   * Invoked by login to create token for user
   * @param user
   * @param req
   * @param reply
   * @returns
   */
  async createAccessToken(user: User, req: Request, reply: Reply) {
    /**
     * Here you decide what should be returned along with the standard exp and iat. See https://scotch.io/tutorials/the-anatomy-of-a-json-web-token
     * The sub is the conventional name for packaging the subject of the token. You can put there
     * whatever user data will be useful for setting up your control guards, etc. See mine below.
     * I created AccessTokenPayload as interface for it.
     */
    const payload: AuthTokenPayload = {
      username: user.primaryEmailAddress,
      sub: {
        id: user.id,
        //landlord: user.landlord,
        firstName: user.firstName,
        lastName: user.lastName,
        /* roles: user.roles.map((role) => {
          return role.name;
        }), */
      },
    };

    //get the instance of fastifyAdapter from nestjs. See https://docs.nestjs.com/faq/http-adapter
    const fastifyInstance: FastifyInstance =
      this.adapterHost.httpAdapter.getInstance();

    // eslint-disable-next-line @typescript-eslint/no-unused-vars, prefer-const
    let altOptions: SignOptions = Object.assign(
      {},
      { ...fastifyInstance.jwt.options.sign },
    );

    altOptions.issuer = 'somanwokoye';
    altOptions.expiresIn = jwtConstants.SECRET_KEY_EXPIRATION;

    const access_token = await reply.jwtSign(payload, altOptions);
    return access_token;
  }

  /**
   * refresh is used to generate a refresh token, saved to database and returned. It is called from login above
   * @param user
   */

  async createRefreshToken(user: User, req: Request, reply: Reply) {
    /**
     * Here you decide what should be returned along with the standard exp and iat. See https://scotch.io/tutorials/the-anatomy-of-a-json-web-token
     * The sub is the conventional name for packaging the subject of the token. You can put there
     * whatever user data will be useful for setting up your control guards, etc. See mine below.
     * I created AccessTokenPayload as interface for it.
     */
    const payload: AuthTokenPayload = {
      username: user.primaryEmailAddress,
      sub: {
        id: user.id,
        //landlord: user.landlord,
        firstName: user.firstName,
        lastName: user.lastName,
        /* roles: user.roles.map((role) => {
          return role.name;
        }), */
      },
    };

    //get the instance of fastifyAdapter from nestjs. See https://docs.nestjs.com/faq/http-adapter
    const fastifyInstance: FastifyInstance =
      this.adapterHost.httpAdapter.getInstance();

    // eslint-disable-next-line prefer-const
    let altOptions: SignOptions = Object.assign(
      {},
      { ...fastifyInstance.jwt.options.sign },
    );
    altOptions.issuer = 'somanwokoye';
    altOptions.expiresIn = jwtConstants.REFRESH_SECRET_KEY_EXPIRATION;
    const refresh_token = await reply.jwtSign(payload, altOptions);
    //save it to database before return. //Note: it will be more efficient to have used redis cache
    await this.usersService.setRefreshTokenHash(refresh_token, user.id);

    return refresh_token;
  }

  /**
   * Equivalent of validateUser above as this does not require username and password but only refreshToken, to validate the user
   * But called by the strategy to do validation before return
   * @param refreshToken
   * @param userId
   */
  async validateRefreshToken(
    refreshToken: string,
    userId: number,
    req: Request,
  ) {
    //I created the findById in UsersService for this purpose and included addSelect for the refreshTokenHash
    const user = await this.usersService.findById(userId); //Note: it will be more efficient to have used redis cache

    const isRefreshTokenMatched = await bcrypt.compare(
      refreshToken,
      user.refreshTokenHash,
    );

    if (isRefreshTokenMatched) {
      const {
        passwordHash,
        passwordSalt,
        resetPasswordToken,
        primaryEmailVerificationToken,
        backupEmailVerificationToken,
        emailVerificationTokenExpiration,
        otpSecret,
        refreshTokenHash,
        ...restOfUserFields
      } = user;

      return restOfUserFields;
    } else {
      return null; //invalid refresh token
    }
  }

  /**
   * Logout user
   * @param req
   * @returns
   */
  async logout(req: Request) {
    const redirectUrl = `/${API_VERSION}`;
    try {
      const accessToken = req.headers.authorization;
      //get the user from the accessToken
      const decodedAccessToken: AuthTokenPayload = jwt_decode(
        accessToken,
      ) as AuthTokenPayload;
      const userId = decodedAccessToken.sub.id;
      await this.usersService.updateUser(userId, { refreshTokenHash: null });
      return redirectUrl; //return where the client should redirect to. This can be a setting.
    } catch (error) {
      //throw new InternalServerErrorException(error.message);
      console.log(error.message);
      //simply go to homepage rather than throw error
      return redirectUrl;
    }
  }
}
