# CLAUDE.md — hone-themes

## What This Repo Is

`hone-themes` is a collection of VSCode-compatible color themes for Hone IDE. It is a **pure data package** — no runtime dependencies. Themes are static JSON files. The tooling scripts (TypeScript) are dev-only.

**Role in ecosystem:** Layer 0 — zero `@honeide/*` dependencies. Loaded at runtime by `hone-ide`'s theme engine.

---

## Repository Structure

```
hone-themes/
├── themes/                        # Theme JSON files (11 built-in)
│   ├── hone-dark.json             # Default dark theme
│   ├── hone-light.json            # Default light theme
│   ├── monokai.json
│   ├── solarized-dark.json
│   ├── solarized-light.json
│   ├── nord.json
│   ├── dracula.json
│   ├── one-dark.json
│   ├── github-dark.json
│   ├── github-light.json
│   └── catppuccin.json
│
├── schema/
│   └── theme-schema.json          # JSON Schema draft-07 for validation
│
├── tools/
│   ├── import-vscode-theme.ts     # VSCode JSON theme → Hone converter
│   ├── import-tmtheme.ts          # TextMate .tmTheme (plist) → Hone converter
│   ├── validate-theme.ts          # Validate against schema + WCAG contrast
│   └── preview-theme.ts           # Generate HTML preview
│
├── tests/
│   ├── schema-validation.test.ts  # Every theme passes JSON Schema
│   └── coverage.test.ts           # UI colors, token scopes, contrast ratios
│
├── package.json                   # @honeide/themes — Jest test runner
├── tsconfig.json
├── CONTRIBUTING.md
├── CHANGELOG.md
└── LICENSE                        # MIT
```

---

## Common Commands

```bash
npm test                                          # Run all tests (452 tests, ~2s)
tsx tools/validate-theme.ts themes/hone-dark.json # Validate a single theme
tsx tools/preview-theme.ts themes/hone-dark.json  # Generate HTML preview
tsx tools/import-vscode-theme.ts in.json out.json # Convert VSCode theme
tsx tools/import-tmtheme.ts in.tmTheme out.json   # Convert TextMate theme
```

---

## Theme Format

Themes use the **VSCode color theme JSON format** exactly. This means any VSCode theme can be imported with minimal changes.

### Required fields

```json
{
  "name": "Theme Name",
  "type": "dark",           // "dark" | "light" | "hc-dark" | "hc-light"
  "colors": { ... },        // UI color map (hex only: #RRGGBB or #RRGGBBAA)
  "tokenColors": [ ... ],   // TextMate grammar token rules
  "semanticHighlighting": true,
  "semanticTokenColors": { ... }
}
```

### Hone-specific color keys (not in standard VSCode)

| Key | Description |
|-----|-------------|
| `commandPalette.background` | Command palette panel background |
| `commandPalette.foreground` | Command palette text |

All other keys are 1:1 with VSCode. Unknown keys are allowed by the schema's `additionalProperties`.

### Minimum required token scopes

Every theme must cover: `comment`, `string`, `constant.numeric`, `keyword`, `entity.name.function`, `entity.name.type`, `variable`, `punctuation`.

### Color format

**Hex only.** Pattern: `^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$`

No `rgb()`, `hsl()`, or named colors. This keeps themes simple and VSCode-compatible.

---

## Adding a New Theme

1. **Port from VSCode JSON:**
   ```bash
   tsx tools/import-vscode-theme.ts original.json themes/my-theme.json
   ```

2. **Port from TextMate `.tmTheme`:**
   ```bash
   tsx tools/import-tmtheme.ts original.tmTheme themes/my-theme.json
   ```

3. **From scratch:** Copy `themes/hone-dark.json` and edit.

4. Validate:
   ```bash
   tsx tools/validate-theme.ts themes/my-theme.json
   ```

5. Run tests:
   ```bash
   npm test
   ```

See `CONTRIBUTING.md` for full requirements.

---

## Test Strategy

- **`tests/schema-validation.test.ts`** — Every `.json` in `themes/` passes the JSON Schema. Runs on CI on every commit.
- **`tests/coverage.test.ts`** — Per-theme checks:
  - All 24 required UI color keys present and valid hex
  - All 8 required token scopes covered
  - `type` is a valid enum value
  - All color values match the hex pattern
  - Editor foreground/background contrast ≥ 3:1 (hard fail)
  - Editor contrast < 4.5:1 (WCAG AA) emits a warning but does not fail

Known warning: Solarized Light has 4.13:1 contrast (intentional — faithful to the original palette).

---

## Key Implementation Notes

### Jest + dot-notation property keys

Jest's `toHaveProperty("editor.background")` treats `.` as a path separator, so it looks for `obj.editor.background` rather than `obj["editor.background"]`. Always use `Object.prototype.hasOwnProperty.call(obj, key)` when testing color map keys.

### JSON Schema `additionalProperties`

The `colors` object uses `"additionalProperties": { "$ref": "#/definitions/color" }`, which means any extra color key is valid as long as its value is a hex string. This future-proofs themes against new Hone UI elements.

### `import-tmtheme.ts` luminance detection

The converter auto-detects `dark`/`light` by computing the WCAG relative luminance of the background color. Luminance < 0.5 → dark theme. It then derives all UI colors (sidebar, tabs, terminal ANSI, scrollbars, etc.) from the base palette using a blend function.

### `import-vscode-theme.ts` JSONC support

VSCode themes are often JSONC (JSON with comments). The importer strips `//` line comments and `/* */` block comments before parsing.

---

## Distribution

Themes ship as part of `hone-ide` (bundled at build time) and as a standalone npm package:

```json
{
  "name": "@honeide/themes",
  "files": ["themes/", "schema/"]
}
```

Only `themes/` and `schema/` are published. Tooling and tests are excluded.
