# Contributing to hone-themes

Thank you for your interest in contributing themes to Hone!

## Adding a New Theme

### Option A — Port an existing VSCode theme

1. Download the theme's `.json` file from its VSCode extension source.
2. Run the importer:
   ```bash
   tsx tools/import-vscode-theme.ts path/to/original.json themes/my-theme.json
   ```
3. Review the output and adjust any Hone-specific UI colors (see below).
4. Validate and run tests.

### Option B — Port a TextMate theme

1. Obtain the `.tmTheme` file.
2. Run the importer:
   ```bash
   tsx tools/import-tmtheme.ts path/to/theme.tmTheme themes/my-theme.json
   ```
3. Review the generated UI colors (derived automatically from the palette).
4. Validate and run tests.

### Option C — Create a new theme from scratch

1. Copy `themes/hone-dark.json` (or `hone-light.json`) as a starting point.
2. Edit the color values.
3. Validate and run tests.

---

## Theme Requirements

Every theme **must**:

- Validate against `schema/theme-schema.json`
- Define all required UI color keys (see schema `required` list)
- Cover the minimum token scopes:
  - `comment`, `string`, `constant.numeric`, `keyword`, `entity.name.function`, `entity.name.type`, `variable`, `punctuation`
- Use hex color values only (`#RRGGBB` or `#RRGGBBAA`)
- Have `type` set to `"dark"` or `"light"`
- Meet a minimum editor foreground/background contrast ratio of **3:1** (WCAG AA requires 4.5:1)
- Include a `semanticHighlighting` field and `semanticTokenColors` map

For community ports, add an `attribution` field citing the original author and license.

---

## Hone-Specific UI Colors

Hone has UI elements not present in standard VSCode themes. Ensure these are set:

| Key | Description |
|-----|-------------|
| `commandPalette.background` | Command palette panel background |
| `commandPalette.foreground` | Command palette text |

These are usually derived from `quickInput.background` / `quickInput.foreground` in the original VSCode theme, or fall back to `editor.background` / `editor.foreground`.

---

## Validate Your Theme

```bash
tsx tools/validate-theme.ts themes/my-theme.json
```

This checks:
- JSON schema conformance
- Required UI colors present
- All color values are valid hex
- Token scope coverage
- WCAG contrast ratios

---

## Generate a Preview

```bash
tsx tools/preview-theme.ts themes/my-theme.json
```

Opens `my-theme.preview.html` in your browser to visually inspect the theme.

---

## Run the Test Suite

```bash
npm test
```

All themes in `themes/` are automatically picked up by the test suite.

---

## License

By contributing a theme, you agree that your contribution is licensed under the MIT License. For community ports, ensure the original theme's license permits redistribution (most popular themes use MIT).

---

## Style Guide

- Use 2-space indentation in JSON files
- Keep color hex values lowercase (`#1e1e2e`, not `#1E1E2E`)
- Provide an `attribution` field for any ported theme
- Name the theme file using kebab-case matching the theme `name` field
