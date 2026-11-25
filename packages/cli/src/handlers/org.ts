/* eslint-disable no-console */
import chalk from 'chalk';
import { GlobalArgs } from '../util/args';
import { OrganizationsClient, platformApi } from '../util/platform';

export type OrgArgs = GlobalArgs & { api?: string; authIssuer?: string };
type CreateArgs = OrgArgs & { slug: string; displayName?: string };
type MemberArgs = OrgArgs & { organization: string };
type AddMemberArgs = MemberArgs & { userId: string; role: 'member' | 'admin' };

/*
 * Organizations live on the platform, not the registry: the registry asks the platform who
 * belongs to one before letting a member write into a scope the organization owns. These
 * commands are what make one exist, and the registry's `scopes transfer` is what hands it a
 * namespace. appshellhq/appshell#15, navaris/argocd-deployment-repo#236.
 */
const clientFor = (argv: OrgArgs) => {
  const api = platformApi(argv.api, argv.authIssuer);

  if (!api) {
    throw new Error(
      'No platform api to manage organizations on. Set --api (or APPSHELL_API, or `appshell ' +
        'config set api`), e.g. https://api.appshell.org. A registry run without a platform ' +
        'behind it has no organizations.',
    );
  }

  return new OrganizationsClient(api, argv.registry);
};

/** The caller owns what they create: the service takes the owner from the token. */
export const create = async (argv: CreateArgs) => {
  const { id } = await clientFor(argv).create(argv.slug, argv.displayName ?? argv.slug);

  console.log(chalk.green(`Created ${argv.slug}`) + chalk.dim(` (${id}); you own it`));
};

export const membersList = async (argv: MemberArgs) => {
  const org = await clientFor(argv).get(argv.organization);
  const width = Math.max(...org.members.map((m) => m.userId.length));

  console.log(`\n${chalk.bold(org.displayName)} ${chalk.dim(`(${org.slug})`)}\n`);
  org.members.forEach((member) => {
    console.log(
      `  ${member.userId.padEnd(width)}  ${member.role.padEnd(6)}  ${chalk.dim(
        `since ${member.addedAt.slice(0, 10)}`,
      )}`,
    );
  });
  console.log();
};

/**
 * Adds a member by user id, which is the only name the platform knows a person by. Nothing
 * maps a username to an id, so the person being added runs `appshell whoami` and passes on
 * theirs.
 *
 * Resolved by slug first, because the service adds members to an organization named by id.
 */
export const membersAdd = async (argv: AddMemberArgs) => {
  const client = clientFor(argv);
  const org = await client.get(argv.organization);

  await client.addMember(org.id, argv.userId, argv.role);

  console.log(chalk.green(`Added ${argv.userId} to ${org.slug} as ${argv.role}`));
};
