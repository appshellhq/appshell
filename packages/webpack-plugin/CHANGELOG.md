# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.45](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.44...v1.0.0-alpha.45) (2026-09-05)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.44](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.43...v1.0.0-alpha.44) (2026-09-05)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.43](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.42...v1.0.0-alpha.43) (2026-09-04)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.42](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.41...v1.0.0-alpha.42) (2026-09-04)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.41](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.40...v1.0.0-alpha.41) (2026-09-04)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.40](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.39...v1.0.0-alpha.40) (2026-09-04)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.39](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.38...v1.0.0-alpha.39) (2026-09-04)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.38](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.37...v1.0.0-alpha.38) (2026-09-03)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.37](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.36...v1.0.0-alpha.37) (2026-09-03)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.36](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.35...v1.0.0-alpha.36) (2026-09-03)

### Bug Fixes

- **config:** stop manifestFrom substituting into the template it was given ([3b99509](https://github.com/appshellhq/appshell/commit/3b99509a6028c0f19334a0751875e16efbb28374))

# [1.0.0-alpha.35](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.34...v1.0.0-alpha.35) (2026-09-03)

### Bug Fixes

- **webpack-plugin:** share the jsx runtime, which the react key does not cover ([4ba21b6](https://github.com/appshellhq/appshell/commit/4ba21b672c765eb30672d0d17cc964cc495c0641))

# [1.0.0-alpha.34](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.33...v1.0.0-alpha.34) (2026-09-03)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.33](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.32...v1.0.0-alpha.33) (2026-09-03)

### Bug Fixes

- **webpack-plugin:** serve the manifest a package's manifestUrl promises ([8284334](https://github.com/appshellhq/appshell/commit/8284334099a04dacf1517a1cfd7c807b663c6e1e))

# [1.0.0-alpha.32](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.31...v1.0.0-alpha.32) (2026-09-02)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.31](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.30...v1.0.0-alpha.31) (2026-09-02)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.30](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.29...v1.0.0-alpha.30) (2026-09-01)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.29](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.28...v1.0.0-alpha.29) (2026-08-31)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.28](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.27...v1.0.0-alpha.28) (2026-08-30)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.27](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.26...v1.0.0-alpha.27) (2026-08-29)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.26](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.25...v1.0.0-alpha.26) (2026-08-29)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.25](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.24...v1.0.0-alpha.25) (2026-08-29)

- feat!: fold @appshell/vars into the @appshell/runtime/vars subpath ([8936237](https://github.com/appshellhq/appshell/commit/893623759236bbbd5436607ec6ae1162ce92de45))

### Features

- **webpack-plugin:** provide the shared block instead of asking for it ([a31755d](https://github.com/appshellhq/appshell/commit/a31755da36cc8a80aacd4798fb59f5f2f7673bde))

### BREAKING CHANGES

- @appshell/vars is removed. Replace
  `import { getVars } from '@appshell/vars'` with
  `import { getVars } from '@appshell/runtime/vars'`.

# [1.0.0-alpha.24](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.23...v1.0.0-alpha.24) (2026-08-28)

### Bug Fixes

- **webpack-plugin:** read token usage while the sources still exist ([df4597d](https://github.com/appshellhq/appshell/commit/df4597dd812df533b83b145d7570f6ba217bf864))

### Features

- **webpack-plugin:** observe which design tokens a package reaches for ([014c9fa](https://github.com/appshellhq/appshell/commit/014c9fa5c33bff8c2fa9de2461179b85a24ec3b0)), closes [#0284c7](https://github.com/appshellhq/appshell/issues/0284c7)

# [1.0.0-alpha.23](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.22...v1.0.0-alpha.23) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.22](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.21...v1.0.0-alpha.22) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.21](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.20...v1.0.0-alpha.21) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.20](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.19...v1.0.0-alpha.20) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.19](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.18](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.17](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2026-08-27)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.16](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.14...v1.0.0-alpha.16) (2026-08-27)

### Features

- deliver package vars through a shared runtime, not a global ([9473f62](https://github.com/appshellhq/appshell/commit/9473f6204b75885cd55b12a9ec71a44a74d6aa41))
- rename core vocabulary to Package / Application / Remote ([418b7e0](https://github.com/appshellhq/appshell/commit/418b7e010b6caa1af661f7fd9c05e751e69315a9))
- **webpack-plugin:** record where the dev server is serving from ([fd10939](https://github.com/appshellhq/appshell/commit/fd10939e3c7b7414c4d799396be07b8329074d44))

# [1.0.0-alpha.14](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) (2026-08-23)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.13](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) (2026-08-22)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.12](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2026-08-21)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.11](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2026-08-20)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.10](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2026-08-19)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.9](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2026-08-19)

### Bug Fixes

- **example:** resolve CSP/module-federation issues blocking local dev ([f8de4e1](https://github.com/appshell-org/appshell/commit/f8de4e1cfe495a7d4ae8e6374189384847c21309))

# [1.0.0-alpha.8](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2026-08-19)

### Bug Fixes

- **webpack-plugin:** trim publish toggle env var ([07a7a9e](https://github.com/appshell-org/appshell/commit/07a7a9e4e9977c98f108bc99b7c50726c19c99d9))

# [1.0.0-alpha.7](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2026-08-18)

**Note:** Version bump only for package @appshell/webpack-plugin

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.6](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2026-08-18)

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.5](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2026-08-18)

**Note:** Version bump only for package @appshell/webpack-plugin

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.4](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2026-08-18)

**Note:** Version bump only for package @appshell/webpack-plugin

**Note:** Version bump only for package @appshell/webpack-plugin

# [1.0.0-alpha.3](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2026-08-18)

**Note:** Version bump only for package @appshell/webpack-plugin

# 0.12.0-alpha.0 (2026-04-20)

### Bug Fixes

- appshell host runtime configuration ([#32](https://github.com/appshell-org/appshell/issues/32)) ([cd63ad0](https://github.com/appshell-org/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))
- appshell loader override check ([aedda4a](https://github.com/appshell-org/appshell/commit/aedda4abf81560297dce03df09fba68e8785242f))
- entrypoint validation in manifest plugin for windows ([54768ee](https://github.com/appshell-org/appshell/commit/54768ee8c14e5678dc4b235d7eca4762e081cbbc))
- override support for template mapper ([e79ad36](https://github.com/appshell-org/appshell/commit/e79ad36158c22ae0e6977bfff810cec543e0f828))
- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/appshell-org/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))
- replace config intermediate file with template ([9b79e65](https://github.com/appshell-org/appshell/commit/9b79e65b355686a0cca273c89c7164bb031e8437))
- resolve npm audit vulnerabilities (74 → 4) ([ea3226c](https://github.com/appshell-org/appshell/commit/ea3226cea8e8c53f79ea5a112c1f72ff5039c4c2))
- setup github actions build pipeline, setup project for release ([a54722f](https://github.com/appshell-org/appshell/commit/a54722f3df28098593ec1bce3cc2def377ff531a))
- update manifest webpack plugin ([5ba2eca](https://github.com/appshell-org/appshell/commit/5ba2eca015d0482ab95ee5ef677b75a699327987))
- update readme and package files ([2fc888e](https://github.com/appshell-org/appshell/commit/2fc888eee8bd3881e5ce2ad0c3bee186f5c7d024))
- update repository URLs from navaris/appshell to appshell-org/appshell ([506a90d](https://github.com/appshell-org/appshell/commit/506a90d94a6f6e10f463987d408550f48624bfd0))

### Features

- api key support ([9cdcbee](https://github.com/appshell-org/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/appshell-org/appshell/issues/6)) ([acc5fa2](https://github.com/appshell-org/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))
- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/appshell-org/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))
- AppshellComponent impl ([2b82621](https://github.com/appshell-org/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))
- consolidate runtime artifacts ([#26](https://github.com/appshell-org/appshell/issues/26)) ([a29479a](https://github.com/appshell-org/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))
- foundation refactor wip ([339b930](https://github.com/appshell-org/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))

## [0.5.1-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/manifest-webpack-plugin@0.5.0...@appshell/manifest-webpack-plugin@0.5.1-alpha.0) (2026-04-20)

### Bug Fixes

- resolve npm audit vulnerabilities (74 → 4) ([ea3226c](https://github.com/appshell-org/appshell/commit/ea3226cea8e8c53f79ea5a112c1f72ff5039c4c2))
- update repository URLs from navaris/appshell to appshell-org/appshell ([506a90d](https://github.com/appshell-org/appshell/commit/506a90d94a6f6e10f463987d408550f48624bfd0))

# [0.5.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.4.0...@appshell/manifest-webpack-plugin@0.5.0) (2024-10-23)

### Features

- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/navaris/appshell/issues/6)) ([acc5fa2](https://github.com/navaris/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))

## [0.4.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.4.0...@appshell/manifest-webpack-plugin@0.4.1-alpha.0) (2024-10-16)

### Bug Fixes

- build issues ([499431d](https://github.com/navaris/appshell/commit/499431d423b0616888f61916299d0186eaeebd6f))

# [0.4.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.4...@appshell/manifest-webpack-plugin@0.4.0) (2024-09-24)

### Bug Fixes

- appshell host runtime configuration ([#32](https://github.com/navaris/appshell/issues/32)) ([cd63ad0](https://github.com/navaris/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))

### Features

- api key support ([9cdcbee](https://github.com/navaris/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- AppshellComponent impl ([2b82621](https://github.com/navaris/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))

# [0.4.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.4.0-alpha.0...@appshell/manifest-webpack-plugin@0.4.0-alpha.1) (2024-09-05)

### Features

- api key support ([8c91e62](https://github.com/navaris/appshell/commit/8c91e6240b3d879af9bdd5949924865da0e0f8a1))

# [0.4.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.4...@appshell/manifest-webpack-plugin@0.4.0-alpha.0) (2024-08-31)

### Bug Fixes

- appshell host runtime configuration ([#32](https://github.com/navaris/appshell/issues/32)) ([cd63ad0](https://github.com/navaris/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))
- bump pipeline ([8bb63bc](https://github.com/navaris/appshell/commit/8bb63bcae1928c01bb6bc853d88010939e686af5))

### Features

- AppshellComponent impl ([2b82621](https://github.com/navaris/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))

## [0.3.4](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.3...@appshell/manifest-webpack-plugin@0.3.4) (2023-09-21)

### Bug Fixes

- entrypoint validation in manifest plugin for windows ([54768ee](https://github.com/navaris/appshell/commit/54768ee8c14e5678dc4b235d7eca4762e081cbbc))

## [0.3.3](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.2...@appshell/manifest-webpack-plugin@0.3.3) (2023-08-29)

### Bug Fixes

- override support for template mapper ([e79ad36](https://github.com/navaris/appshell/commit/e79ad36158c22ae0e6977bfff810cec543e0f828))

## [0.3.2](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.1...@appshell/manifest-webpack-plugin@0.3.2) (2023-08-29)

### Bug Fixes

- appshell loader override check ([aedda4a](https://github.com/navaris/appshell/commit/aedda4abf81560297dce03df09fba68e8785242f))

## [0.3.1](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.0...@appshell/manifest-webpack-plugin@0.3.1) (2023-08-29)

### Bug Fixes

- update manifest webpack plugin ([5ba2eca](https://github.com/navaris/appshell/commit/5ba2eca015d0482ab95ee5ef677b75a699327987))

# [0.3.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.3.0-alpha.0...@appshell/manifest-webpack-plugin@0.3.0) (2023-08-28)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

# [0.3.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.2.0...@appshell/manifest-webpack-plugin@0.3.0-alpha.0) (2023-08-23)

### Features

- consolidate runtime artifacts ([#26](https://github.com/navaris/appshell/issues/26)) ([a29479a](https://github.com/navaris/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))

# [0.2.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.2.0-alpha.2...@appshell/manifest-webpack-plugin@0.2.0) (2023-07-11)

### Bug Fixes

- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/navaris/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))
- replace config intermediate file with template ([9b79e65](https://github.com/navaris/appshell/commit/9b79e65b355686a0cca273c89c7164bb031e8437))

# [0.2.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.2.0-alpha.1...@appshell/manifest-webpack-plugin@0.2.0-alpha.2) (2023-07-06)

### Features

- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/navaris/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))

# [0.2.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.8...@appshell/manifest-webpack-plugin@0.2.0-alpha.1) (2023-07-05)

### Features

- foundation refactor wip ([339b930](https://github.com/navaris/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))

# [0.2.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.8...@appshell/manifest-webpack-plugin@0.2.0-alpha.0) (2023-07-05)

### Features

- registry index ([8e6ee0a](https://github.com/navaris/appshell/commit/8e6ee0a6a377584efa2ee702168025f46108b8c5))

## [0.1.8](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.8-alpha.2...@appshell/manifest-webpack-plugin@0.1.8) (2023-06-29)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.8-alpha.2](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.7...@appshell/manifest-webpack-plugin@0.1.8-alpha.2) (2023-06-29)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.8-alpha.1](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.8-alpha.0...@appshell/manifest-webpack-plugin@0.1.8-alpha.1) (2023-06-29)

### Bug Fixes

- update npm package visibility ([1ef4119](https://github.com/navaris/appshell/commit/1ef411903dd038dfc781e8ce0700811e5460c903))

## [0.1.8-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.7-alpha.0...@appshell/manifest-webpack-plugin@0.1.8-alpha.0) (2023-06-29)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.7](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.7-alpha.0...@appshell/manifest-webpack-plugin@0.1.7) (2023-06-29)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.7-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.6...@appshell/manifest-webpack-plugin@0.1.7-alpha.0) (2023-06-15)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.6](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.5...@appshell/manifest-webpack-plugin@0.1.6) (2023-06-15)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.6-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.5...@appshell/manifest-webpack-plugin@0.1.6-alpha.0) (2023-03-19)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.5](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.5-alpha.0...@appshell/manifest-webpack-plugin@0.1.5) (2023-03-04)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## [0.1.5-alpha.0](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.4...@appshell/manifest-webpack-plugin@0.1.5-alpha.0) (2023-03-04)

### Bug Fixes

- update readme and package files ([2fc888e](https://github.com/navaris/appshell/commit/2fc888eee8bd3881e5ce2ad0c3bee186f5c7d024))

## [0.1.4](https://github.com/navaris/appshell/compare/@appshell/manifest-webpack-plugin@0.1.4-alpha.0...@appshell/manifest-webpack-plugin@0.1.4) (2023-03-04)

**Note:** Version bump only for package @appshell/manifest-webpack-plugin

## 0.1.4-alpha.0 (2023-03-04)

### Bug Fixes

- setup github actions build pipeline, setup project for release ([a54722f](https://github.com/navaris/appshell/commit/a54722f3df28098593ec1bce3cc2def377ff531a))
