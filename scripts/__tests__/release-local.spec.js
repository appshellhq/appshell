/*
 * scripts/release-local.sh publishes the examples at a version to kind, as the release does to
 * production (navaris/argocd-deployment-repo#242). Against fake git, npx, npm, curl, aws and
 * mkcert, with the real upload-examples.sh: it builds from the commit CI recorded for exactly
 * that version, uploads to kind's bucket, publishes to kind's registry and nowhere else, and
 * stops before building when the bucket isn't answering or nobody is signed in.
 */
const { spawnSync } = require('child_process');
const { mkdtempSync, mkdirSync, writeFileSync, readFileSync, chmodSync, rmSync } = require('fs');
const { tmpdir } = require('os');
const { join, resolve } = require('path');

const SCRIPT = resolve(__dirname, '../release-local.sh');
const RECORDED = {
  '1.0.0-alpha.137': 'eeb15e4000000000000000000000000000000000',
  '1.0.0-alpha.140': 'b8a6a0a000000000000000000000000000000000',
};

const fake = (dir, name, body) => {
  writeFileSync(join(dir, name), `#!/bin/sh\necho "${name} $*" >> "$CALLS"\n${body}\n`);
  chmodSync(join(dir, name), 0o755);
};

const setup = () => {
  const root = mkdtempSync(join(tmpdir(), 'release-local-'));
  const bin = join(root, 'bin');
  mkdirSync(bin);
  const messages = Object.entries(RECORDED)
    .map(([v, sha]) => `${sha} chore(example): build against, and version as, ${v}`)
    .join('\\n');

  // git: log greps the recorded messages as git would, with the script's own pattern; worktree
  // add lays out an example with one app at the version its commit records.
  fake(
    bin,
    'git',
    `case "$*" in
  *" log "*)
    pattern=$(printf '%s\\n' "$@" | sed -n 's/^--grep=//p')
    printf '${messages}\\n' | while read -r sha msg; do
      printf '%s\\n' "$msg" | grep -Eq "$pattern" && echo "$sha"
    done | head -n 1 ;;
  *"worktree add"*)
    for last; do :; done
    version=$(printf '${messages}\\n' | grep "^$last " | sed 's/.* //')
    dest=$(printf '%s\\n' "$@" | grep '/src$')
    app="$dest/examples/appshell-react-host/apps/sample-mfe-ping"
    mkdir -p "$app/dist"
    : > "$dest/examples/appshell-react-host/sample.env"
    printf '{"name":"@appshell/sample-mfe-ping","version":"%s"}' "$version" > "$app/package.json" ;;
esac
exit 0`,
  );
  // npm: the build leaves a remoteEntry.js and a template in each app's dist, and records the
  // environment the examples' webpack, and so AppshellPlugin, sees.
  fake(
    bin,
    'npm',
    `case "$*" in *"run build"*)
  echo "build-env publish=\${APPSHELL_PUBLISH_ON_BUILD-unset} registry=\${APPSHELL_REGISTRY-unset} config=\${APPSHELL_CONFIG-unset} application=\${APPSHELL_APPLICATION-unset}" >> "$CALLS"
  for d in apps/*/; do echo x > "$d/dist/remoteEntry.js"; echo {} > "$d/dist/appshell.template.json"; done ;;
esac
exit 0`,
  );
  fake(
    bin,
    'npx',
    `case "$*" in
  *whoami*) [ "\${SIGNED_IN:-yes}" = yes ] || exit 1 ;;
  *"scopes create"*) [ "\${SCOPE_TAKEN:-no}" = yes ] && { echo "Failed to create scope appshell: 409 Scope 'appshell' is already taken."; exit 1; } ;;
esac
exit 0`,
  );
  // curl: the bucket lists appshell-local, and a version not yet uploaded answers 404.
  fake(
    bin,
    'curl',
    `case "$*" in
  *"%{http_code}"*) printf 404 ;;
  *) [ "\${BUCKET_UP:-yes}" = yes ] && echo '<ListAllMyBucketsResult><Name>appshell-local</Name></ListAllMyBucketsResult>' ;;
esac
exit 0`,
  );
  fake(bin, 'aws', 'exit 0');
  fake(bin, 'mkcert', `echo "${root}/mkcert-root"`);
  return { root, bin, calls: join(root, 'calls') };
};

const run = (ctx, version, env = {}) => {
  writeFileSync(ctx.calls, '');
  const result = spawnSync('bash', [SCRIPT, version], {
    encoding: 'utf8',
    env: {
      PATH: `${ctx.bin}:${process.env.PATH}`,
      HOME: ctx.root,
      CALLS: ctx.calls,
      TMPDIR: ctx.root,
      ...env,
    },
  });
  return { ...result, calls: readFileSync(ctx.calls, 'utf8') };
};

