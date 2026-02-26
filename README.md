# hone-themes

Color themes for [Hone](https://hone.codes) — a VSCode-compatible theme collection.

Hone uses the VSCode color theme format, so any existing VSCode theme works out of the box. This package ships 11 curated themes and provides tooling to import and validate any others.

---

## Themes

| Theme | Type | Description |
|-------|------|-------------|
| **Hone Dark** | dark | Default dark theme. Deep blue-purple palette, warm accents. |
| **Hone Light** | light | Default light theme. Clean warm white, high contrast. |
| **Monokai** | dark | Classic Monokai by Wimer Hazenberg. |
| **Solarized Dark** | dark | Solarized Dark by Ethan Schoonover. |
| **Solarized Light** | light | Solarized Light by Ethan Schoonover. |
| **Nord** | dark | Arctic Nord by Arctic Ice Studio. |
| **Dracula** | dark | Dracula Theme by Zeno Rocha. |
| **One Dark Pro** | dark | One Dark Pro by binaryify. |
| **GitHub Dark** | dark | GitHub Dark by GitHub. |
| **GitHub Light** | light | GitHub Light by GitHub. |
| **Catppuccin Mocha** | dark | Catppuccin Mocha by the Catppuccin org. |

---

## Installation

```bash
npm install @honeide/themes
```

Or use themes directly from the `themes/` directory — they are plain JSON files with no build step required.

---

## Usage

Themes are loaded by `hone-ide`'s theme engine at runtime. Each `.json` file in `themes/` is a complete, self-contained theme.

```ts
import honeDark from '@honeide/themes/themes/hone-dark.json';
// honeDark.colors['editor.background'] → '#1e1e2e'
// honeDark.tokenColors → [ ... ]
```

---

## Schema

All themes conform to `schema/theme-schema.json` (JSON Schema draft-07). The schema is a superset of the VSCode color theme format, adding required keys for Hone-specific UI elements.

Validate any theme against it:

```bash
tsx tools/validate-theme.ts themes/my-theme.json
```

Checks performed:
- JSON Schema conformance
- All required UI color keys present
- All color values are valid hex (`#RRGGBB` or `#RRGGBBAA`)
- Minimum token scope coverage (`comment`, `string`, `keyword`, `entity.name.function`, etc.)
- WCAG contrast ratio — warns below 4.5:1, fails below 3:1

---

## Tooling

### Import a VSCode theme

```bash
tsx tools/import-vscode-theme.ts path/to/theme.json themes/output.json
```

Converts any VSCode JSON color theme to Hone format. Strips JSONC comments, derives Hone-specific UI color keys from standard VSCode equivalents.

### Import a TextMate theme

```bash
tsx tools/import-tmtheme.ts path/to/theme.tmTheme themes/output.json
```

Converts `.tmTheme` (XML plist) files to Hone JSON format. Auto-detects dark/light from background luminance. Derives all UI colors from the theme's base palette.

### Generate a preview

```bash
tsx tools/preview-theme.ts themes/hone-dark.json
# → hone-dark.preview.html
```

Generates a standalone HTML file showing:
- Syntax-highlighted TypeScript code sample
- Token color chips for every rule
- UI color swatches grouped by area (editor, sidebar, tabs, terminal ANSI)

---

## Adding a Theme

See [CONTRIBUTING.md](./CONTRIBUTING.md) for the full guide.

**Quick version:**

1. Import or create a theme JSON file in `themes/`
2. Validate: `tsx tools/validate-theme.ts themes/my-theme.json`
3. Run tests: `npm test`
4. Open a pull request

Every theme must:
- Pass the JSON Schema
- Define all required UI colors
- Cover the minimum token scopes
- Use hex colors only
- Include an `attribution` field if porting a community theme

---

## Tests

```bash
npm test
```

452 tests across two suites:

- **`tests/schema-validation.test.ts`** — Every theme in `themes/` passes the JSON Schema.
- **`tests/coverage.test.ts`** — Every theme has all required UI colors, token scope coverage, valid hex values, and meets minimum contrast ratios.

---

## Theme Format Reference

```jsonc
{
  "$schema": "../schema/theme-schema.json",
  "name": "My Theme",
  "type": "dark",              // "dark" | "light" | "hc-dark" | "hc-light"

  "colors": {
    // Editor
    "editor.background": "#1e1e2e",
    "editor.foreground": "#cdd6f4",
    "editor.selectionBackground": "#45475a",
    "editor.lineHighlightBackground": "#2a2b3d",
    "editorCursor.foreground": "#f5e0dc",
    "editorLineNumber.foreground": "#6c7086",
    "editorLineNumber.activeForeground": "#cdd6f4",

    // Gutter diff indicators
    "editorGutter.addedBackground": "#a6e3a1",
    "editorGutter.modifiedBackground": "#89b4fa",
    "editorGutter.deletedBackground": "#f38ba8",

    // Activity bar, sidebar, tabs, status bar, terminal...
    // (see schema/theme-schema.json for the full list)

    // Hone-specific
    "commandPalette.background": "#1e1e2e",
    "commandPalette.foreground": "#cdd6f4"
  },

  "tokenColors": [
    {
      "name": "Comment",
      "scope": ["comment", "punctuation.definition.comment"],
      "settings": { "foreground": "#6c7086", "fontStyle": "italic" }
    }
    // ...
  ],

  "semanticHighlighting": true,
  "semanticTokenColors": {
    "function": "#89b4fa",
    "variable.readonly": "#fab387",
    "interface": { "foreground": "#f9e2af", "fontStyle": "italic" }
  }
}
```

All color values must be hex strings (`#RRGGBB` or `#RRGGBBAA`). No `rgb()`, `hsl()`, or named colors.

---

## Project Structure

```
hone-themes/
├── themes/             # 11 theme JSON files
├── schema/             # JSON Schema for theme validation
├── tools/              # TypeScript import/validate/preview scripts
├── tests/              # Jest test suites
├── package.json
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE             # MIT
```

---

## License

MIT — see [LICENSE](./LICENSE).

Community theme ports retain their original authors' attributions. Each ported theme includes an `attribution` field with the original author and license.
