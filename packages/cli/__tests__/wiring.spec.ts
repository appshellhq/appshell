import path from 'path';
import type yargs from 'yargs';
import * as app from '../src/handlers/app';
import * as dev from '../src/handlers/dev';
import * as theme from '../src/handlers/theme';

/*
 * Every handler is replaced, so parsing is exercised for real while nothing reaches a
 * registry. What is under test is the wiring: that a command is registered, that its
 * positionals and options survive parsing, and that the values reach the handler yargs
 * bound to it.
 *
 * `unpublish <name> <version>` shipped unusable because yargs' reserved `--version` won
 * over the positional and the handler received `version: false`. Nothing caught it: the
 * build passed, the handler's own tests passed, and `--help` renders identically either
 * way. Only the parsed value disagrees, so only a test that parses can see it.
 */
jest.mock('../src/handlers/app');
jest.mock('../src/handlers/dev');
jest.mock('../src/handlers/theme');
jest.mock('../src/handlers/publish');
jest.mock('../src/handlers/login');
jest.mock('../src/handlers/outdated');
jest.mock('../src/handlers/generate.manifest');
jest.mock('../src/handlers/config/init');
jest.mock('../src/handlers/config/list');
jest.mock('../src/handlers/config/set');
// `unpublish` has an inline handler rather than an imported one, so the client it reaches
// for is what has to be replaced.
jest.mock('../src/util/registry');

// Somewhere with no config file, so defaults come from the code rather than from whatever
// happens to be in the home directory of the machine running this.
process.env.APPSHELL_CONFIG = path.join(__dirname, 'assets', 'no-such-config');

// eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
const { buildCli } = require('../src/cli') as typeof import('../src/cli');

type Parsed = { argv?: Record<string, unknown>; error?: string; output: string };

/**
 * Parses one command line, capturing failures rather than exiting the test runner.
 *
 * The failure handler throws. yargs carries on after a `fail` handler that returns
 * normally — the real CLI's calls `process.exit`, which is what stops it — so a handler
 * that merely recorded the message would let the command run anyway, and every assertion
 * about rejecting bad input would pass for the wrong reason.
 */
const run = (line: string): Parsed => {
  const result: Parsed = { output: '' };
  const args = line.split(' ').filter(Boolean);

  try {
    (buildCli(args) as yargs.Argv)
      .fail((msg, err) => {
        throw err ?? new Error(msg);
      })
      .parse(args, {}, (_err, argv, output) => {
        result.argv = argv as Record<string, unknown>;
        result.output = output;
      });
  } catch (error) {
    result.error = (error as Error).message;
  }

  return result;
};

/** The argv the handler was actually handed, which is the thing that was wrong before. */
const handedTo = (handler: unknown) =>
  (handler as jest.Mock).mock.calls[0]?.[0] as Record<string, unknown> | undefined;

beforeEach(() => jest.clearAllMocks());

