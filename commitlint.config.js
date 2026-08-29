/*
 * lerna is configured with `conventionalCommits: true`, so commit subjects are what
 * generate the changelogs for each release. A non-conventional message still publishes
 * — the pipeline runs `--force-publish` — it just silently goes unrecorded, which is
 * worst for exactly the changes that most need a changelog entry: the breaking ones.
 */
module.exports = {
  extends: ['@commitlint/config-conventional'],
};
