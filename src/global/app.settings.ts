/* eslint-disable prettier/prettier */
//import * as nodemailer from 'nodemailer';
import nodemailer, { SendMailOptions } from 'nodemailer';
import { google } from 'googleapis';

const OAuth2 = google.auth.OAuth2;
//import Mail from 'nodemailer/lib/mailer';
/*Below is to directly read .env file from settings. 
See https://www.npmjs.com/package/dotenv.
It is used to get the particulars of Gmail account for SMTP mailer
*/
//require('dotenv').config({ path: 'thirdparty.env' }); //no more using this. I have combined it with .env

//Better to use only the parsed env variables rather than keep calling process.env which is more expensive

import { oauth2 } from 'googleapis/build/src/apis/oauth2';
import * as dotenv from 'dotenv';
//load and export parsedEnv for use in other modules
export const parsedEnv = dotenv.config().parsed; //only load what has been parsed from .env file

export const PASSWORD_RESET_EXPIRATION = parseInt(
  parsedEnv.PASSWORD_RESET_EXPIRATION,
);
export const EMAIL_VERIFICATION_EXPIRATION = parseInt(
  parsedEnv.EMAIL_VERIFICATION_EXPIRATION,
);
export const LOGO_FILE_SIZE_LIMIT = parseInt(parsedEnv.LOGO_FILE_SIZE_LIMIT);
export const PHOTO_FILE_SIZE_LIMIT = parseInt(parsedEnv.PHOTO_FILE_SIZE_LIMIT);

/**
 * Below involves getting a new access_token before proceeding
 * following https://dev.to/chandrapantachhetri/sending-emails-securely-using-node-js-nodemailer-smtp-gmail-and-oauth2-g3a
 */
const createTransporter = async (oauth2: boolean) => {
  if (oauth2) {
    try {
      const oauth2Client = new OAuth2(
        parsedEnv.SMTP_CLIENT_ID,
        parsedEnv.SMTP_CLIENT_SECRET,
        parsedEnv.SMTP_ACCESS_URL,
      );

      oauth2Client.setCredentials({
        refresh_token: parsedEnv.SMTP_REFRESH_TOKEN,
      });

      const accessToken = await new Promise((resolve, reject) => {
        oauth2Client.getAccessToken((err, token) => {
          if (err) {
            reject(`Failed to create access token: ${err.message}`);
          }
          resolve(token);
        });
      });

      const transporter = nodemailer.createTransport({
        host: parsedEnv.SMTP_HOST,
        port: parseInt(parsedEnv.SMTP_PORT),
        auth: {
          type: 'OAuth2',
          user: parsedEnv.SMTP_USER,
          accessToken,
          clientId: parsedEnv.SMTP_CLIENT_ID,
          clientSecret: parsedEnv.SMTP_CLIENT_SECRET,
          refreshToken: parsedEnv.SMTP_REFRESH_TOKEN,
        },
        //pool options (see https://nodemailer.com/smtp/pooled/)
        pool: parsedEnv.SMTP_POOL === 'true' ? true : false,
        maxConnections: parseInt(parsedEnv.SMTP_MAXIMUM_CONNECTIONS),
        maxMessages: parseInt(parsedEnv.SMTP_MAXIMUM_MESSAGES),
        //others
        //logger: true,
        //debug: true
      } as nodemailer.TransportOptions);

      return transporter;
    } catch (error) {
      console.log(error);
    }
  } else {
    const nodemailerOptionsGmail = {
      //service: 'gmail',
      host: parsedEnv.SMTP_HOST,
      port: parseInt(parsedEnv.SMTP_PORT),
      secure: parsedEnv.SMTP_SECURE === 'true' ? true : false,
      auth: {
        user: parsedEnv.SMTP_USER,
        pass: parsedEnv.SMTP_PASSWORD,
      },
    };

    return nodemailer.createTransport(nodemailerOptionsGmail);
  }
};

export const mailSender = async (emailOptions: SendMailOptions) => {
  try {
    const emailTransporter = await createTransporter(
      parsedEnv.SMTP_OAUTH === 'true' ? true : false,
    );
    if (emailTransporter) {
      await emailTransporter.sendMail(emailOptions);
    }
  } catch (error) {
    console.log(`Could not send mail: ${error}`);
  }
};

export const resetPasswordMailOptionSettings = {
  textTemplate: `You are receiving this because you (or someone else) have requested the reset of the password for your account.\n
    Please click on the following link, or paste this into your browser to complete the process:\n\n
    {url}
    If you did not request this, please ignore this email and your password will remain unchanged.\n\n`,
  //replyAddress: "noreply@pau.edu.ng",
  subject: 'Reset Password - somanwokoye',
  from: 'somanwokoye@gmail.com',
};

export const confirmEmailMailOptionSettings = {
  textTemplate: `You are receiving this because the email address associated with your account requires confirmation.\n
    Please click on the following link, or paste this into your browser to complete the process:\n\n
    {url}`,
  subject: 'Confirm Email - somanwokoye',
  from: 'somanwokoye@gmail.com',
};

export const SAAS_PROTOCOL: 'http' | 'https' =
  parsedEnv.DEFAULT_HTTP_PROTOCOL as 'http' | 'https';
export const SAAS_USE_API_VERSION_IN_URL = true;
export const SAAS_API_VERSION = 'v1';

export const APP_NAME = 'Lost and found';

export const APP_DESCRIPTION =
  'This app is designed for managing lost and found inventory';

export const API_VERSION = 'v1';

export const USE_API_VERSION_IN_URL = true;

export const AUTO_SEND_CONFIRM_EMAIL = true;

export const PROTOCOL: 'https' | 'http' = parsedEnv.HTTP_PROTOCOL as
  | 'https'
  | 'http';

//For JWT
export const jwtConstants = {
  SECRET: parsedEnv.SECRET_KEY,
  SECRET_KEY_EXPIRATION: parseInt(parsedEnv.SECRET_KEY_EXPIRATION), //integer value is read as seconds. string value with no unit specified, is read as millisecs. See https://www.npmjs.com/package/jsonwebtoken for units
  REFRESH_SECRET: parsedEnv.REFRESH_SECRET,
  REFRESH_SECRET_KEY_EXPIRATION: parsedEnv.REFRESH_SECRET_KEY_EXPIRATION,
};
