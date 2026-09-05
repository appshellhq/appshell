# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.45](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.44...v1.0.0-alpha.45) (2026-09-05)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.44](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.43...v1.0.0-alpha.44) (2026-09-05)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.43](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.42...v1.0.0-alpha.43) (2026-09-04)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.42](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.41...v1.0.0-alpha.42) (2026-09-04)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.41](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.40...v1.0.0-alpha.41) (2026-09-04)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.40](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.39...v1.0.0-alpha.40) (2026-09-04)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.39](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.38...v1.0.0-alpha.39) (2026-09-04)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.38](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.37...v1.0.0-alpha.38) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.37](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.36...v1.0.0-alpha.37) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.36](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.35...v1.0.0-alpha.36) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.35](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.34...v1.0.0-alpha.35) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.34](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.33...v1.0.0-alpha.34) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.33](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.32...v1.0.0-alpha.33) (2026-09-03)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.32](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.31...v1.0.0-alpha.32) (2026-09-02)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.31](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.30...v1.0.0-alpha.31) (2026-09-02)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.30](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.29...v1.0.0-alpha.30) (2026-09-01)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.29](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.28...v1.0.0-alpha.29) (2026-08-31)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.28](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.27...v1.0.0-alpha.28) (2026-08-30)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.27](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.26...v1.0.0-alpha.27) (2026-08-29)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.26](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.25...v1.0.0-alpha.26) (2026-08-29)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.25](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.24...v1.0.0-alpha.25) (2026-08-29)

- feat!: fold @appshell/vars into the @appshell/runtime/vars subpath ([8936237](https://github.com/appshellhq/appshell/commit/893623759236bbbd5436607ec6ae1162ce92de45))
- feat!: delete @appshell/core and move the wire types into runtime ([9b3ed20](https://github.com/appshellhq/appshell/commit/9b3ed2094fba8909531049d354a2763c6c1f80db))

### BREAKING CHANGES

- @appshell/vars is removed. Replace
  `import { getVars } from '@appshell/vars'` with
  `import { getVars } from '@appshell/runtime/vars'`.
- @appshell/core is removed. Import AppshellRemote, AppshellIndex
  and Metadata from @appshell/runtime, or from @appshell/react which re-exports
  them. AppshellManifest stays in @appshell/config.

# [1.0.0-alpha.24](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.23...v1.0.0-alpha.24) (2026-08-28)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.23](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.22...v1.0.0-alpha.23) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.22](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.21...v1.0.0-alpha.22) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.21](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.20...v1.0.0-alpha.21) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.20](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.19...v1.0.0-alpha.20) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.19](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.18](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.17](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2026-08-27)

**Note:** Version bump only for package @appshell/runtime

# [1.0.0-alpha.16](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.14...v1.0.0-alpha.16) (2026-08-27)

### Features

- deliver package vars through a shared runtime, not a global ([9473f62](https://github.com/appshellhq/appshell/commit/9473f6204b75885cd55b12a9ec71a44a74d6aa41))
