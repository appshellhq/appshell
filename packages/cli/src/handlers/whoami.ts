/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { ensureToken } from '../util/credentials';

/**
 * Who the stored credential says you are, read from the token's own claims.
 *
 * Mostly for the user id: an organization adds members by id, the only name the platform
 * knows a person by, so this is what you send whoever administers it. Decoded, not
 * verified — it describes a token the cli already holds, and nothing is decided on it.
 */
const whoami = async (argv: GlobalArgs) => {
  const token = await ensureToken(argv.registry);

  if (!token) {
    throw new Error(`Not logged in to ${argv.registry}. Run \`appshell login\`.`);
  }

  const [, payload] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString('utf-8')) as {
    sub?: string;
    preferred_username?: string;
    iss?: string;
    scope_id?: string;
  };

  console.log(`${chalk.bold(claims.preferred_username ?? '(no username)')}`);
  console.log(`  ${chalk.dim('user id')}   ${claims.sub ?? '(none)'}`);
  console.log(`  ${chalk.dim('issuer')}    ${claims.iss ?? '(none)'}`);
  if (claims.scope_id) console.log(`  ${chalk.dim('scope')}     ${claims.scope_id}`);
};

export default whoami;
