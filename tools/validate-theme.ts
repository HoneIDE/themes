#!/usr/bin/env tsx
/**
 * validate-theme.ts
 * Validate a Hone theme file against the schema and check completeness.
 *
 * Usage:
 *   tsx tools/validate-theme.ts <theme.json> [theme2.json ...]
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import Ajv from 'ajv';

const SCHEMA_PATH = resolve(__dirname, '../schema/theme-schema.json');

interface TokenSettings {
  foreground?: string;
  background?: string;
  fontStyle?: string;
}

interface TokenColor {
  name?: string;
  scope: string | string[];
  settings: TokenSettings;
}

interface HoneTheme {
  name: string;
  type: string;
  colors: Record<string, string>;
  tokenColors: TokenColor[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, string | TokenSettings>;
}

const REQUIRED_UI_COLORS = [
  'editor.background',
  'editor.foreground',
  'editor.selectionBackground',
  'editor.lineHighlightBackground',
  'editorCursor.foreground',
  'editorLineNumber.foreground',
  'activityBar.background',
  'activityBar.foreground',
  'sideBar.background',
  'sideBar.foreground',
  'tab.activeBackground',
  'tab.inactiveBackground',
  'statusBar.background',
  'statusBar.foreground',
  'terminal.background',
  'terminal.foreground',
  'terminal.ansiBlack',
  'terminal.ansiRed',
  'terminal.ansiGreen',
  'terminal.ansiYellow',
  'terminal.ansiBlue',
  'terminal.ansiMagenta',
  'terminal.ansiCyan',
  'terminal.ansiWhite',
];

const REQUIRED_TOKEN_SCOPES = [
  'comment',
  'string',
  'constant.numeric',
  'keyword',
  'entity.name.function',
  'entity.name.type',
  'variable',
  'punctuation',
];

const COLOR_RE = /^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/;

/** WCAG relative luminance of an sRGB channel value (0–255). */
function channelLuminance(c: number): number {
  const s = c / 255;
  return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
}

function hexLuminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  const r = channelLuminance(parseInt(h.slice(0, 2), 16));
  const g = channelLuminance(parseInt(h.slice(2, 4), 16));
  const b = channelLuminance(parseInt(h.slice(4, 6), 16));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(a: string, b: string): number {
  const l1 = hexLuminance(a);
  const l2 = hexLuminance(b);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

interface ValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
}

function validateTheme(filePath: string): ValidationResult {
  const result: ValidationResult = { file: filePath, errors: [], warnings: [] };

  // 1. Parse JSON
  let theme: HoneTheme;
  try {
    theme = JSON.parse(readFileSync(filePath, 'utf-8')) as HoneTheme;
  } catch (e) {
    result.errors.push(`Invalid JSON: ${(e as Error).message}`);
    return result;
  }

  // 2. Schema validation
  const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
  const ajv = new Ajv({ allErrors: true });
  const validate = ajv.compile(schema);
  if (!validate(theme)) {
    for (const err of validate.errors ?? []) {
      result.errors.push(`Schema: ${err.instancePath || '(root)'} ${err.message}`);
    }
  }

  // 3. Required UI colors
  for (const key of REQUIRED_UI_COLORS) {
    if (!theme.colors?.[key]) {
      result.errors.push(`Missing required UI color: ${key}`);
    }
  }

  // 4. All color values are valid hex
  for (const [key, value] of Object.entries(theme.colors ?? {})) {
    if (!COLOR_RE.test(value)) {
      result.errors.push(`Invalid color value for "${key}": ${value}`);
    }
  }

  // 5. Minimum token scope coverage
  const allScopes = (theme.tokenColors ?? []).flatMap((tc) =>
    Array.isArray(tc.scope) ? tc.scope : [tc.scope],
  );

  for (const required of REQUIRED_TOKEN_SCOPES) {
    const covered = allScopes.some(
      (scope) => scope === required || scope.startsWith(required + '.') || scope.startsWith(required + ' '),
    );
    if (!covered) {
      result.errors.push(`Missing token scope coverage: ${required}`);
    }
  }

  // 6. Contrast ratio (WCAG AA)
  const bg = theme.colors?.['editor.background'];
  const fg = theme.colors?.['editor.foreground'];
  if (bg && fg && COLOR_RE.test(bg) && COLOR_RE.test(fg)) {
    const ratio = contrastRatio(bg, fg);
    if (ratio < 4.5) {
      if (ratio < 3) {
        result.errors.push(
          `editor.background / editor.foreground contrast ratio is ${ratio.toFixed(2)}:1 (minimum 4.5:1 for WCAG AA)`,
        );
      } else {
        result.warnings.push(
          `editor.background / editor.foreground contrast ratio is ${ratio.toFixed(2)}:1 (below 4.5:1 WCAG AA)`,
        );
      }
    }
  }

  return result;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: tsx tools/validate-theme.ts <theme.json> [theme2.json ...]');
  process.exit(1);
}

let hasErrors = false;

for (const file of files) {
  const result = validateTheme(resolve(file));
  const label = result.file;

  if (result.errors.length === 0 && result.warnings.length === 0) {
    console.log(`✓ ${label}`);
  } else {
    if (result.errors.length > 0) {
      hasErrors = true;
      console.error(`✗ ${label}`);
      for (const e of result.errors) console.error(`    ERROR: ${e}`);
    }
    for (const w of result.warnings) console.warn(`    WARN:  ${w}`);
  }
}

process.exit(hasErrors ? 1 : 0);