describe('the bug that started this', () => {
  it('should hand unpublish the version positional, not yargs reserved --version', async () => {
    run('unpublish my-package 1.2.3');
    // The handler is async, so the call lands a tick later.
    await new Promise(process.nextTick);

    // Asserted at the registry call rather than on parsed argv, because that is where the
    // bug showed: the handler was asked to unpublish `my-package@false`.
    // eslint-disable-next-line @typescript-eslint/no-var-requires, global-require
    const { RegistryClient } = require('../src/util/registry');
    const [client] = (RegistryClient as jest.Mock).mock.instances;

    expect(client.unpublish).toHaveBeenCalledWith('default', 'my-package', '1.2.3');
  });

  it('should still report the cli version at the top level', () => {
    expect(run('--version').output).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe('dev', () => {
  it('should bind bare `appshell dev` to start', () => {
    run('dev');

    expect(dev.start).toHaveBeenCalled();
  });

  it('should pass --theme through to start', () => {
    run('dev start --theme midnight-ember');

    expect(handedTo(dev.start)?.theme).toBe('midnight-ember');
  });

  it('should parse --port as a number, since localOrigin builds a url from it', () => {
    run('dev start --port 3002');

    expect(handedTo(dev.start)?.port).toBe(3002);
  });

  it('should collect --remote as an array even when given once', () => {
    run('dev start --remote PongModule/Pong');

    expect(handedTo(dev.start)?.remote).toEqual(['PongModule/Pong']);
  });

  it('should default --shell to dev, which is what makes a bare overlay useful', () => {
    run('dev start');

    expect(handedTo(dev.start)?.shell).toBe('dev');
  });

  it('should reject a --shell value that is not a known flavor', () => {
    expect(run('dev start --shell staging').error).toMatch(/Choices|Invalid values/i);
  });

  it('should route stop to stop, and take the overlay id positionally', () => {
    run('dev stop abc123');

    expect(handedTo(dev.stop)?.id).toBe('abc123');
    expect(dev.start).not.toHaveBeenCalled();
  });

  it('should route status to status', () => {
    run('dev status');

    expect(dev.status).toHaveBeenCalled();
  });
});

describe('theme', () => {
  it('should take the ref positionally on get', () => {
    run('theme get acme/brand@1.0.0');

    expect(handedTo(theme.get)?.ref).toBe('acme/brand@1.0.0');
  });

  it('should require a ref on get rather than calling the handler with nothing', () => {
    run('theme get');

    expect(theme.get).not.toHaveBeenCalled();
  });

  it('should pass --from and --out through to init', () => {
    run('theme init --from acme/brand --out brand.yaml');

    expect(handedTo(theme.init)).toMatchObject({ from: 'acme/brand', out: 'brand.yaml' });
  });

  it('should accept -f as the file on publish', () => {
    run('theme publish -f theme.yaml');

    expect(handedTo(theme.publish)?.file).toBe('theme.yaml');
  });

  it('should route list to list', () => {
    run('theme list');

    expect(theme.list).toHaveBeenCalled();
  });
});

describe('app', () => {
  it('should take the name positionally on create', () => {
    run('app create storefront');

    expect(handedTo(app.create)?.name).toBe('storefront');
  });

  it('should take the package positionally on deactivate', () => {
    run('app deactivate default/pong@1.0.0');

    expect(handedTo(app.deactivate)?.package).toBe('default/pong@1.0.0');
  });

  it('should route revisions to revisions rather than to get', () => {
    run('app revisions storefront');

    expect(app.revisions).toHaveBeenCalled();
    expect(app.get).not.toHaveBeenCalled();
  });
});

describe('global options', () => {
  it('should reach a subcommand handler, since they are declared global', () => {
    run('dev status --registry http://localhost:9999 --scopeId acme');

    expect(handedTo(dev.status)).toMatchObject({
      registry: 'http://localhost:9999',
      scopeId: 'acme',
    });
  });

  it('should apply -a as the alias for --application', () => {
    run('dev status -a storefront');

    expect(handedTo(dev.status)?.application).toBe('storefront');
  });

  it('should default scopeId rather than leaving it undefined', () => {
    run('dev status');

    expect(handedTo(dev.status)?.scopeId).toBe('default');
  });
});

/*
 * Found by this file. `appshell nonsens` printed nothing and exited 0, so a mistyped
 * command in a script read as success — the worst possible failure for a CLI, because
 * there is nothing to notice.
 */
describe('unknown commands', () => {
  it('should refuse a command that does not exist', () => {
    expect(run('nonsense').error).toMatch(/Unknown argument|Unknown command/i);
  });

  it('should refuse an unknown subcommand too', () => {
    expect(run('theme nonsense').error).toBeDefined();
  });

  it('should demand a command rather than doing nothing', () => {
    expect(run('').error).toMatch(/Specify a command/);
  });

  it('should demand a subcommand rather than doing nothing', () => {
    expect(run('theme').error).toBeDefined();
  });

  // Unknown options stay tolerated: global flags accrete, and an older CLI refusing a
  // newer flag is a worse failure than ignoring one.
  it('should tolerate an unknown option on a known command', () => {
    expect(run('dev status --future-flag').error).toBeUndefined();
  });
});
