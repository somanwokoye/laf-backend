import { FastifyReply, FastifyRequest } from 'fastify';
import { User } from 'src/users/models/user.entity';

export interface Reply extends FastifyReply {
  view(page: string, data?: object): FastifyReply;
}

export interface Request extends FastifyRequest {
  user: User; //we need this for Typescript to recognize the presence of user in our request object to be sent to login.
}

export interface AuthTokenPayload {
  username: string;
  sub: {
    id: number;
    firstName: string;
    lastName: string;
    landlord?: boolean;
    roles?: string[];
  };
}
