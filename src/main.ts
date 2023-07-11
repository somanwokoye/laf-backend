import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import jwt from 'fastify-jwt';
import { jwtDefaultOptions } from './auth/auth.settings';
import { USE_API_VERSION_IN_URL, API_VERSION } from './global/app.settings';

import { readFileSync } from 'fs';
import * as path from 'path';
//Below is for file upload.
import fmp from 'fastify-multipart';
import { fastifySecureSession } from '@fastify/secure-session';

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule /*Below, I have deliberately added the options object here setting the values to the default. 
    There are many other fastify options, see https://www.fastify.io/docs/latest/Server/*/,
    new FastifyAdapter({
      logger: false,
      ignoreTrailingSlash: false,
      bodyLimit: 1048576,
      caseSensitive: true,
      maxParamLength: 512,
    }),
    //enable cors. Instead of simply setting to true which will use default config values, I am setting to object where I can set config values
    //see configuration options at the URL https://github.com/expressjs/cors#configuration-options
    {
      cors: {
        origin: '*', //from which domains can request be made? For now, it is set to everywhere. Security may demand restrictions. See configuration options at https://github.com/expressjs/cors#configuration-options
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE', //which HTTP request verbs are allowed
        preflightContinue: false,
        optionsSuccessStatus: 204,
      },
      //bodyParser: false //Part of temporary workaround for the problem: FastifyError: Unsupported Media Type: application/x-www-form-urlencoded
    },
  );
  //Enable validation pipe. Requires npm install class-validator class-transformer
  app.useGlobalPipes(new ValidationPipe());
  //In production environment, better to disable detailed error message as shown below:
  /*
  app.useGlobalPipes(new ValidationPipe(
    {disableErrorMessages: true,}
  ));
  */

  /* fastify-jwt */
  app.register(jwt as any, { ...jwtDefaultOptions });

  /**
   * Soma note: You can set global prefix for routes e.g. for versioning purpose
   */

  if (USE_API_VERSION_IN_URL) app.setGlobalPrefix(API_VERSION);

  app.register(fastifySecureSession as any, {
    cookieName: 'tmm-session-cookie',
    key: readFileSync(path.join(__dirname, '../', 'secret-key')),
    cookie: {
      //path: '/'
      // options for setCookie, see https://github.com/fastify/fastify-cookie
    },
  });

  await app.listen(3001, '0.0.0.0');

  //More NOTES about fastify use: See https://docs.nestjs.com/techniques/performance for redirect and options
  console.log(`Application is running on: ${await app.getUrl()}`);
}
bootstrap();
