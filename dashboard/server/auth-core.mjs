import { betterAuth } from 'better-auth';
import { magicLink } from 'better-auth/plugins';

export function makeAuth({database, baseURL, secret, invited, deliver}) {
  return betterAuth({
    database, baseURL, secret, basePath: '/api/auth', logger: {disabled: true},
    session: {expiresIn: 7 * 86400, disableSessionRefresh: true},
    databaseHooks: {
      user: {create: {before: async user => (await invited(user.email)) ? {data: user} : false}},
      session: {create: {before: async (session, ctx) => {
        const user = await ctx.context.internalAdapter.findUserById(session.userId);
        return user && await invited(user.email) ? {data: session} : false;
      }}}
    },
    plugins: [magicLink({expiresIn: 600, storeToken: 'hashed',
      sendMagicLink: async ({email,url}) => {
        if (await invited(email)) await deliver(email,url);
      }
    })]
  });
}
