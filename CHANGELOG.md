# Changelog

All notable changes to this project will be documented in this file. See [standard-version](https://github.com/conventional-changelog/standard-version) for commit guidelines.

## [1.1.0](https://github.com/adamhamlin/vext/compare/v1.0.1...v1.1.0) (2025-07-20)


### Features

* add `toggleUrlEncoding` and `toggleBase64Encoding` commands ([#44](https://github.com/adamhamlin/vext/issues/44)) ([305c781](https://github.com/adamhamlin/vext/commit/305c781c27ae555ca83fd557c675056cd6e1ac67))

### [1.0.1](https://github.com/adamhamlin/vext/compare/v1.0.0...v1.0.1) (2024-08-09)


### Bug Fixes

* make @types/vscode match engines.vscode to fix publish ([#43](https://github.com/adamhamlin/vext/issues/43)) ([14b95f2](https://github.com/adamhamlin/vext/commit/14b95f2120a4c1bb621e9b400dee25108b140e7c))

## [1.0.0](https://github.com/adamhamlin/vext/compare/v0.7.0...v1.0.0) (2024-08-09)


### Features

* **toggleJsonToJsToYaml:** Make initial selections more forgiving ([#42](https://github.com/adamhamlin/vext/issues/42)) ([09c8d99](https://github.com/adamhamlin/vext/commit/09c8d997d3ea6c674566a84760ad1fe7f1ad06c8))

## [0.7.0](https://github.com/adamhamlin/vext/compare/v0.6.2...v0.7.0) (2023-10-12)


### Features

* Add `toggleNewlineChars` command ([#40](https://github.com/adamhamlin/vext/issues/40)) ([89cd1c5](https://github.com/adamhamlin/vext/commit/89cd1c5b9d44693711d933bcf4922c024be6923a))

### [0.6.2](https://github.com/adamhamlin/vext/compare/v0.6.1...v0.6.2) (2023-02-28)

### [0.6.1](https://github.com/adamhamlin/vext/compare/v0.6.0...v0.6.1) (2023-02-28)

## [0.6.0](https://github.com/adamhamlin/vext/compare/v0.5.2...v0.6.0) (2022-11-07)


### Features

* Add c8 coverage reporting/minimums, fix `toggleCommentType` edge cases, organize imports ([#31](https://github.com/adamhamlin/vext/issues/31)) ([696b512](https://github.com/adamhamlin/vext/commit/696b512990128728c89f4734e3c12d72eac853fd))

### [0.5.2](https://github.com/adamhamlin/vext/compare/v0.5.1...v0.5.2) (2022-10-19)


### Bug Fixes

* Remove highlighting from inferred comment toggle ([#29](https://github.com/adamhamlin/vext/issues/29)) ([2aade39](https://github.com/adamhamlin/vext/commit/2aade393edda336d1b9afd81029e512ae0652d53))

### [0.5.1](https://github.com/adamhamlin/vext/compare/v0.5.0...v0.5.1) (2022-10-15)


### Bug Fixes

* Change env var `TESTING` -> `VEXT_TESTING` ([#27](https://github.com/adamhamlin/vext/issues/27)) ([931e20e](https://github.com/adamhamlin/vext/commit/931e20e29021a31764b0055c03b81168f57953a6))

## [0.5.0](https://github.com/adamhamlin/vext/compare/v0.4.0...v0.5.0) (2022-10-03)


### Features

* Detect comments without highlighting ([#23](https://github.com/adamhamlin/vext/issues/23)) ([b3634de](https://github.com/adamhamlin/vext/commit/b3634de68bfa343bd4251dff57fc51ea0caca30a))

## [0.4.0](https://github.com/adamhamlin/vext/compare/v0.3.1...v0.4.0) (2022-07-31)


### Features

* Support YAML for toggleJsonToJs (renamed to toggleJsonToJsToYaml) ([#22](https://github.com/adamhamlin/vext/issues/22)) ([31be19d](https://github.com/adamhamlin/vext/commit/31be19d48e55d288862613a68bb608858327520d))


### Bug Fixes

* Fix quoting behavior when cursor at end of word ([#21](https://github.com/adamhamlin/vext/issues/21)) ([b247472](https://github.com/adamhamlin/vext/commit/b247472693d78d3bb49a4f0eb9639247fab6a495))

### [0.3.1](https://github.com/adamhamlin/vext/compare/v0.3.0...v0.3.1) (2022-04-18)

## [0.3.0](https://github.com/adamhamlin/vext/compare/v0.2.1...v0.3.0) (2022-04-18)


### Features

* Add toggleJsonToJs command ([#16](https://github.com/adamhamlin/vext/issues/16)) ([018b5a0](https://github.com/adamhamlin/vext/commit/018b5a0384797a015cc7d43a58ff504ce1f959df))
* Allow top-level array for toggleJsonToJs command ([#17](https://github.com/adamhamlin/vext/issues/17)) ([44199a9](https://github.com/adamhamlin/vext/commit/44199a9107d8bbe00ab5a4c81f66ac6ce93b445e))
* Support `Toggle Quotes` with selections and toggling quotes on/off ([#15](https://github.com/adamhamlin/vext/issues/15)) ([dc9345c](https://github.com/adamhamlin/vext/commit/dc9345cd0bc2df34cc1260864a942fc68cd26d3b))

### [0.2.1](https://github.com/adamhamlin/vext/compare/v0.2.0...v0.2.1) (2022-03-12)


### Bug Fixes

* Handle JSON comments appearing in lang configs ([#14](https://github.com/adamhamlin/vext/issues/14)) ([5be3254](https://github.com/adamhamlin/vext/commit/5be3254df8b99976bbbeb6b08feedf1203338857))

## [0.2.0](https://github.com/adamhamlin/vext/compare/v0.1.2...v0.2.0) (2021-12-13)


### Features

* Add toggle variable naming format command ([#13](https://github.com/adamhamlin/vext/issues/13)) ([1abbc2b](https://github.com/adamhamlin/vext/commit/1abbc2b154fc2493201a9e142eba78eb03386d08))
* Add toggleCase command ([#12](https://github.com/adamhamlin/vext/issues/12)) ([46928f7](https://github.com/adamhamlin/vext/commit/46928f788b7133eb0ebf36adfcacfce0e1672049))
