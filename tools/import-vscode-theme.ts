#!/usr/bin/env tsx
/**
 * import-vscode-theme.ts
 * Convert a VSCode JSON color theme to Hone theme format.
 *
 * Usage:
 *   tsx tools/import-vscode-theme.ts <input.json> <output.json>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';

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

interface VSCodeTheme {
  name?: string;
  type?: string;
  colors?: Record<string, string>;
  tokenColors?: TokenColor[];
  semanticHighlighting?: boolean;
  semanticTokenColors?: Record<string, string | TokenSettings>;
}

interface HoneTheme {
  $schema: string;
  name: string;
  type: string;
  colors: Record<string, string>;
  tokenColors: TokenColor[];
  semanticHighlighting: boolean;
  semanticTokenColors: Record<string, string | TokenSettings>;
}

function deriveHoneColors(colors: Record<string, string>): Record<string, string> {
  const bg = colors['editor.background'] ?? '#1e1e1e';
  const fg = colors['editor.foreground'] ?? '#d4d4d4';

  // Hone-specific keys not in standard VSCode themes — derive sensible defaults
  const honeDefaults: Record<string, string> = {
    'commandPalette.background':
      colors['quickInput.background'] ??
      colors['quickInputList.focusBackground'] ??
      bg,
    'commandPalette.foreground':
      colors['quickInput.foreground'] ??
      fg,
  };

  return { ...honeDefaults, ...colors };
}

function importVSCodeTheme(inputPath: string, outputPath: string): void {
  const raw = readFileSync(inputPath, 'utf-8');

  // Strip JSON comments (VSCode themes often use JSONC)
  const stripped = raw.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  const theme: VSCodeTheme = JSON.parse(stripped);

  if (!theme.colors) throw new Error('Input theme is missing "colors"');
  if (!theme.tokenColors) throw new Error('Input theme is missing "tokenColors"');

  const honeTheme: HoneTheme = {
    $schema: '../schema/theme-schema.json',
    name: theme.name ?? 'Imported Theme',
    type: theme.type ?? 'dark',
    colors: deriveHoneColors(theme.colors),
    tokenColors: theme.tokenColors,
    semanticHighlighting: theme.semanticHighlighting ?? true,
    semanticTokenColors: theme.semanticTokenColors ?? {},
  };

  writeFileSync(outputPath, JSON.stringify(honeTheme, null, 2) + '\n');
  console.log(`Wrote ${outputPath}`);
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: tsx tools/import-vscode-theme.ts <input.json> <output.json>');
  process.exit(1);
}

importVSCodeTheme(resolve(input), resolve(output));
