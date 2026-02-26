#!/usr/bin/env tsx
/**
 * import-tmtheme.ts
 * Convert a TextMate .tmTheme (XML plist) file to Hone JSON theme format.
 *
 * Usage:
 *   tsx tools/import-tmtheme.ts <input.tmTheme> <output.json>
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';
import plist from 'plist';

interface PlistTokenSettings {
  foreground?: string;
  background?: string;
  fontStyle?: string;
  caret?: string;
  selection?: string;
  lineHighlight?: string;
  invisibles?: string;
}

interface PlistSetting {
  name?: string;
  scope?: string;
  settings: PlistTokenSettings;
}

interface PlistTheme {
  name?: string;
  settings: PlistSetting[];
}

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
  $schema: string;
  name: string;
  type: string;
  colors: Record<string, string>;
  tokenColors: TokenColor[];
  semanticHighlighting: boolean;
  semanticTokenColors: Record<string, string | TokenSettings>;
}

/** Estimate perceived luminance from a hex color (0–1). */
function luminance(hex: string): number {
  const h = hex.replace('#', '').slice(0, 6);
  const r = parseInt(h.slice(0, 2), 16) / 255;
  const g = parseInt(h.slice(2, 4), 16) / 255;
  const b = parseInt(h.slice(4, 6), 16) / 255;
  const toLinear = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/** Blend a hex color toward black or white by `factor` (0–1). */
function blend(hex: string, toward: 'black' | 'white', factor: number): string {
  const h = hex.replace('#', '').slice(0, 6);
  const target = toward === 'black' ? 0 : 255;
  const r = Math.round(parseInt(h.slice(0, 2), 16) * (1 - factor) + target * factor);
  const g = Math.round(parseInt(h.slice(2, 4), 16) * (1 - factor) + target * factor);
  const b = Math.round(parseInt(h.slice(4, 6), 16) * (1 - factor) + target * factor);
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

function normalizeColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  // Strip alpha if present (8-digit hex) — keep as-is since schema supports it
  const match = color.match(/^#([0-9a-fA-F]{6,8})$/);
  return match ? color : undefined;
}

function buildColors(
  globalSettings: PlistTokenSettings,
  isDark: boolean,
): Record<string, string> {
  const bg = normalizeColor(globalSettings.background) ?? (isDark ? '#1e1e1e' : '#ffffff');
  const fg = normalizeColor(globalSettings.foreground) ?? (isDark ? '#d4d4d4' : '#383a42');
  const selection = normalizeColor(globalSettings.selection) ?? blend(bg, isDark ? 'white' : 'black', 0.15);
  const lineHighlight = normalizeColor(globalSettings.lineHighlight) ?? blend(bg, isDark ? 'white' : 'black', 0.08);
  const caret = normalizeColor(globalSettings.caret) ?? fg;

  const sidebar = blend(bg, isDark ? 'black' : 'black', 0.05);
  const border = blend(bg, isDark ? 'white' : 'black', 0.1);
  const muted = blend(fg, isDark ? 'black' : 'white', 0.4);

  return {
    'editor.background': bg,
    'editor.foreground': fg,
    'editor.selectionBackground': selection,
    'editor.lineHighlightBackground': lineHighlight,
    'editor.findMatchBackground': `${caret.slice(0, 7)}40`,
    'editor.findMatchHighlightBackground': `${caret.slice(0, 7)}20`,
    'editorCursor.foreground': caret,
    'editorLineNumber.foreground': muted,
    'editorLineNumber.activeForeground': fg,
    'editorGutter.addedBackground': isDark ? '#4ec994' : '#50a14f',
    'editorGutter.modifiedBackground': isDark ? '#89b4fa' : '#526fff',
    'editorGutter.deletedBackground': isDark ? '#f38ba8' : '#e45649',
    'editorIndentGuide.background': border,
    'editorIndentGuide.activeBackground': blend(border, isDark ? 'white' : 'black', 0.2),
    'editorWhitespace.foreground': border,
    'editorBracketMatch.background': `${selection.slice(0, 7)}80`,
    'editorBracketMatch.border': caret,
    'activityBar.background': sidebar,
    'activityBar.foreground': fg,
    'activityBar.inactiveForeground': muted,
    'sideBar.background': sidebar,
    'sideBar.foreground': fg,
    'sideBarTitle.foreground': fg,
    'sideBarSectionHeader.background': bg,
    'titleBar.activeBackground': sidebar,
    'titleBar.activeForeground': fg,
    'titleBar.inactiveBackground': sidebar,
    'tab.activeBackground': bg,
    'tab.activeForeground': fg,
    'tab.inactiveBackground': sidebar,
    'tab.inactiveForeground': muted,
    'tab.border': sidebar,
    'statusBar.background': sidebar,
    'statusBar.foreground': fg,
    'statusBar.debuggingBackground': isDark ? '#fab387' : '#e2a454',
    'panel.background': sidebar,
    'panel.border': border,
    'terminal.background': bg,
    'terminal.foreground': fg,
    'terminal.ansiBlack': isDark ? '#45475a' : '#383a42',
    'terminal.ansiRed': isDark ? '#f38ba8' : '#e45649',
    'terminal.ansiGreen': isDark ? '#a6e3a1' : '#50a14f',
    'terminal.ansiYellow': isDark ? '#f9e2af' : '#c18401',
    'terminal.ansiBlue': isDark ? '#89b4fa' : '#526fff',
    'terminal.ansiMagenta': isDark ? '#f5c2e7' : '#a626a4',
    'terminal.ansiCyan': isDark ? '#94e2d5' : '#0184bc',
    'terminal.ansiWhite': isDark ? '#bac2de' : '#fafafa',
    'terminal.ansiBrightBlack': isDark ? '#585b70' : '#4f525e',
    'terminal.ansiBrightRed': isDark ? '#f38ba8' : '#e45649',
    'terminal.ansiBrightGreen': isDark ? '#a6e3a1' : '#50a14f',
    'terminal.ansiBrightYellow': isDark ? '#f9e2af' : '#c18401',
    'terminal.ansiBrightBlue': isDark ? '#89b4fa' : '#526fff',
    'terminal.ansiBrightMagenta': isDark ? '#f5c2e7' : '#a626a4',
    'terminal.ansiBrightCyan': isDark ? '#94e2d5' : '#0184bc',
    'terminal.ansiBrightWhite': isDark ? '#a6adc8' : '#ffffff',
    'input.background': isDark ? blend(bg, 'white', 0.05) : '#ffffff',
    'input.foreground': fg,
    'input.border': border,
    'input.placeholderForeground': muted,
    'dropdown.background': isDark ? blend(bg, 'white', 0.05) : '#ffffff',
    'dropdown.foreground': fg,
    'dropdown.border': border,
    'button.background': caret,
    'button.foreground': isDark ? '#1e1e2e' : '#ffffff',
    'button.hoverBackground': blend(caret, isDark ? 'black' : 'black', 0.1),
    'list.activeSelectionBackground': selection,
    'list.activeSelectionForeground': fg,
    'list.hoverBackground': blend(bg, isDark ? 'white' : 'black', 0.05),
    'list.focusBackground': selection,
    'scrollbar.shadow': isDark ? '#00000040' : '#00000020',
    'scrollbarSlider.background': `${border.slice(0, 7)}80`,
    'scrollbarSlider.hoverBackground': `${border.slice(0, 7)}a0`,
    'scrollbarSlider.activeBackground': muted,
    'badge.background': caret,
    'badge.foreground': isDark ? '#1e1e2e' : '#ffffff',
    'minimap.background': sidebar,
    'minimap.selectionHighlight': selection,
    'minimap.findMatchHighlight': `${caret.slice(0, 7)}40`,
    'diffEditor.insertedTextBackground': `${(isDark ? '#a6e3a1' : '#50a14f').slice(0, 7)}20`,
    'diffEditor.removedTextBackground': `${(isDark ? '#f38ba8' : '#e45649').slice(0, 7)}20`,
    'notificationCenter.border': border,
    'notifications.background': isDark ? blend(bg, 'white', 0.05) : '#ffffff',
    'notifications.foreground': fg,
    'commandPalette.background': bg,
    'commandPalette.foreground': fg,
  };
}

function importTmTheme(inputPath: string, outputPath: string): void {
  const raw = readFileSync(inputPath, 'utf-8');
  const parsed = plist.parse(raw) as PlistTheme;

  if (!Array.isArray(parsed.settings) || parsed.settings.length === 0) {
    throw new Error('Invalid .tmTheme: missing settings array');
  }

  const [globalEntry, ...tokenEntries] = parsed.settings;
  const globalSettings = globalEntry.settings ?? {};

  const bgColor = normalizeColor(globalSettings.background) ?? '#1e1e1e';
  const isDark = luminance(bgColor) < 0.5;
  const themeType = isDark ? 'dark' : 'light';

  const tokenColors: TokenColor[] = tokenEntries
    .filter((entry) => entry.scope)
    .map((entry) => {
      const settings: TokenSettings = {};
      const fg = normalizeColor(entry.settings.foreground);
      const bg = normalizeColor(entry.settings.background);
      if (fg) settings.foreground = fg;
      if (bg) settings.background = bg;
      if (entry.settings.fontStyle) settings.fontStyle = entry.settings.fontStyle;
      return {
        ...(entry.name ? { name: entry.name } : {}),
        scope: entry.scope as string,
        settings,
      };
    });

  const themeName = parsed.name ?? basename(inputPath, '.tmTheme');

  const honeTheme: HoneTheme = {
    $schema: '../schema/theme-schema.json',
    name: themeName,
    type: themeType,
    colors: buildColors(globalSettings, isDark),
    tokenColors,
    semanticHighlighting: true,
    semanticTokenColors: {},
  };

  writeFileSync(outputPath, JSON.stringify(honeTheme, null, 2) + '\n');
  console.log(`Wrote ${outputPath}`);
}

const [, , input, output] = process.argv;
if (!input || !output) {
  console.error('Usage: tsx tools/import-tmtheme.ts <input.tmTheme> <output.json>');
  process.exit(1);
}

importTmTheme(resolve(input), resolve(output));
