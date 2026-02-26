# Changelog

All notable changes to `@honeide/themes` are documented here.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).
Versions follow [Semantic Versioning](https://semver.org/).

---

## [1.0.0] — 2024-01-01

### Added

#### Default Themes
- **Hone Dark** — Flagship dark theme. Deep blue-purple palette (Catppuccin Mocha inspired), high-contrast text, warm accents. Full semantic token support.
- **Hone Light** — Light counterpart to Hone Dark. Warm white background, same semantic color associations adjusted for light backgrounds.

#### Community Ports
- **Monokai** — Port of the classic Monokai theme by Wimer Hazenberg.
- **Solarized Dark** — Port of Solarized Dark by Ethan Schoonover.
- **Solarized Light** — Port of Solarized Light by Ethan Schoonover.
- **Nord** — Port of the Arctic Nord theme by Arctic Ice Studio.
- **Dracula** — Port of Dracula Theme by Zeno Rocha.
- **One Dark Pro** — Port of One Dark Pro by binaryify.
- **GitHub Dark** — Port of GitHub Dark by GitHub.
- **GitHub Light** — Port of GitHub Light by GitHub.
- **Catppuccin Mocha** — Port of Catppuccin Mocha by the Catppuccin organization.

#### Schema & Tooling
- `schema/theme-schema.json` — JSON Schema (draft-07) for Hone theme validation.
- `tools/import-vscode-theme.ts` — Convert VSCode JSON themes to Hone format.
- `tools/import-tmtheme.ts` — Convert TextMate `.tmTheme` (plist) files to Hone format.
- `tools/validate-theme.ts` — Validate themes against schema, check scope coverage and WCAG contrast.
- `tools/preview-theme.ts` — Generate standalone HTML previews of any theme.

#### Tests
- Schema validation tests — all bundled themes pass JSON Schema validation.
- Coverage tests — all themes provide required UI colors, token scopes, and pass minimum contrast ratios.

---

[1.0.0]: https://github.com/honeide/hone-themes/releases/tag/v1.0.0
