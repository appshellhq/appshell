# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.6](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2026-08-18)

**Note:** Version bump only for package @appshell/react-shell

# [1.0.0-alpha.5](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2026-08-18)

**Note:** Version bump only for package @appshell/react-shell

**Note:** Version bump only for package @appshell/react-shell

# [1.0.0-alpha.4](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2026-08-18)

**Note:** Version bump only for package @appshell/react-shell

**Note:** Version bump only for package @appshell/react-shell

# [1.0.0-alpha.3](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2026-08-18)

**Note:** Version bump only for package @appshell/react-shell

# 0.12.0-alpha.0 (2026-04-20)

### Bug Fixes

- add api-key support for appshell host ([817481a](https://github.com/appshell-org/appshell/commit/817481a0b25bec1d0eec38d4d5771d5941cf2f3d))
- add generate metadata to react-host startup command ([b8ade33](https://github.com/appshell-org/appshell/commit/b8ade33bc8bdf0d5bc612ce08846f2b9f26a3fd4))
- appshell host runtime configuration ([#32](https://github.com/appshell-org/appshell/issues/32)) ([cd63ad0](https://github.com/appshell-org/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))
- appshell host startup script ([#34](https://github.com/appshell-org/appshell/issues/34)) ([e136d73](https://github.com/appshell-org/appshell/commit/e136d73fb92c8dfcb90648dcb0eb7b2ec8a365b1))
- configurable api key header support, minor fixes ([2f0bf02](https://github.com/appshell-org/appshell/commit/2f0bf027b92398f91b8e8cbfbf543d61fe37b7a0))
- enable history api fallback, include serve.json config, update publicPath value ([96af4fc](https://github.com/appshell-org/appshell/commit/96af4fc8cd14006aa477964daa4e37d29803191c))
- enable relative appshell_configs dir, containerize appshell host example ([79926f5](https://github.com/appshell-org/appshell/commit/79926f5e2b1ae29c4d7349c0babcb93d3b147485))
- hot module replacement support, example updates ([a67d230](https://github.com/appshell-org/appshell/commit/a67d2303b40f5911373225cc0b4ccf9b67c33d11))
- ignore dist from dev server ([66eaa4f](https://github.com/appshell-org/appshell/commit/66eaa4f0f7909de289aa25bd8962d0d018be8c89))
- ignore manifest changes that force refresh ([ccb2155](https://github.com/appshell-org/appshell/commit/ccb2155a26bd3f6861f43805bb674ae4906375c1))
- make runtime env generation prefix configurable ([28441a8](https://github.com/appshell-org/appshell/commit/28441a854cd03dfd4b89fb932efba571af221cd2))
- metadata urls ([efcce1c](https://github.com/appshell-org/appshell/commit/efcce1ce4cb1745afa83661cae1414a73f837483))
- reenable unit tests ([c00f581](https://github.com/appshell-org/appshell/commit/c00f581b2d71778378729f3bc42a4f5a1c0afe04))
- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/appshell-org/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))
- rename @appshell/react-federated-component package to @appshell/react ([0b74498](https://github.com/appshell-org/appshell/commit/0b74498bf17ba73db4d936c8a012af1d3b111a28))
- serve registry docs, update cli error reporting ([7338810](https://github.com/appshell-org/appshell/commit/73388109620c8ec83110b3b60063290214221a59))
- ship developer image with development build, urls for adjunct registries ([333f931](https://github.com/appshell-org/appshell/commit/333f9314854a93ab3f8e57dfde806baf26012e6c))
- stylesheet url support for appshell host ([40e5368](https://github.com/appshell-org/appshell/commit/40e5368cf65e71eb2adbbcc432c846ba1539d14f))
- support metadata flag on cli start ([567cf02](https://github.com/appshell-org/appshell/commit/567cf02a52150054b855197371681f426382b454))
- support metadata generation ([4df202f](https://github.com/appshell-org/appshell/commit/4df202f0fd3b9ca6c660975b75eb0ac9b60225c2))
- update appshell commands for react-host ([a9d881c](https://github.com/appshell-org/appshell/commit/a9d881cc93b720b2aaf28f1765f7e671f265df3d))
- use --validate-registry-ssl-cert instead of --insecure ([88a0575](https://github.com/appshell-org/appshell/commit/88a0575c52617a08da4b8bc08288ebce8f103586))

### Features

- api key support ([9cdcbee](https://github.com/appshell-org/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/appshell-org/appshell/issues/6)) ([acc5fa2](https://github.com/appshell-org/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))
- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/appshell-org/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))
- AppshellComponent impl ([2b82621](https://github.com/appshell-org/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))
- consolidate runtime artifacts ([#26](https://github.com/appshell-org/appshell/issues/26)) ([a29479a](https://github.com/appshell-org/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))
- enable props to be passed to federated component rendered by react host ([e3a7273](https://github.com/appshell-org/appshell/commit/e3a72738455e179c9cc0b3f1ae29cf61b7c6d765))
- foundation refactor wip ([339b930](https://github.com/appshell-org/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))
- support for proxying appshell calls ([ead8ff9](https://github.com/appshell-org/appshell/commit/ead8ff9024426a79a898de07adb587da74e0ba9c))
- support manifest merging and config watch ([5431d10](https://github.com/appshell-org/appshell/commit/5431d100ec7f5106cab66d3009ce5f836e452715))

## [0.7.1](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.0...@appshell/react-host@0.7.1) (2025-08-12)

### Bug Fixes

- configurable api key header support, minor fixes ([2f0bf02](https://github.com/appshell-org/appshell/commit/2f0bf027b92398f91b8e8cbfbf543d61fe37b7a0))

## [0.7.1-alpha.4](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.1-alpha.3...@appshell/react-host@0.7.1-alpha.4) (2025-08-11)

### Bug Fixes

- handle proxyless service worker config ([7754f69](https://github.com/appshell-org/appshell/commit/7754f698e07e43b630040743c36f2e0dceaf1467))

## [0.7.1-alpha.3](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.1-alpha.2...@appshell/react-host@0.7.1-alpha.3) (2025-08-10)

### Bug Fixes

- added crossorigin="use-credentials" for manifest.json ([7e320be](https://github.com/appshell-org/appshell/commit/7e320be63459bfb7bcc176f3d1a07128e80bf27f))

## [0.7.1-alpha.2](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.1-alpha.1...@appshell/react-host@0.7.1-alpha.2) (2025-08-07)

**Note:** Version bump only for package @appshell/react-host

## [0.7.1-alpha.1](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.1-alpha.0...@appshell/react-host@0.7.1-alpha.1) (2025-08-07)

### Bug Fixes

- cli args for proxy url ([b40a7be](https://github.com/appshell-org/appshell/commit/b40a7be94fbfdb32453e743c2700a512b7a4537f))

## [0.7.1-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.7.0...@appshell/react-host@0.7.1-alpha.0) (2025-08-06)

### Bug Fixes

- configurable api key header support ([e1b995a](https://github.com/appshell-org/appshell/commit/e1b995a98fbb58250f3e428cb116a215b0c1d835))

# [0.7.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.6.2...@appshell/react-host@0.7.0) (2025-02-07)

### Features

- support for proxying appshell calls ([ead8ff9](https://github.com/appshell-org/appshell/commit/ead8ff9024426a79a898de07adb587da74e0ba9c))

## [0.6.2](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.6.1...@appshell/react-host@0.6.2) (2025-01-30)

### Bug Fixes

- serve registry docs, update cli error reporting ([7338810](https://github.com/appshell-org/appshell/commit/73388109620c8ec83110b3b60063290214221a59))

## [0.6.1](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.6.0...@appshell/react-host@0.6.1) (2025-01-30)

### Bug Fixes

- add api-key support for appshell host ([817481a](https://github.com/appshell-org/appshell/commit/817481a0b25bec1d0eec38d4d5771d5941cf2f3d))

# [0.6.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.5.0...@appshell/react-host@0.6.0) (2024-10-23)

### Features

- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/appshell-org/appshell/issues/6)) ([acc5fa2](https://github.com/appshell-org/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))

# [0.6.0-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.5.0...@appshell/react-host@0.6.0-alpha.0) (2024-10-16)

### Features

- config init command, global apikey, registry args ([eef5c50](https://github.com/appshell-org/appshell/commit/eef5c503e7399537ec8956acd462b45060923aa1))

# [0.5.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.4.2...@appshell/react-host@0.5.0) (2024-09-24)

### Features

- api key support ([9cdcbee](https://github.com/appshell-org/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))

# [0.5.0-alpha.1](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.5.0-alpha.0...@appshell/react-host@0.5.0-alpha.1) (2024-09-17)

### Bug Fixes

- exclude application of api key to external urls ([87d4abe](https://github.com/appshell-org/appshell/commit/87d4abe0e486e97b756bdf0def1e77150e230e33))

# [0.5.0-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.4.3-alpha.0...@appshell/react-host@0.5.0-alpha.0) (2024-09-05)

### Features

- api key support ([8c91e62](https://github.com/appshell-org/appshell/commit/8c91e6240b3d879af9bdd5949924865da0e0f8a1))

## [0.4.3-alpha.0](https://github.com/appshell-org/appshell/compare/@appshell/react-host@0.4.2...@appshell/react-host@0.4.3-alpha.0) (2024-08-31)

### Bug Fixes

- bump pipeline ([8bb63bc](https://github.com/appshell-org/appshell/commit/8bb63bcae1928c01bb6bc853d88010939e686af5))

## [0.4.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.4.1...@appshell/react-host@0.4.2) (2024-01-31)

### Bug Fixes

- appshell host startup script ([#34](https://github.com/navaris/appshell/issues/34)) ([e136d73](https://github.com/navaris/appshell/commit/e136d73fb92c8dfcb90648dcb0eb7b2ec8a365b1))

## [0.4.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.4.0...@appshell/react-host@0.4.1) (2024-01-27)

### Bug Fixes

- appshell host runtime configuration ([#32](https://github.com/navaris/appshell/issues/32)) ([cd63ad0](https://github.com/navaris/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))

# [0.4.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.3.2...@appshell/react-host@0.4.0) (2024-01-25)

### Features

- AppshellComponent impl ([2b82621](https://github.com/navaris/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))

## [0.3.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.3.1...@appshell/react-host@0.3.2) (2024-01-18)

### Bug Fixes

- stylesheet url support for appshell host ([40e5368](https://github.com/navaris/appshell/commit/40e5368cf65e71eb2adbbcc432c846ba1539d14f))

## [0.3.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.3.0...@appshell/react-host@0.3.1) (2023-08-30)

### Bug Fixes

- update appshell commands for react-host ([a9d881c](https://github.com/navaris/appshell/commit/a9d881cc93b720b2aaf28f1765f7e671f265df3d))

# [0.3.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.3.0-alpha.0...@appshell/react-host@0.3.0) (2023-08-28)

**Note:** Version bump only for package @appshell/react-host

# [0.3.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.3...@appshell/react-host@0.3.0-alpha.0) (2023-08-23)

### Features

- consolidate runtime artifacts ([#26](https://github.com/navaris/appshell/issues/26)) ([a29479a](https://github.com/navaris/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))

## [0.2.3](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.3-alpha.0...@appshell/react-host@0.2.3) (2023-07-18)

**Note:** Version bump only for package @appshell/react-host

## [0.2.3-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2...@appshell/react-host@0.2.3-alpha.0) (2023-07-18)

### Bug Fixes

- use --validate-registry-ssl-cert instead of --insecure ([88a0575](https://github.com/navaris/appshell/commit/88a0575c52617a08da4b8bc08288ebce8f103586))

## [0.2.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2-alpha.5...@appshell/react-host@0.2.2) (2023-07-17)

**Note:** Version bump only for package @appshell/react-host

## [0.2.2-alpha.5](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.1...@appshell/react-host@0.2.2-alpha.5) (2023-07-17)

**Note:** Version bump only for package @appshell/react-host

## [0.2.2-alpha.4](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2-alpha.3...@appshell/react-host@0.2.2-alpha.4) (2023-07-15)

### Bug Fixes

- test build pipeline ([7042d33](https://github.com/navaris/appshell/commit/7042d33a61789923d612a74c3d446e07a5739a62))

## [0.2.2-alpha.3](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2-alpha.2...@appshell/react-host@0.2.2-alpha.3) (2023-07-15)

### Bug Fixes

- test build pipeline ([cf30b22](https://github.com/navaris/appshell/commit/cf30b22455c9d7f251e382be47b9021180711d7b))

## [0.2.2-alpha.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2-alpha.1...@appshell/react-host@0.2.2-alpha.2) (2023-07-15)

### Bug Fixes

- test build pipeline ([c2052d4](https://github.com/navaris/appshell/commit/c2052d47b86e0c13531fa779c7a558535d87eff9))

## [0.2.2-alpha.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.2-alpha.0...@appshell/react-host@0.2.2-alpha.1) (2023-07-15)

### Bug Fixes

- test build pipeline ([0f7c0df](https://github.com/navaris/appshell/commit/0f7c0dfa33b46ff6f91becdbcdb145d2ecaf6668))

## [0.2.2-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.1...@appshell/react-host@0.2.2-alpha.0) (2023-07-15)

**Note:** Version bump only for package @appshell/react-host

## [0.2.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.1-alpha.0...@appshell/react-host@0.2.1) (2023-07-15)

**Note:** Version bump only for package @appshell/react-host

## [0.2.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0...@appshell/react-host@0.2.1-alpha.0) (2023-07-15)

### Bug Fixes

- add generate metadata to react-host startup command ([b8ade33](https://github.com/navaris/appshell/commit/b8ade33bc8bdf0d5bc612ce08846f2b9f26a3fd4))

# [0.2.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.8...@appshell/react-host@0.2.0) (2023-07-11)

### Bug Fixes

- reenable unit tests ([c00f581](https://github.com/navaris/appshell/commit/c00f581b2d71778378729f3bc42a4f5a1c0afe04))

# [0.2.0-alpha.8](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.7...@appshell/react-host@0.2.0-alpha.8) (2023-07-10)

### Bug Fixes

- rename @appshell/react-federated-component package to @appshell/react ([0b74498](https://github.com/navaris/appshell/commit/0b74498bf17ba73db4d936c8a012af1d3b111a28))

# [0.2.0-alpha.7](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.6...@appshell/react-host@0.2.0-alpha.7) (2023-07-10)

### Bug Fixes

- ship developer image with development build, urls for adjunct registries ([333f931](https://github.com/navaris/appshell/commit/333f9314854a93ab3f8e57dfde806baf26012e6c))

# [0.2.0-alpha.6](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.5...@appshell/react-host@0.2.0-alpha.6) (2023-07-10)

### Bug Fixes

- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/navaris/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))

# [0.2.0-alpha.5](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.4...@appshell/react-host@0.2.0-alpha.5) (2023-07-06)

### Bug Fixes

- metadata urls ([efcce1c](https://github.com/navaris/appshell/commit/efcce1ce4cb1745afa83661cae1414a73f837483))

# [0.2.0-alpha.4](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.3...@appshell/react-host@0.2.0-alpha.4) (2023-07-06)

### Bug Fixes

- support metadata generation ([4df202f](https://github.com/navaris/appshell/commit/4df202f0fd3b9ca6c660975b75eb0ac9b60225c2))

# [0.2.0-alpha.3](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.2...@appshell/react-host@0.2.0-alpha.3) (2023-07-06)

### Bug Fixes

- support metadata flag on cli start ([567cf02](https://github.com/navaris/appshell/commit/567cf02a52150054b855197371681f426382b454))

# [0.2.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.2.0-alpha.1...@appshell/react-host@0.2.0-alpha.2) (2023-07-06)

### Features

- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/navaris/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))

# [0.2.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.1...@appshell/react-host@0.2.0-alpha.1) (2023-07-05)

### Features

- foundation refactor wip ([339b930](https://github.com/navaris/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))

# [0.2.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.1...@appshell/react-host@0.2.0-alpha.0) (2023-07-05)

### Features

- registry index ([8e6ee0a](https://github.com/navaris/appshell/commit/8e6ee0a6a377584efa2ee702168025f46108b8c5))

## [0.1.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.1-alpha.1...@appshell/react-host@0.1.1) (2023-06-29)

**Note:** Version bump only for package @appshell/react-host

## [0.1.1-alpha.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0...@appshell/react-host@0.1.1-alpha.1) (2023-06-29)

**Note:** Version bump only for package @appshell/react-host

## [0.1.1-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0-alpha.3...@appshell/react-host@0.1.1-alpha.0) (2023-06-29)

**Note:** Version bump only for package @appshell/react-host

# [0.1.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0-alpha.3...@appshell/react-host@0.1.0) (2023-06-29)

**Note:** Version bump only for package @appshell/react-host

# [0.1.0-alpha.3](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0-alpha.2...@appshell/react-host@0.1.0-alpha.3) (2023-06-28)

### Features

- enable props to be passed to federated component rendered by react host ([e3a7273](https://github.com/navaris/appshell/commit/e3a72738455e179c9cc0b3f1ae29cf61b7c6d765))

# [0.1.0-alpha.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0-alpha.1...@appshell/react-host@0.1.0-alpha.2) (2023-06-26)

### Bug Fixes

- ignore dist from dev server ([66eaa4f](https://github.com/navaris/appshell/commit/66eaa4f0f7909de289aa25bd8962d0d018be8c89))

# [0.1.0-alpha.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.1.0-alpha.0...@appshell/react-host@0.1.0-alpha.1) (2023-06-26)

### Bug Fixes

- ignore manifest changes that force refresh ([ccb2155](https://github.com/navaris/appshell/commit/ccb2155a26bd3f6861f43805bb674ae4906375c1))

# [0.1.0-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.2-alpha.0...@appshell/react-host@0.1.0-alpha.0) (2023-06-22)

### Features

- support manifest merging and config watch ([5431d10](https://github.com/navaris/appshell/commit/5431d100ec7f5106cab66d3009ce5f836e452715))

## [0.0.2-alpha.0](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.1...@appshell/react-host@0.0.2-alpha.0) (2023-06-15)

### Bug Fixes

- enable history api fallback, include serve.json config, update publicPath value ([96af4fc](https://github.com/navaris/appshell/commit/96af4fc8cd14006aa477964daa4e37d29803191c))
- enable relative appshell_configs dir, containerize appshell host example ([79926f5](https://github.com/navaris/appshell/commit/79926f5e2b1ae29c4d7349c0babcb93d3b147485))
- hot module replacement support, example updates ([a67d230](https://github.com/navaris/appshell/commit/a67d2303b40f5911373225cc0b4ccf9b67c33d11))
- make runtime env generation prefix configurable ([28441a8](https://github.com/navaris/appshell/commit/28441a854cd03dfd4b89fb932efba571af221cd2))

## 0.0.1 (2023-06-15)

**Note:** Version bump only for package @appshell/react-host

## [0.0.1-alpha.4](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.1-alpha.3...@appshell/react-host@0.0.1-alpha.4) (2023-06-15)

### Bug Fixes

- hot module replacement support, example updates ([a67d230](https://github.com/navaris/appshell/commit/a67d2303b40f5911373225cc0b4ccf9b67c33d11))

## [0.0.1-alpha.3](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.1-alpha.2...@appshell/react-host@0.0.1-alpha.3) (2023-05-30)

### Bug Fixes

- enable relative appshell_configs dir, containerize appshell host example ([79926f5](https://github.com/navaris/appshell/commit/79926f5e2b1ae29c4d7349c0babcb93d3b147485))

## [0.0.1-alpha.2](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.1-alpha.1...@appshell/react-host@0.0.1-alpha.2) (2023-05-23)

### Bug Fixes

- enable history api fallback, include serve.json config, update publicPath value ([96af4fc](https://github.com/navaris/appshell/commit/96af4fc8cd14006aa477964daa4e37d29803191c))

## [0.0.1-alpha.1](https://github.com/navaris/appshell/compare/@appshell/react-host@0.0.1-alpha.0...@appshell/react-host@0.0.1-alpha.1) (2023-05-19)

### Bug Fixes

- make runtime env generation prefix configurable ([28441a8](https://github.com/navaris/appshell/commit/28441a854cd03dfd4b89fb932efba571af221cd2))

## 0.0.1-alpha.0 (2023-03-19)

**Note:** Version bump only for package @appshell/react-host
