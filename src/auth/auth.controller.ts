import {
  Controller,
  Get,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import { Reply, Request } from 'src/global/custom.interfaces';
import { API_VERSION, APP_NAME } from 'src/global/app.settings';
import LocalAuthGuard from './guards/local-auth.guards';

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  /**
   * Below is a login form invoked when username and password need to be supplied in a Web from, for login from browser
   * @param reply
   */
  @Get('login')
  loginForm(@Res() reply: Reply, @Query() query: string) {
    //get the next param and pass to login.html for rendering below
    const next = query['next'];
    reply.view('auth/login.html', {
      apiVersion: API_VERSION !== null ? `${API_VERSION}` : '',
      loginUrl:
        API_VERSION !== null ? `/${API_VERSION}/auth/login` : '/auth/login',
      forgotPasswordUrl:
        API_VERSION !== null
          ? `/${API_VERSION}/users/reset-password-request`
          : '/users/reset-password-request',
      title: APP_NAME,
      loginActive: 'true',
      next: next ? next : `/${API_VERSION}`,
    });
  }

  /**
 *This route can be used for for ajax basic authentication login Post call. 
     e.g. curl -X POST http://localhost:3001/v1/auth/login -d '{"username": "sochukwuman@gmail.com", "password": "password"}' -H "Content-Type: application/json"
     or from fetch() or axios(), etc.
     On success here, redirect is handled by the client
     * @param req 
     * @param reply
     */
  @UseGuards(LocalAuthGuard) //LocalAuthGuard was defined in auth/guards/local-auth.guard.ts. Check it out
  @Post('login') //this does not conflict with the login url for displaying login form. That is a Get and this is a Post.
  async login(@Req() req: Request, @Res() reply: Reply) {
    return req.user; //returns user directly only if not working with tokens. If working with tokens, use line below
    //reply.send(await this.authService.login(req.user, req, reply));//returns jwt access_token and refresh_token
  }

  /**
   * Ajax called. Return URL to redirect to
   * @param req
   * @param query
   */
  @Get('logout')
  logout(@Req() req: Request, @Query() query: string) {
    const redirectUrl = this.authService.logout(req);
    //get the next param and pass to login.html for rendering below
    const next = query['next'];
    return next ? { redirectUrl: next } : { redirectUrl }; //override the default redirect declared above
  }
}
