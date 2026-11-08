import { betterAuth } from 'better-auth';

export function makeAuth({database, baseURL, secret}) {
  return betterAuth({
    database, baseURL, secret, basePath: '/api/auth', logger: {disabled: true},
    session: {expiresIn: 7 * 86400, disableSessionRefresh: true},
    emailAndPassword: {enabled: true, minPasswordLength: 12, maxPasswordLength: 128}
  });
}
