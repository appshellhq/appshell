#!/usr/bin/env bash
#
# release-local.sh <version> — publish the examples at <version> to kind, as the release does
# to production.
#
# The release builds the examples against each version it publishes, uploads their bytes to
# appshell-prod and publishes them to registry.appshell.org by trusted publishing. No runner
# reaches kind, so this is the same release from your machine: the examples built from the
# commit CI recorded for <version> ("chore(example): build against, and version as,
# <version>"), uploaded with upload-examples.sh to kind's bucket, and published to kind's
# registry as you (navaris/argocd-deployment-repo#242, #280). A version's digest is over its
# surface, never its bytes, so what kind records is what production recorded.
#
# Before anything is built: kind's bucket answers (navaris/argocd-deployment-repo
# scripts/local-bucket.sh), you're signed in to kind's registry, and the appshell scope is
# yours there. Sign in once, as your local account:
#
#   appshell login --registry https://registry.local.appshell.org \
#     --auth-issuer https://auth.local.appshell.org/realms/appshell
#
# Environment, all optional:
#   LOCAL_REGISTRY      kind's registry (https://registry.local.appshell.org)
#   LOCAL_BUCKET_URL    kind's bucket from this machine (http://127.0.0.1:19090)
#   RELEASE_BRANCH      where CI records each build (origin/feat/registry-composition)
#   NODE_EXTRA_CA_CERTS defaults to mkcert's root, which kind's certificate is issued by
set -euo pipefail

version=${1:?usage: release-local.sh <version>}
REGISTRY=${LOCAL_REGISTRY:-https://registry.local.appshell.org}
BUCKET_URL=${LOCAL_BUCKET_URL:-http://127.0.0.1:19090}
BUCKET=appshell-local
BRANCH=${RELEASE_BRANCH:-origin/feat/registry-composition}
ROOT=$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)

if [ -z "${NODE_EXTRA_CA_CERTS:-}" ] && command -v mkcert >/dev/null 2>&1; then
  export NODE_EXTRA_CA_CERTS="$(mkcert -CAROOT)/rootCA.pem"
fi

# The cli at <version>, as the release runs it, always at kind's registry: --registry is
# global and wins over APPSHELL_REGISTRY and the cli's own config, so nothing here can reach
# production.
cli() { npx --yes "@appshell/cli@$version" --registry "$REGISTRY" "$@"; }

curl -s --max-time 5 "$BUCKET_URL/" 2>/dev/null | grep -q "<Name>$BUCKET</Name>" || {
  echo "kind's bucket isn't answering at $BUCKET_URL. In navaris/argocd-deployment-repo: scripts/local-bucket.sh ensure" >&2
  exit 1
}
cli whoami >/dev/null 2>&1 || {
  echo "Not signed in to $REGISTRY. Once, as your local account:" >&2
  echo "  appshell login --registry $REGISTRY --auth-issuer https://auth.local.appshell.org/realms/appshell" >&2
  exit 1
}
# Idempotent: claims it, or finds it already yours. Refused when somebody else holds it, which
# on kind is usually an account from an earlier build of kind's realm: its ids change when it's
# recreated, and kind's registry data outlives it.
if ! out=$(cli scopes create appshell 2>&1); then
  if printf '%s' "$out" | grep -q 'already taken'; then
    echo "kind's appshell scope belongs to another account, most likely one from an earlier build of kind's realm." >&2
    echo "Reset kind's registry data (navaris/argocd-deployment-repo: scripts/reset-local-registry.sh), or have its owner transfer it." >&2
  else
    printf '%s\n' "$out" >&2
  fi
  exit 1
fi

# The commit CI built <version> from. Matched whole, so 1.0.0-alpha.14 never finds alpha.140.
git -C "$ROOT" fetch -q origin
pattern=$(printf '%s' "$version" | sed 's/[][\.*^$()+?{}|/]/\\&/g')
commit=$(git -C "$ROOT" log "$BRANCH" --format=%H -n 1 -E \
  --grep="^chore\(example\): build against, and version as, ${pattern}\$")
if [ -z "$commit" ]; then
  echo "CI recorded no build of the examples at $version on $BRANCH, so there's nothing to rebuild it from." >&2
  exit 1
fi

work=$(mktemp -d)
cleanup() { git -C "$ROOT" worktree remove --force "$work/src" >/dev/null 2>&1 || true; rm -rf "$work"; }
trap cleanup EXIT
git -C "$ROOT" worktree add -q --detach "$work/src" "$commit"

example="$work/src/examples/appshell-react-host"
echo "Building the examples at $version, from ${commit:0:7}"
# The build is the examples' webpack, whose AppshellPlugin publishes, and activates the
# configured application, when APPSHELL_PUBLISH_ON_BUILD asks it to, wherever the cli's context
# points: your shell's APPSHELL_REGISTRY, or ~/.appshell/config, which may be production. Off
# here, with nothing to find: no publishing, kind's registry, no config, no application
# (Copilot on #69).
(cd "$example" && cp sample.env .env && npm ci --silent \
  && env -u APPSHELL_APPLICATION APPSHELL_PUBLISH_ON_BUILD=false APPSHELL_REGISTRY="$REGISTRY" \
    APPSHELL_CONFIG="$work/no-config" npm run build --silent)

# This checkout's upload script, which knows how kind's bucket is read; the build's own may be
# older. From the example, with apps/ relative, as the release runs it. READ_BASE is
# path-style, as S3Mock serves a bucket. S3Mock ignores credentials, but aws wants some.
(cd "$example" && BUCKET="$BUCKET" S3_ENDPOINT="$BUCKET_URL" READ_BASE="$BUCKET_URL/$BUCKET" \
  VERSION="$version" AWS_ACCESS_KEY_ID=local AWS_SECRET_ACCESS_KEY=local AWS_DEFAULT_REGION=us-east-1 \
  "$ROOT/scripts/upload-examples.sh" apps)

for dir in "$example"/apps/*/; do
  (cd "$dir" && cli publish --template dist/appshell.template.json)
done
echo "Published the examples at $version to $REGISTRY"
