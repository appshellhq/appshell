#!/usr/bin/env bash
#
# upload-examples.sh <apps-dir> — upload each built example's bytes to versioned storage, once.
#
# <apps-dir> holds one directory per example, each with its package.json and the dist/ its
# build produced. Every version's bytes go to <bucket>/<scope>/<name>/<version>/, which the
# registry serves as immutable, so a version is uploaded once and never replaced: an upload
# over one would be invisible to every browser that already cached it (appshellhq/appshell#16).
#
# The release job runs this against appshell-prod, and the pull-request check against a
# stand-in bucket in the job, so the code that uploads to production is proven on every pull
# request.
#
# Environment:
#   BUCKET       the bucket
#   S3_ENDPOINT  the S3 API endpoint, for `aws --endpoint-url`
#   READ_BASE    where the bucket is read anonymously, as the registry reads it: the URL that
#                <scope>/<name>/<version>/remoteEntry.js is appended to
#   VERSION      optional; when set, every example must be at it (lockstep with the release)
#   AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_DEFAULT_REGION   the bucket's credentials
set -euo pipefail

apps=${1:?usage: upload-examples.sh <apps-dir>}
: "${BUCKET:?}" "${S3_ENDPOINT:?}" "${READ_BASE:?}"

for dir in "$apps"/*/; do
  dir=${dir%/}
  name=$(node -p "require('./$dir/package.json').name")
  version=$(node -p "require('./$dir/package.json').version")
  if [ -n "${VERSION:-}" ] && [ "$version" != "$VERSION" ]; then
    echo "::error::$name is at $version, not this release's $VERSION"
    exit 1
  fi

  scope=${name#@}
  scope=${scope%%/*}
  prefix="$scope/${name#*/}/$version"

  # The bucket is public-read and answers 404 for a key that isn't there.
  status=$(curl -s -o /dev/null -w '%{http_code}' "$READ_BASE/$prefix/remoteEntry.js")
  case "$status" in
    200) echo "$prefix: already there; a version's bytes are written once"; continue ;;
    404) ;;
    *) echo "::error::reading $prefix/remoteEntry.js answered $status"; exit 1 ;;
  esac

  # remoteEntry.js goes last, so a version whose remoteEntry.js is there is complete, and a
  # run cut short leaves one the next attempt finishes rather than skips.
  # appshell.template.json is what publish reads, not something a browser loads.
  aws s3 cp "$dir/dist" "s3://$BUCKET/$prefix/" --recursive --acl public-read \
    --endpoint-url "$S3_ENDPOINT" --only-show-errors \
    --exclude remoteEntry.js --exclude appshell.template.json
  aws s3 cp "$dir/dist/remoteEntry.js" "s3://$BUCKET/$prefix/remoteEntry.js" --acl public-read \
    --endpoint-url "$S3_ENDPOINT" --only-show-errors --content-type text/javascript
  echo "$prefix: uploaded"
done