describe('release-local.sh', () => {
  let ctx;
  beforeEach(() => {
    ctx = setup();
  });
  afterEach(() => rmSync(ctx.root, { recursive: true, force: true }));

  it('builds the commit CI recorded, uploads to kind and publishes there', () => {
    const { status, calls, stderr } = run(ctx, '1.0.0-alpha.137');

    expect(stderr).toBe('');
    expect(status).toBe(0);
    expect(calls).toContain(`worktree add -q --detach`);
    expect(calls).toContain(RECORDED['1.0.0-alpha.137']);
    expect(calls).toMatch(/npm run build/);
    expect(calls).toMatch(
      /aws s3 cp .*s3:\/\/appshell-local\/appshell\/sample-mfe-ping\/1\.0\.0-alpha\.137\/remoteEntry\.js .*--endpoint-url http:\/\/127\.0\.0\.1:19090/,
    );
    expect(calls).toContain(
      'npx --yes @appshell/cli@1.0.0-alpha.137 --registry https://registry.local.appshell.org publish --template dist/appshell.template.json',
    );
  });

  // --registry is global and wins, so a shell pointed at production still publishes to kind.
  it('never publishes anywhere but kind, whatever APPSHELL_REGISTRY says', () => {
    const { status, calls } = run(ctx, '1.0.0-alpha.137', {
      APPSHELL_REGISTRY: 'https://registry.appshell.org',
    });

    expect(status).toBe(0);
    calls
      .split('\n')
      .filter((line) => line.startsWith('npx '))
      .forEach((line) => expect(line).toContain('--registry https://registry.local.appshell.org'));
  });

  // Copilot on #69: AppshellPlugin publishes during a build when APPSHELL_PUBLISH_ON_BUILD asks,
  // to the cli context's registry, and activates its application.
  it("keeps the examples' build from publishing anywhere, whatever the shell or config says", () => {
    const { status, calls } = run(ctx, '1.0.0-alpha.137', {
      APPSHELL_PUBLISH_ON_BUILD: 'true',
      APPSHELL_REGISTRY: 'https://registry.appshell.org',
      APPSHELL_APPLICATION: 'appshell/appshell-example',
    });

    expect(status).toBe(0);
    const env = calls.split('\n').find((line) => line.startsWith('build-env'));
    expect(env).toContain('publish=false');
    expect(env).toContain('registry=https://registry.local.appshell.org');
    expect(env).toMatch(/config=\S+\/no-config/);
    expect(env).toContain('application=unset');
  });

  // 1.0.0-alpha.14 is a prefix of 1.0.0-alpha.140; only the whole version may match.
  it('builds only from the commit recorded for exactly that version', () => {
    const { status, calls, stderr } = run(ctx, '1.0.0-alpha.14');

    expect(status).not.toBe(0);
    expect(stderr).toContain('CI recorded no build of the examples at 1.0.0-alpha.14');
    expect(calls).not.toContain('worktree add');
  });

  it("stops before building when kind's bucket isn't answering", () => {
    const { status, calls, stderr } = run(ctx, '1.0.0-alpha.137', { BUCKET_UP: 'no' });

    expect(status).not.toBe(0);
    expect(stderr).toContain('local-bucket.sh ensure');
    expect(calls).not.toContain('worktree add');
  });

  it('stops before building when nobody is signed in to kind, and says how', () => {
    const { status, calls, stderr } = run(ctx, '1.0.0-alpha.137', { SIGNED_IN: 'no' });

    expect(status).not.toBe(0);
    expect(stderr).toContain('appshell login --registry https://registry.local.appshell.org');
    expect(calls).not.toContain('worktree add');
  });

  // kind's realm gets new ids when it's recreated, and kind's registry data outlives it.
  it('stops before building when another account holds the scope, and says why', () => {
    const { status, calls, stderr } = run(ctx, '1.0.0-alpha.137', { SCOPE_TAKEN: 'yes' });

    expect(status).not.toBe(0);
    expect(stderr).toContain('an earlier build of kind');
    expect(stderr).toContain('reset-local-registry.sh');
    expect(calls).not.toContain('worktree add');
  });

  it("trusts mkcert's root, which kind's certificate is issued by, unless told otherwise", () => {
    writeFileSync(
      join(ctx.bin, 'npx'),
      `#!/bin/sh\necho "npx $* ca=$NODE_EXTRA_CA_CERTS" >> "$CALLS"\nexit 0\n`,
    );

    expect(run(ctx, '1.0.0-alpha.137').calls).toContain(`ca=${ctx.root}/mkcert-root/rootCA.pem`);
    expect(run(ctx, '1.0.0-alpha.137', { NODE_EXTRA_CA_CERTS: '/mine.pem' }).calls).toContain(
      'ca=/mine.pem',
    );
  });
});
