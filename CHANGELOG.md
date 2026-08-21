# Change Log

All notable changes to this project will be documented in this file.
See [Conventional Commits](https://conventionalcommits.org) for commit guidelines.

# [1.0.0-alpha.12](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.11...v1.0.0-alpha.12) (2026-08-21)

### Bug Fixes

- **examples:** silence federation dts errors and bundled-react warning noise ([7a49b11](https://github.com/appshell-org/appshell/commit/7a49b118e9e745ab3c09fe38fd6ab4587512fd3d)), closes [#TYPE-001](https://github.com/appshell-org/appshell/issues/TYPE-001)
- **examples:** stop dev-server overlay from catching unrelated runtime errors ([10b4b86](https://github.com/appshell-org/appshell/commit/10b4b8676d9e7776377138ac9299a7fc99a7e910))
- improve local federation HMR and shell share behavior ([463d85c](https://github.com/appshell-org/appshell/commit/463d85ce0f18f6111a09b5d94d39d24fb813abc8))

# [1.0.0-alpha.11](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.10...v1.0.0-alpha.11) (2026-08-20)

### Features

- **loader:** migrate remote loading to @module-federation/enhanced runtime ([fda2d5d](https://github.com/appshell-org/appshell/commit/fda2d5ddfa5487f9aae55669392a08e55a491461)), closes [#RUNTIME-010](https://github.com/appshell-org/appshell/issues/RUNTIME-010)

# [1.0.0-alpha.10](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.9...v1.0.0-alpha.10) (2026-08-19)

**Note:** Version bump only for package appshell

# [1.0.0-alpha.9](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.8...v1.0.0-alpha.9) (2026-08-19)

### Bug Fixes

- **example:** resolve CSP/module-federation issues blocking local dev ([f8de4e1](https://github.com/appshell-org/appshell/commit/f8de4e1cfe495a7d4ae8e6374189384847c21309))

# [1.0.0-alpha.8](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.7...v1.0.0-alpha.8) (2026-08-19)

### Bug Fixes

- **webpack-plugin:** trim publish toggle env var ([07a7a9e](https://github.com/appshell-org/appshell/commit/07a7a9e4e9977c98f108bc99b7c50726c19c99d9))

# [1.0.0-alpha.7](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.6...v1.0.0-alpha.7) (2026-08-18)

**Note:** Version bump only for package appshell

**Note:** Version bump only for package appshell

# [1.0.0-alpha.6](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.5...v1.0.0-alpha.6) (2026-08-18)

**Note:** Version bump only for package appshell

# [1.0.0-alpha.5](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.4...v1.0.0-alpha.5) (2026-08-18)

**Note:** Version bump only for package appshell

**Note:** Version bump only for package appshell

# [1.0.0-alpha.4](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.3...v1.0.0-alpha.4) (2026-08-18)

**Note:** Version bump only for package appshell

**Note:** Version bump only for package appshell

# [1.0.0-alpha.3](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.2...v1.0.0-alpha.3) (2026-08-18)

**Note:** Version bump only for package appshell

# [1.0.0-alpha.1](https://github.com/appshell-org/appshell/compare/v1.0.0-alpha.0...v1.0.0-alpha.1) (2026-08-18)

### Bug Fixes

- **config:** tolerate empty cli config file ([dc483ae](https://github.com/appshell-org/appshell/commit/dc483ae88cfbf0f437c1700f273ff6a8b8b23dfb))

# 0.12.0-alpha.0 (2026-04-20)

### Bug Fixes

- add allow-override flag for cli ([9fbe018](https://github.com/appshell-org/appshell/commit/9fbe018e0c8047a1d98258271cd02a233206c070))
- add api-key support for appshell host ([817481a](https://github.com/appshell-org/appshell/commit/817481a0b25bec1d0eec38d4d5771d5941cf2f3d))
- add generate metadata to react-host startup command ([b8ade33](https://github.com/appshell-org/appshell/commit/b8ade33bc8bdf0d5bc612ce08846f2b9f26a3fd4))
- add shareScope support to appshell remotes ([ceb55c8](https://github.com/appshell-org/appshell/commit/ceb55c8f6deed27ad11cff841609b1656269a921))
- add useEffect dependencies for federated component ([616039e](https://github.com/appshell-org/appshell/commit/616039ebb3f46f34db0b82acfb6ee5438a6b4731))
- allow-overrides for start cli ([0684919](https://github.com/appshell-org/appshell/commit/06849198008df5cd492dfea59b1ffb0f139dfa66))
- appshell host runtime configuration ([#32](https://github.com/appshell-org/appshell/issues/32)) ([cd63ad0](https://github.com/appshell-org/appshell/commit/cd63ad0f031ede2fd9153707d418261238b382b2))
- appshell host startup script ([#34](https://github.com/appshell-org/appshell/issues/34)) ([e136d73](https://github.com/appshell-org/appshell/commit/e136d73fb92c8dfcb90648dcb0eb7b2ec8a365b1))
- appshell loader override check ([aedda4a](https://github.com/appshell-org/appshell/commit/aedda4abf81560297dce03df09fba68e8785242f))
- capture direct dependencies passed to FederatedComponent for re-render ([3621879](https://github.com/appshell-org/appshell/commit/36218793a5cb47f74bd8d1ce93deffdb1b85cd1c))
- configurable api key header support, minor fixes ([2f0bf02](https://github.com/appshell-org/appshell/commit/2f0bf027b92398f91b8e8cbfbf543d61fe37b7a0))
- default value for cli generate env --global-name ([040960c](https://github.com/appshell-org/appshell/commit/040960ce582a752919d59fa347346e2440abf997))
- detect shared dependency conflicts ([c290107](https://github.com/appshell-org/appshell/commit/c290107b4f7be93bf0b915371891db8b88f84678))
- docker env assignment ([05b73e7](https://github.com/appshell-org/appshell/commit/05b73e77730f89ab0d193baabd01eae4c6ddf07e))
- enable history api fallback, include serve.json config, update publicPath value ([96af4fc](https://github.com/appshell-org/appshell/commit/96af4fc8cd14006aa477964daa4e37d29803191c))
- enable insecure flag for cli generate index, metadata and start commands ([03f5e7f](https://github.com/appshell-org/appshell/commit/03f5e7fbd2ad3746ce648152c4410025958274a9))
- enable relative appshell_configs dir, containerize appshell host example ([79926f5](https://github.com/appshell-org/appshell/commit/79926f5e2b1ae29c4d7349c0babcb93d3b147485))
- entrypoint validation in manifest plugin for windows ([54768ee](https://github.com/appshell-org/appshell/commit/54768ee8c14e5678dc4b235d7eca4762e081cbbc))
- fixed examples ([0bd9bd5](https://github.com/appshell-org/appshell/commit/0bd9bd50d9cae9a2bc7367450e3041d2b50a144d))
- Fixed parsing of strings with more than one variable. ([#10](https://github.com/appshell-org/appshell/issues/10)) ([af21588](https://github.com/appshell-org/appshell/commit/af215886b858742ecf170a6e06a1d6bcba3fd39c))
- hot module replacement support, example updates ([a67d230](https://github.com/appshell-org/appshell/commit/a67d2303b40f5911373225cc0b4ccf9b67c33d11))
- ignore dist from dev server ([66eaa4f](https://github.com/appshell-org/appshell/commit/66eaa4f0f7909de289aa25bd8962d0d018be8c89))
- ignore manifest changes that force refresh ([ccb2155](https://github.com/appshell-org/appshell/commit/ccb2155a26bd3f6861f43805bb674ae4906375c1))
- lerna versioning scheme ([98ca8ce](https://github.com/appshell-org/appshell/commit/98ca8cec53215c63e09b970d70b79c751e17c076))
- lint ([a4861ab](https://github.com/appshell-org/appshell/commit/a4861abfe82d1e0ab815aaa62cdf7907229d0136))
- make --allow-overrides not a boolean flag ([0645ebe](https://github.com/appshell-org/appshell/commit/0645ebee7bfc84ba443925092871e659824a3550))
- make --allow-overrides not a boolean flag for start ([01aa9dd](https://github.com/appshell-org/appshell/commit/01aa9ddcc2a62965b1519ff63810892f4261880a))
- make react-refresh-singleton-plugin public for npm publishing ([2d2d9e3](https://github.com/appshell-org/appshell/commit/2d2d9e315c5d5369bb080ac34a618f9f79d336ee))
- make runtime env generation prefix configurable ([28441a8](https://github.com/appshell-org/appshell/commit/28441a854cd03dfd4b89fb932efba571af221cd2))
- metadata urls ([efcce1c](https://github.com/appshell-org/appshell/commit/efcce1ce4cb1745afa83661cae1414a73f837483))
- migrate to npm from yarn ([efa9566](https://github.com/appshell-org/appshell/commit/efa95663c2aaa8bf119febd767050837fe41a6ff))
- override support for appshell template schema ([f2b10d4](https://github.com/appshell-org/appshell/commit/f2b10d4e784d2d39b4602390b73b7db89bd88c34))
- override support for template mapper ([e79ad36](https://github.com/appshell-org/appshell/commit/e79ad36158c22ae0e6977bfff810cec543e0f828))
- produce pre-release on feature branches ([5f4d0d0](https://github.com/appshell-org/appshell/commit/5f4d0d05ca5cdd16a83f734f43835e162c476ddd))
- publish cli ([0ed6a10](https://github.com/appshell-org/appshell/commit/0ed6a10a4ed38456272d9f483acfcca8ba818981))
- reenable unit tests ([c00f581](https://github.com/appshell-org/appshell/commit/c00f581b2d71778378729f3bc42a4f5a1c0afe04))
- registry projection, enable env overwrite, refactor docker workflow, consolidate env names ([33a28fe](https://github.com/appshell-org/appshell/commit/33a28fe76b58e05c5b6b6b33d4b402e52bb29e70))
- remove npm logout in pipeline ([7ecdfc2](https://github.com/appshell-org/appshell/commit/7ecdfc2bf31105e8f5c5b0f819f23df62561465d))
- rename @appshell/react-federated-component package to @appshell/react ([0b74498](https://github.com/appshell-org/appshell/commit/0b74498bf17ba73db4d936c8a012af1d3b111a28))
- replace config intermediate file with template ([9b79e65](https://github.com/appshell-org/appshell/commit/9b79e65b355686a0cca273c89c7164bb031e8437))
- resolve npm audit vulnerabilities (74 → 4) ([ea3226c](https://github.com/appshell-org/appshell/commit/ea3226cea8e8c53f79ea5a112c1f72ff5039c4c2))
- schema validation only when registering manifests ([c0136fb](https://github.com/appshell-org/appshell/commit/c0136fb1cc9163e575c233e8330593a2a6c5a670))
- serve registry docs, update cli error reporting ([7338810](https://github.com/appshell-org/appshell/commit/73388109620c8ec83110b3b60063290214221a59))
- set fetch depth when publishing images ([f8ab910](https://github.com/appshell-org/appshell/commit/f8ab9102e3f3e2643b8268eefb0ae68396991b30))
- setup github actions build pipeline, setup project for release ([a54722f](https://github.com/appshell-org/appshell/commit/a54722f3df28098593ec1bce3cc2def377ff531a))
- ship developer image with development build, urls for adjunct registries ([333f931](https://github.com/appshell-org/appshell/commit/333f9314854a93ab3f8e57dfde806baf26012e6c))
- stylesheet url support for appshell host ([40e5368](https://github.com/appshell-org/appshell/commit/40e5368cf65e71eb2adbbcc432c846ba1539d14f))
- support metadata flag on cli start ([567cf02](https://github.com/appshell-org/appshell/commit/567cf02a52150054b855197371681f426382b454))
- support metadata generation ([4df202f](https://github.com/appshell-org/appshell/commit/4df202f0fd3b9ca6c660975b75eb0ac9b60225c2))
- update appshell commands for react-host ([a9d881c](https://github.com/appshell-org/appshell/commit/a9d881cc93b720b2aaf28f1765f7e671f265df3d))
- update cli appshell dependencies ([4780792](https://github.com/appshell-org/appshell/commit/47807929845471c48e47627c4baba985ac13cc4e))
- update cli appshell dependencies ([51150e7](https://github.com/appshell-org/appshell/commit/51150e7eb3637717f7ba36fedb3606e9407e803e))
- update lock file ([36f8d95](https://github.com/appshell-org/appshell/commit/36f8d95d844a31a175e4dfb84c3d814294228ef7))
- update manifest webpack plugin ([5ba2eca](https://github.com/appshell-org/appshell/commit/5ba2eca015d0482ab95ee5ef677b75a699327987))
- update pipeline actions for node 20 ([#33](https://github.com/appshell-org/appshell/issues/33)) ([3843e35](https://github.com/appshell-org/appshell/commit/3843e35af163c978e348299d97c29685e3a964db))
- update plugin project settings ([ffae926](https://github.com/appshell-org/appshell/commit/ffae926df93de250ed50dd797d109817a22145f0))
- update quotation around values during runtime env generation ([05f792e](https://github.com/appshell-org/appshell/commit/05f792efd163b2196d5c790e92dfa8f85afc1073))
- update readme and cli description ([d519e59](https://github.com/appshell-org/appshell/commit/d519e5948d1da8a3d9ba1b8fc734a36d8567cae3))
- update readme and package files ([2fc888e](https://github.com/appshell-org/appshell/commit/2fc888eee8bd3881e5ce2ad0c3bee186f5c7d024))
- update registy url for metadata ([20a9229](https://github.com/appshell-org/appshell/commit/20a92296289d3510ff9661654bac303c0ccd07b7))
- update repository URLs from navaris/appshell to appshell-org/appshell ([506a90d](https://github.com/appshell-org/appshell/commit/506a90d94a6f6e10f463987d408550f48624bfd0))
- use --validate-registry-ssl-cert instead of --insecure ([88a0575](https://github.com/appshell-org/appshell/commit/88a0575c52617a08da4b8bc08288ebce8f103586))

### Features

- api key support ([9cdcbee](https://github.com/appshell-org/appshell/commit/9cdcbee36e44b8a179b49768d74a25767f1cc5f2))
- appshell cli api key support, init sync and outdated commands ([#6](https://github.com/appshell-org/appshell/issues/6)) ([acc5fa2](https://github.com/appshell-org/appshell/commit/acc5fa234f91a167038161d5080481c43f8eb8b4))
- appshell start, cleanup dev workflow ([74fd2e5](https://github.com/appshell-org/appshell/commit/74fd2e5a5acd2415482268175c7f3f16cd7c93ec))
- AppshellComponent impl ([2b82621](https://github.com/appshell-org/appshell/commit/2b82621c13302f790a8e1c457f9a82f39903fc1f))
- consolidate runtime artifacts ([#26](https://github.com/appshell-org/appshell/issues/26)) ([a29479a](https://github.com/appshell-org/appshell/commit/a29479a49f0c5ec1273c9f8e4c7384096f2d4ba0))
- deregister cli command ([#24](https://github.com/appshell-org/appshell/issues/24)) ([746e827](https://github.com/appshell-org/appshell/commit/746e8273b366543a606cecadf18554bfc094143e))
- detect shared dependency conflicts ([2894b15](https://github.com/appshell-org/appshell/commit/2894b158262ba6e474853b7db086625cd7ecdda7))
- enable props to be passed to federated component rendered by react host ([e3a7273](https://github.com/appshell-org/appshell/commit/e3a72738455e179c9cc0b3f1ae29cf61b7c6d765))
- environment variable override for federated components ([#27](https://github.com/appshell-org/appshell/issues/27)) ([d32de0b](https://github.com/appshell-org/appshell/commit/d32de0b0d1cbb1792715e1b363c80ed4600df155))
- example mfe app producing global appshell manifest ([fbb4d26](https://github.com/appshell-org/appshell/commit/fbb4d26dce37fd928d67bbf10fccad8b8e035c84))
- foundation refactor wip ([339b930](https://github.com/appshell-org/appshell/commit/339b9306accaa9aba1712f3a0dee6c4cab7ed273))
- react-refresh-singleton-plugin ([42afa71](https://github.com/appshell-org/appshell/commit/42afa71b0e6122640e0ffff107702d5186ca65cf))
- support for proxying appshell calls ([ead8ff9](https://github.com/appshell-org/appshell/commit/ead8ff9024426a79a898de07adb587da74e0ba9c))
- support manifest merging and config watch ([5431d10](https://github.com/appshell-org/appshell/commit/5431d100ec7f5106cab66d3009ce5f836e452715))
- tooling setup, appshell-cli, appshell-manifest-webpack-plugin, appshell-utils ([23fb829](https://github.com/appshell-org/appshell/commit/23fb829db61a9ee9909176659dbde5c935c5233c))
