#!/usr/bin/env bash
#
# link-packages.sh — link (or unlink) all local @appshell/* packages into one or
# more consumer projects, so local source changes are picked up without publishing.
#
# Usage:
#   scripts/link-packages.sh link   <target-dir> [<target-dir> ...]
#   scripts/link-packages.sh unlink <target-dir> [<target-dir> ...]
#   scripts/link-packages.sh status <target-dir> [<target-dir> ...]
#
# Examples:
#   scripts/link-packages.sh link   examples/appshell-react-host
#   scripts/link-packages.sh unlink examples/appshell-react-host
#
# Notes:
#   - "link" registers every packages/* as a global npm link, builds each once,
#     then links them into each target's node_modules.
#   - npm's `link <name...>` re-installs any previously-linked siblings as plain
#     dirs, so all packages are linked in a SINGLE `npm link` call to avoid the
#     link-clobbers-link problem.
#   - "unlink" restores the published versions from the registry.
#
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
PACKAGES_DIR="$REPO_ROOT/packages"

log()  { printf '\033[36m[link-packages]\033[0m %s\n' "$*"; }
warn() { printf '\033[33m[link-packages]\033[0m %s\n' "$*" >&2; }
err()  { printf '\033[31m[link-packages]\033[0m %s\n' "$*" >&2; }

# Collect the @appshell/* package names from packages/*/package.json.
collect_package_names() {
  local names=()
  local pkg_json name
  for pkg_json in "$PACKAGES_DIR"/*/package.json; do
    [ -f "$pkg_json" ] || continue
    name="$(node -e "process.stdout.write(require('$pkg_json').name || '')")"
    [ -n "$name" ] && names+=("$name")
  done
  printf '%s\n' "${names[@]}"
}

resolve_target() {
  local target="$1"
  if [ -d "$target" ]; then
    (cd "$target" && pwd)
  elif [ -d "$REPO_ROOT/$target" ]; then
    (cd "$REPO_ROOT/$target" && pwd)
  else
    err "target not found: $target"
    return 1
  fi
}

cmd_link() {
  local targets=("$@")
  local names
  names=()
  while IFS= read -r line; do [ -n "$line" ] && names+=("$line"); done < <(collect_package_names)

  if [ "${#names[@]}" -eq 0 ]; then
    err "no @appshell packages found in $PACKAGES_DIR"
    exit 1
  fi

  log "found ${#names[@]} packages: ${names[*]}"

  # 1. Register each package as a global link and build it once.
  local pkg_dir
  for pkg_dir in "$PACKAGES_DIR"/*/; do
    [ -f "$pkg_dir/package.json" ] || continue
    local pkg_name
    pkg_name="$(node -e "process.stdout.write(require('$pkg_dir/package.json').name || '')")"
    [ -n "$pkg_name" ] || continue
    log "registering global link + building: $pkg_name"
    (cd "$pkg_dir" && npm link >/dev/null 2>&1 || true)
    if node -e "process.exit(require('$pkg_dir/package.json').scripts?.build ? 0 : 1)"; then
      (cd "$pkg_dir" && npm run build >/dev/null 2>&1) || warn "build failed for $pkg_name"
    fi
  done

  # 2. Link ALL packages into each target in a single npm link call.
  local target abs
  for target in "${targets[@]}"; do
    abs="$(resolve_target "$target")" || continue
    log "linking ${#names[@]} packages into: $abs"
    (cd "$abs" && npm link "${names[@]}" >/dev/null 2>&1) \
      && log "linked into $abs" \
      || err "npm link failed in $abs"
    cmd_status "$target" || true
  done
}

cmd_unlink() {
  local targets=("$@")
  local names
  names=()
  while IFS= read -r line; do [ -n "$line" ] && names+=("$line"); done < <(collect_package_names)

  local target abs
  for target in "${targets[@]}"; do
    abs="$(resolve_target "$target")" || continue
    log "unlinking packages from: $abs (reinstalling published versions)"
    # `npm unlink <names>` removes the symlinks and reinstalls from the registry.
    (cd "$abs" && npm unlink "${names[@]}" >/dev/null 2>&1) \
      && log "unlinked from $abs" \
      || warn "npm unlink reported issues in $abs; running npm install to restore"
    (cd "$abs" && npm install >/dev/null 2>&1) || warn "npm install failed in $abs"
    cmd_status "$target" || true
  done
}

cmd_status() {
  local targets=("$@")
  local names
  names=()
  while IFS= read -r line; do [ -n "$line" ] && names+=("$line"); done < <(collect_package_names)

  local target abs name dir state realpath
  for target in "${targets[@]}"; do
    abs="$(resolve_target "$target")" || continue
    log "link status in: $abs"
    for name in "${names[@]}"; do
      dir="$abs/node_modules/$name"
      if [ -e "$dir" ]; then
        if [ -L "$dir" ]; then
          state="SYMLINK"
        else
          state="dir    "
        fi
        realpath="$(node -e "try{process.stdout.write(require('fs').realpathSync('$dir'))}catch(e){process.stdout.write('?')}")"
        printf '  %-8s %-34s -> %s\n' "$state" "$name" "$realpath"
      else
        printf '  %-8s %-34s (not installed)\n' "absent" "$name"
      fi
    done
  done
}

main() {
  local action="${1:-}"
  shift || true

  if [ -z "$action" ] || [ "$#" -eq 0 ]; then
    cat >&2 <<'USAGE'
Usage:
  scripts/link-packages.sh link   <target-dir> [<target-dir> ...]
  scripts/link-packages.sh unlink <target-dir> [<target-dir> ...]
  scripts/link-packages.sh status <target-dir> [<target-dir> ...]
USAGE
    exit 1
  fi

  case "$action" in
    link)   cmd_link "$@" ;;
    unlink) cmd_unlink "$@" ;;
    status) cmd_status "$@" ;;
    *) err "unknown action: $action"; exit 1 ;;
  esac
}

main "$@"
