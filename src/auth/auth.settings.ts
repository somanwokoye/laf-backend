import { FastifyJWTOptions } from 'fastify-jwt';
import { readFileSync } from 'fs';
import * as path from 'path';

export const jwtDefaultOptions: FastifyJWTOptions = {
  //secret: 'skjhfdjahjdhfljsldjheuhiurhsehfjfsjkfsjdkhdjfhklsjhfljdhskdskjdhfdhfdsjkf',
  secret: {
    private: readFileSync(
      `${path.join(__dirname, '../../', 'certs')}/laf_backend.key`,
      'utf8',
    ),
    public: readFileSync(
      `${path.join(__dirname, '../../', 'certs')}/laf_backend.pem`,
      'utf8',
    ),
  },
  // Global default decoding method options

  decode: { complete: true },
  // Global default signing method options
  sign: {
    algorithm: 'RS256',
    issuer: 'somanwokoye',
  },
  // Global default verifying method options
  verify: { issuer: 'somanwokoye' },
};
