# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.26](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.25...v1.0.0-alpha.26) (2026-08-29)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.25](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.24...v1.0.0-alpha.25) (2026-08-29)

- feat!: fold @appshell/vars into the @appshell/runtime/vars subpath ([8936237](https://github.com/appshellhq/appshell/commit/893623759236bbbd5436607ec6ae1162ce92de45))
- feat!: delete @appshell/core and move the wire types into runtime ([9b3ed20](https://github.com/appshellhq/appshell/commit/9b3ed2094fba8909531049d354a2763c6c1f80db))

### Features

- **webpack-plugin:** provide the shared block instead of asking for it ([a31755d](https://github.com/appshellhq/appshell/commit/a31755da36cc8a80aacd4798fb59f5f2f7673bde))

### BREAKING CHANGES

- @appshell/vars is removed. Replace
  `import { getVars } from '@appshell/vars'` with
  `import { getVars } from '@appshell/runtime/vars'`.
- @appshell/core is removed. Import AppshellRemote, AppshellIndex
  and Metadata from @appshell/runtime, or from @appshell/react which re-exports
  them. AppshellManifest stays in @appshell/config.

# [1.0.0-alpha.24](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.23...v1.0.0-alpha.24) (2026-08-28)

### Features

- **webpack-plugin:** observe which design tokens a package reaches for ([014c9fa](https://github.com/appshellhq/appshell/commit/014c9fa5c33bff8c2fa9de2461179b85a24ec3b0)), closes [#0284c7](https://github.com/appshellhq/appshell/issues/0284c7)

# [1.0.0-alpha.23](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.22...v1.0.0-alpha.23) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.22](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.21...v1.0.0-alpha.22) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.21](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.20...v1.0.0-alpha.21) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.20](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.19...v1.0.0-alpha.20) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.19](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.18...v1.0.0-alpha.19) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.18](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.17...v1.0.0-alpha.18) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.17](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.16...v1.0.0-alpha.17) (2026-08-27)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.16](https://github.com/appshellhq/appshell/compare/v1.0.0-alpha.14...v1.0.0-alpha.16) (2026-08-27)

### Features

- deliver package vars through a shared runtime, not a global ([9473f62](https://github.com/appshellhq/appshell/commit/9473f6204b75885cd55b12a9ec71a44a74d6aa41))
- rename core vocabulary to Package / Application / Remote ([418b7e0](https://github.com/appshellhq/appshell/commit/418b7e010b6caa1af661f7fd9c05e751e69315a9))

# [1.0.0-alpha.14](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.13...v1.0.0-alpha.14) (2026-08-23)

### Features

- **react-shell:** announce an overlay that only changed the shell ([55a5faf](https://github.com/appshell-org/appshell/commit/55a5faf25255c33494d1fbbec86f38a71b2875b2))

# [1.0.0-alpha.13](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.12...v1.0.0-alpha.13) (2026-08-22)

### Features

- **react-shell:** surface an active development overlay ([22bea41](https://github.com/appshell-org/appshell/commit/22bea418afabcc1fb04f0567b0f49aa0e8ed8fd2))

# [1.0.0-alpha.12](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2026-08-21)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.11](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2026-08-20)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.10](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2026-08-19)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.8](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2026-08-19)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.7](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2026-08-18)

**Note:** Version bump only for package @appshell/config

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.6](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2026-08-18)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.5](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2026-08-18)

**Note:** Version bump only for package @appshell/config

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.4](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2026-08-18)

**Note:** Version bump only for package @appshell/config

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.3](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2026-08-18)

**Note:** Version bump only for package @appshell/config

# [1.0.0-alpha.1](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2026-08-18)

### Bug Fixes

- **config:** tolerate empty cli config file ([dc483ae](https://github.com/appshell-org/appshell/commit/dc483ae88cfbf0f437c1700f273ff6a8b8b23dfb))

# 0.12.0-alpha.0 (2026-04-20)

### Bug Fixes

- add allow-override flag for cli ([9fbe018](https://github.com/appshell-org/appshell/commit/9fbe018e0c8047a1d98258271cd02a233206c070))
- add api-key support for appshell host ([817481a](https://github.com/appshell-org/appshell/commit/817481a0b25bec1d0eec38d4d5771d5941cf2f3d))
- add shareScope support to appshell remotes ([ceb55c8](https://github.com/appshell-org/appshell/commit/ceb55c8f6deed27ad11cff841609b1656269a921))
- allow-overrides for start cli ([0684919](https://github.com/appshell-org/appshell/commit/06849198008df5cd492dfea59b1ffb0f139dfa66))
- appshell loader override check ([aedda4a](https://github.com/appshell-org/appshell/commit/aedda4abf81560297dce03df09fba68e8785242f))
- configurable api key header support, minor fixes ([2f0bf02](https://github.com/appshell-org/appshell/commit/2f0bf027b92398f91b8e8cbfbf543d61fe37b7a0))
- detect shared dependency conflicts ([c290107](https://github.com/appshell-org/appshell/commit/c290107b4f7be93bf0b915371891db8b88f84678))
- enable insecure flag for cli generate index, metadata and start commands ([03f5e7f](https://github.com/appshell-org/appshell/commit/03f5e7fbd2ad3746ce648152c4410025958274a9))
- Fixed parsing of strings with more than one variable. ([#10](https://github.com/appshell-org/appshell/issues/10)) ([af21588](https://github.com/appshell-org/appshell/commit/af215886b858742ecf170a6e06a1d6bcba3fd39c))
- override support for appshell template schema ([f2b10d4](https://github.com/appshell-org/appshell/commit/f2b10d4e784d2d39b4602390b73b7db89bd88c34))
- override support for template mapper ([e79ad36](https://github.com/appshell-org/appshell/commit/e79ad36158c22ae0e6977bfff810cec543e0f828))
- reenable unit tests ([c00f581](https://github.com/appshell-org/appshell/commit/c00f581b2d71778378729f3bc42a4f5a1c0afe04))
- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/appshell-org/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))
- replace config intermediate file with template ([9b79e65](https://github.com/appshell-org/appshell/commit/9b79e65b355686a0cca273c89c7164bb031e8437))
- schema validation only when registering manifests ([c0136fb](https://github.com/appshell-org/appshell/commit/c0136fb1cc9163e575c233e8330593a2a6c5a670))
- serve registry docs, update cli error reporting ([7338810](https://github.com/appshell-org/appshell/commit/73388109620c8ec83110b3b60063290214221a59))
- setup github actions build pipeline, setup project for release ([a54722f](https://github.com/appshell-org/appshell/commit/a54722f3df28098593ec1bce3cc2def377ff531a))
- ship developer image with development build, urls for adjunct registries ([333f931](https://github.com/appshell-org/appshell/commit/333f9314854a93ab3f8e57dfde806baf26012e6c))
- support metadata flag on cli start ([567cf02](https://github.com/appshell-org/appshell/commit/567cf02a52150054b855197371681f426382b454))
- update registy url for metadata ([20a9229](https://github.com/appshell-org/appshell/commit/20a92296289d3510ff9661654bac303c0ccd07b7))
- update repository URLs from navaris/appshell to appshell-org/appshell ([506a90d](https://github.com/appshell-org/appshell/commit/506a90d94a6f6e10f463987d408550f48624bfd0))

### Features

- api key support ([9cdcbee](https://github.com/appshell-org/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/appshell-org/appshell/issues/6)) ([acc5fa2](https://github.com/appshell-org/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))
- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/appshell-org/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))
- AppshellComponent impl ([2b82621](https://github.com/appshell-org/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))
- consolidate runtime artifacts ([#26](https://github.com/appshell-org/appshell/issues/26)) ([a29479a](https://github.com/appshell-org/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))
- deregister cli command ([#24](https://github.com/appshell-org/appshell/issues/24)) ([746e827](https://github.com/appshell-org/appshell/commit/746e8273b366543a606cecadf18554bfc094143e))
- detect shared dependency conflicts ([2894b15](https://github.com/appshell-org/appshell/commit/2894b158262ba6e474853b7db086625cd7ecdda7))
- environment variable override for federated components ([#27](https://github.com/appshell-org/appshell/issues/27)) ([d32de0b](https://github.com/appshell-org/appshell/commit/d32de0b0d1cbb1792715e1b363c80ed4600df155))
- foundation refactor wip ([339b930](https://github.com/appshell-org/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))
- support for proxying appshell calls ([ead8ff9](https://github.com/appshell-org/appshell/commit/ead8ff9024426a79a898de07adb587da74e0ba9c))
- support manifest merging and config watch ([5431d10](https://github.com/appshell-org/appshell/commit/5431d100ec7f5106cab66d3009ce5f836e452715))

## [0.10.1-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/config@0.10.0...@appshell/config@0.10.1-alpha.0) (2026-04-20)

### Bug Fixes

- update repository URLs from navaris/appshell to appshell-org/appshell ([506a90d](https://github.com/appshell-org/appshell/commit/506a90d94a6f6e10f463987d408550f48624bfd0))

# [0.10.0](https://github.com/navaris/appshell/compare/@appshell/config@0.9.0...@appshell/config@0.10.0) (2025-08-12)

### Bug Fixes

- configurable api key header support, minor fixes ([2f0bf02](https://github.com/navaris/appshell/commit/2f0bf027b92398f91b8e8cbfbf543d61fe37b7a0))

# [0.10.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.9.1-alpha.1...@appshell/config@0.10.0-alpha.0) (2025-08-08)

### Features

- eliminate requirement for env file for generate env command ([673fb75](https://github.com/navaris/appshell/commit/673fb75060878568f6e41402a7ce2f20d386ee58))

## [0.9.1-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.9.1-alpha.0...@appshell/config@0.9.1-alpha.1) (2025-08-07)

### Bug Fixes

- cli args for proxy url ([b40a7be](https://github.com/navaris/appshell/commit/b40a7be94fbfdb32453e743c2700a512b7a4537f))

## [0.9.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.9.0...@appshell/config@0.9.1-alpha.0) (2025-08-06)

### Bug Fixes

- configurable api key header support ([e1b995a](https://github.com/navaris/appshell/commit/e1b995a98fbb58250f3e428cb116a215b0c1d835))

# [0.9.0](https://github.com/navaris/appshell/compare/@appshell/config@0.8.2...@appshell/config@0.9.0) (2025-02-07)

### Features

- support for proxying appshell calls ([ead8ff9](https://github.com/navaris/appshell/commit/ead8ff9024426a79a898de07adb587da74e0ba9c))

## [0.8.2](https://github.com/navaris/appshell/compare/@appshell/config@0.8.1...@appshell/config@0.8.2) (2025-01-30)

### Bug Fixes

- serve registry docs, update cli error reporting ([7338810](https://github.com/navaris/appshell/commit/73388109620c8ec83110b3b60063290214221a59))

## [0.8.1](https://github.com/navaris/appshell/compare/@appshell/config@0.8.0...@appshell/config@0.8.1) (2025-01-30)

### Bug Fixes

- add api-key support for appshell host ([817481a](https://github.com/navaris/appshell/commit/817481a0b25bec1d0eec38d4d5771d5941cf2f3d))

# [0.8.0](https://github.com/navaris/appshell/compare/@appshell/config@0.7.0...@appshell/config@0.8.0) (2024-10-23)

### Features

- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/navaris/appshell/issues/6)) ([acc5fa2](https://github.com/navaris/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))

# [0.8.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/config@0.8.0-alpha.1...@appshell/config@0.8.0-alpha.2) (2024-10-17)

### Bug Fixes

- force install commands ([c4a1b70](https://github.com/navaris/appshell/commit/c4a1b704482bac3246c1ab32f7613b6b27581382))

# [0.8.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.8.0-alpha.0...@appshell/config@0.8.0-alpha.1) (2024-10-16)

### Features

- publish config package ([0c7acba](https://github.com/navaris/appshell/commit/0c7acba4a1ced68d3de0316166e6a1dfbfde2f85))

# [0.8.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.7.0...@appshell/config@0.8.0-alpha.0) (2024-10-16)

### Bug Fixes

- build issues ([499431d](https://github.com/navaris/appshell/commit/499431d423b0616888f61916299d0186eaeebd6f))

### Features

- change outdated output to tables ([58b07c1](https://github.com/navaris/appshell/commit/58b07c18bf1b915517793ae379ba69738006b77d))
- config init command, global apikey, registry args ([eef5c50](https://github.com/navaris/appshell/commit/eef5c503e7399537ec8956acd462b45060923aa1))
- outdated cli command ([3757286](https://github.com/navaris/appshell/commit/37572862a8d1e4615fd6648e99be1adbb9650f3c))
- sync cli command ([680f9be](https://github.com/navaris/appshell/commit/680f9be817271747b89210ce5b5dc9688c868e7d))

# [0.7.0](https://github.com/navaris/appshell/compare/@appshell/config@0.6.0...@appshell/config@0.7.0) (2024-09-26)

### Bug Fixes

- detect shared dependency conflicts ([c290107](https://github.com/navaris/appshell/commit/c290107b4f7be93bf0b915371891db8b88f84678))

### Features

- detect shared dependency conflicts ([2894b15](https://github.com/navaris/appshell/commit/2894b158262ba6e474853b7db086625cd7ecdda7))

# [0.7.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.6.0...@appshell/config@0.7.0-alpha.0) (2024-09-26)

### Features

- detect shared dependency conflicts ([e03f1e5](https://github.com/navaris/appshell/commit/e03f1e55d634a11c71121796b452fe401b672988))

# [0.6.0](https://github.com/navaris/appshell/compare/@appshell/config@0.5.5...@appshell/config@0.6.0) (2024-09-24)

### Features

- api key support ([9cdcbee](https://github.com/navaris/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- AppshellComponent impl ([2b82621](https://github.com/navaris/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))

# [0.6.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.6.0-alpha.0...@appshell/config@0.6.0-alpha.1) (2024-09-05)

### Features

- api key support ([8c91e62](https://github.com/navaris/appshell/commit/8c91e6240b3d879af9bdd5949924865da0e0f8a1))

# [0.6.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.5.5...@appshell/config@0.6.0-alpha.0) (2024-08-31)

### Bug Fixes

- bump pipeline ([8bb63bc](https://github.com/navaris/appshell/commit/8bb63bcae1928c01bb6bc853d88010939e686af5))

### Features

- AppshellComponent impl ([2b82621](https://github.com/navaris/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))

## [0.5.5](https://github.com/navaris/appshell/compare/@appshell/config@0.5.4...@appshell/config@0.5.5) (2023-08-29)

### Bug Fixes

- allow-overrides for start cli ([0684919](https://github.com/navaris/appshell/commit/06849198008df5cd492dfea59b1ffb0f139dfa66))

## [0.5.4](https://github.com/navaris/appshell/compare/@appshell/config@0.5.3...@appshell/config@0.5.4) (2023-08-29)

### Bug Fixes

- add allow-override flag for cli ([9fbe018](https://github.com/navaris/appshell/commit/9fbe018e0c8047a1d98258271cd02a233206c070))

## [0.5.3](https://github.com/navaris/appshell/compare/@appshell/config@0.5.2...@appshell/config@0.5.3) (2023-08-29)

### Bug Fixes

- override support for template mapper ([e79ad36](https://github.com/navaris/appshell/commit/e79ad36158c22ae0e6977bfff810cec543e0f828))

## [0.5.2](https://github.com/navaris/appshell/compare/@appshell/config@0.5.1...@appshell/config@0.5.2) (2023-08-29)

### Bug Fixes

- appshell loader override check ([aedda4a](https://github.com/navaris/appshell/commit/aedda4abf81560297dce03df09fba68e8785242f))

## [0.5.1](https://github.com/navaris/appshell/compare/@appshell/config@0.5.0...@appshell/config@0.5.1) (2023-08-29)

### Bug Fixes

- override support for appshell template schema ([f2b10d4](https://github.com/navaris/appshell/commit/f2b10d4e784d2d39b4602390b73b7db89bd88c34))

# [0.5.0](https://github.com/navaris/appshell/compare/@appshell/config@0.5.0-alpha.1...@appshell/config@0.5.0) (2023-08-28)

**Note:** Version bump only for package @appshell/config

# [0.5.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.5.0-alpha.0...@appshell/config@0.5.0-alpha.1) (2023-08-28)

### Features

- environment variable override for federated components ([#27](https://github.com/navaris/appshell/issues/27)) ([d32de0b](https://github.com/navaris/appshell/commit/d32de0b0d1cbb1792715e1b363c80ed4600df155))

# [0.5.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.4.0...@appshell/config@0.5.0-alpha.0) (2023-08-23)

### Features

- consolidate runtime artifacts ([#26](https://github.com/navaris/appshell/issues/26)) ([a29479a](https://github.com/navaris/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))

# [0.4.0](https://github.com/navaris/appshell/compare/@appshell/config@0.4.0-alpha.0...@appshell/config@0.4.0) (2023-08-09)

**Note:** Version bump only for package @appshell/config

# [0.4.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.3.2...@appshell/config@0.4.0-alpha.0) (2023-08-09)

### Features

- deregister cli command ([#24](https://github.com/navaris/appshell/issues/24)) ([746e827](https://github.com/navaris/appshell/commit/746e8273b366543a606cecadf18554bfc094143e))

## [0.3.2](https://github.com/navaris/appshell/compare/@appshell/config@0.3.2-alpha.0...@appshell/config@0.3.2) (2023-07-18)

**Note:** Version bump only for package @appshell/config

## [0.3.2-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.3.1...@appshell/config@0.3.2-alpha.0) (2023-07-18)

### Bug Fixes

- schema validation only when registering manifests ([c0136fb](https://github.com/navaris/appshell/commit/c0136fb1cc9163e575c233e8330593a2a6c5a670))

## [0.3.1](https://github.com/navaris/appshell/compare/@appshell/config@0.3.1-alpha.0...@appshell/config@0.3.1) (2023-07-17)

**Note:** Version bump only for package @appshell/config

## [0.3.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0...@appshell/config@0.3.1-alpha.0) (2023-07-17)

### Bug Fixes

- enable insecure flag for cli generate index, metadata and start commands ([03f5e7f](https://github.com/navaris/appshell/commit/03f5e7fbd2ad3746ce648152c4410025958274a9))

# [0.3.0](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.7...@appshell/config@0.3.0) (2023-07-11)

### Bug Fixes

- reenable unit tests ([c00f581](https://github.com/navaris/appshell/commit/c00f581b2d71778378729f3bc42a4f5a1c0afe04))

# [0.3.0-alpha.7](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.6...@appshell/config@0.3.0-alpha.7) (2023-07-10)

### Bug Fixes

- replace config intermediate file with template ([9b79e65](https://github.com/navaris/appshell/commit/9b79e65b355686a0cca273c89c7164bb031e8437))

# [0.3.0-alpha.6](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.5...@appshell/config@0.3.0-alpha.6) (2023-07-10)

### Bug Fixes

- update registy url for metadata ([20a9229](https://github.com/navaris/appshell/commit/20a92296289d3510ff9661654bac303c0ccd07b7))

# [0.3.0-alpha.5](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.4...@appshell/config@0.3.0-alpha.5) (2023-07-10)

### Bug Fixes

- ship developer image with development build, urls for adjunct registries ([333f931](https://github.com/navaris/appshell/commit/333f9314854a93ab3f8e57dfde806baf26012e6c))

# [0.3.0-alpha.4](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.3...@appshell/config@0.3.0-alpha.4) (2023-07-10)

### Bug Fixes

- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/navaris/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))

# [0.3.0-alpha.3](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.2...@appshell/config@0.3.0-alpha.3) (2023-07-06)

### Bug Fixes

- support metadata flag on cli start ([567cf02](https://github.com/navaris/appshell/commit/567cf02a52150054b855197371681f426382b454))

# [0.3.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/config@0.3.0-alpha.1...@appshell/config@0.3.0-alpha.2) (2023-07-06)

### Features

- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/navaris/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))

# [0.3.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.2.1...@appshell/config@0.3.0-alpha.1) (2023-07-05)

### Features

- foundation refactor wip ([339b930](https://github.com/navaris/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))

# [0.3.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.2.1...@appshell/config@0.3.0-alpha.0) (2023-07-05)

### Bug Fixes

- package dependencies ([49f1ace](https://github.com/navaris/appshell/commit/49f1ace6fd63b35ea3c866315123054517687158))

### Features

- registry index ([8e6ee0a](https://github.com/navaris/appshell/commit/8e6ee0a6a377584efa2ee702168025f46108b8c5))

## [0.2.1](https://github.com/navaris/appshell/compare/@appshell/config@0.2.1-alpha.2...@appshell/config@0.2.1) (2023-06-29)

**Note:** Version bump only for package @appshell/config

## [0.2.1-alpha.2](https://github.com/navaris/appshell/compare/@appshell/config@0.2.0...@appshell/config@0.2.1-alpha.2) (2023-06-29)

**Note:** Version bump only for package @appshell/config

## [0.2.1-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.2.1-alpha.0...@appshell/config@0.2.1-alpha.1) (2023-06-29)

### Bug Fixes

- update npm package visibility ([1ef4119](https://github.com/navaris/appshell/commit/1ef411903dd038dfc781e8ce0700811e5460c903))

## [0.2.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.2.0-alpha.2...@appshell/config@0.2.1-alpha.0) (2023-06-29)

**Note:** Version bump only for package @appshell/config

# [0.2.0](https://github.com/navaris/appshell/compare/@appshell/config@0.2.0-alpha.2...@appshell/config@0.2.0) (2023-06-29)

**Note:** Version bump only for package @appshell/config

# [0.2.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/config@0.2.0-alpha.1...@appshell/config@0.2.0-alpha.2) (2023-06-28)

### Bug Fixes

- Fixed parsing of strings with more than one variable. ([#10](https://github.com/navaris/appshell/issues/10)) ([af21588](https://github.com/navaris/appshell/commit/af215886b858742ecf170a6e06a1d6bcba3fd39c))

# [0.2.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.1.7-alpha.0...@appshell/config@0.2.0-alpha.1) (2023-06-22)

### Features

- support manifest merging and config watch ([5431d10](https://github.com/navaris/appshell/commit/5431d100ec7f5106cab66d3009ce5f836e452715))

## [0.1.7-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.1.6...@appshell/config@0.1.7-alpha.0) (2023-06-15)

**Note:** Version bump only for package @appshell/config

## [0.1.6](https://github.com/navaris/appshell/compare/@appshell/config@0.1.5...@appshell/config@0.1.6) (2023-06-15)

**Note:** Version bump only for package @appshell/config

## [0.1.6-alpha.2](https://github.com/navaris/appshell/compare/@appshell/config@0.1.6-alpha.1...@appshell/config@0.1.6-alpha.2) (2023-06-15)

## [0.1.6-alpha.1](https://github.com/navaris/appshell/compare/@appshell/config@0.1.6-alpha.0...@appshell/config@0.1.6-alpha.1) (2023-03-19)

## [0.1.6-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.1.5-alpha.0...@appshell/config@0.1.6-alpha.0) (2023-03-19)

**Note:** Version bump only for package @appshell/config

## [0.1.5](https://github.com/navaris/appshell/compare/@appshell/config@0.1.5-alpha.0...@appshell/config@0.1.5) (2023-03-05)

**Note:** Version bump only for package @appshell/config

## [0.1.5-alpha.0](https://github.com/navaris/appshell/compare/@appshell/config@0.1.4...@appshell/config@0.1.5-alpha.0) (2023-03-05)

**Note:** Version bump only for package @appshell/config

### Bug Fixes

- add shareScope support to appshell remotes ([ceb55c8](https://github.com/navaris/appshell/commit/ceb55c8f6deed27ad11cff841609b1656269a921))

## [0.1.4](https://github.com/navaris/appshell/compare/@appshell/config@0.1.4-alpha.0...@appshell/config@0.1.4) (2023-03-04)

**Note:** Version bump only for package @appshell/config

## 0.1.4-alpha.0 (2023-03-04)

### Bug Fixes

- setup github actions build pipeline, setup project for release ([a54722f](https://github.com/navaris/appshell/commit/a54722f3df28098593ec1bce3cc2def377ff531a))
