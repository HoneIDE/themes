#!/usr/bin/env tsx
/**
 * preview-theme.ts
 * Generate a standalone HTML preview of a Hone theme.
 *
 * Usage:
 *   tsx tools/preview-theme.ts <theme.json> [output.html]
 *   (output defaults to <theme-name>.preview.html)
 */

import { readFileSync, writeFileSync } from 'fs';
import { resolve, basename } from 'path';

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

const SAMPLE_CODE = `// TypeScript sample — rendered with theme colors
import { readFileSync } from 'fs';

interface Config {
  name: string;
  version: number;
  debug?: boolean;
}

const DEFAULT_VERSION = 42;

/**
 * Load and parse a JSON config file.
 */
async function loadConfig(path: string): Promise<Config> {
  const raw = readFileSync(path, 'utf-8');
  const parsed = JSON.parse(raw) as Config;
  if (!parsed.name) throw new Error('Config missing name');
  return { debug: false, ...parsed };
}

class ThemeManager {
  private themes: Map<string, Config> = new Map();

  register(theme: Config): void {
    this.themes.set(theme.name, theme);
  }

  get(name: string): Config | undefined {
    return this.themes.get(name);
  }
}

// Entry point
const manager = new ThemeManager();
loadConfig('./config.json').then((cfg) => {
  manager.register(cfg);
  console.log(\`Loaded: \${cfg.name} v\${cfg.version}\`);
});`;

/** Resolve a token color from the theme's tokenColors for a given scope. */
function resolveTokenColor(theme: HoneTheme, scopeName: string): TokenSettings {
  for (const rule of theme.tokenColors) {
    const scopes = Array.isArray(rule.scope) ? rule.scope : [rule.scope];
    for (const scope of scopes) {
      if (scopeName === scope || scopeName.startsWith(scope + '.')) {
        return rule.settings;
      }
    }
  }
  return {};
}

function buildFontStyle(fontStyle?: string): string {
  if (!fontStyle) return '';
  const parts = fontStyle.split(' ');
  const styles: string[] = [];
  if (parts.includes('italic')) styles.push('font-style: italic;');
  if (parts.includes('bold')) styles.push('font-weight: bold;');
  if (parts.includes('underline')) styles.push('text-decoration: underline;');
  if (parts.includes('strikethrough')) styles.push('text-decoration: line-through;');
  return styles.join(' ');
}

function span(text: string, settings: TokenSettings): string {
  const styles: string[] = [];
  if (settings.foreground) styles.push(`color: ${settings.foreground};`);
  if (settings.background) styles.push(`background: ${settings.background};`);
  styles.push(buildFontStyle(settings.fontStyle));
  const style = styles.join(' ').trim();
  if (!style) return escHtml(text);
  return `<span style="${style}">${escHtml(text)}</span>`;
}

function escHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Very simple token colorizer — good enough for a preview. */
function colorizeCode(code: string, theme: HoneTheme): string {
  const fg = theme.colors['editor.foreground'] ?? '#d4d4d4';

  // Token patterns in priority order
  const patterns: Array<{ re: RegExp; scope: string }> = [
    { re: /\/\/[^\n]*/g, scope: 'comment.line' },
    { re: /\/\*[\s\S]*?\*\//g, scope: 'comment.block' },
    { re: /`[^`]*`/g, scope: 'string.template' },
    { re: /"(?:[^"\\]|\\.)*"/g, scope: 'string.quoted.double' },
    { re: /'(?:[^'\\]|\\.)*'/g, scope: 'string.quoted.single' },
    { re: /\b(import|export|from|const|let|var|function|async|await|class|interface|extends|implements|new|return|throw|if|else|for|while|of|in|typeof|instanceof|void|undefined|null|true|false|type|as|private|public|readonly)\b/g, scope: 'keyword' },
    { re: /\b\d+(\.\d+)?\b/g, scope: 'constant.numeric' },
    { re: /\b([A-Z][A-Za-z0-9]*)\b(?=\s*[<({]|\s+\w)/g, scope: 'entity.name.type' },
    { re: /\b([a-zA-Z_$][a-zA-Z0-9_$]*)\s*(?=\()/g, scope: 'entity.name.function' },
    { re: /[{}()\[\];:,.<>]/g, scope: 'punctuation' },
    { re: /[=+\-*/%&|^!~?]/g, scope: 'keyword.operator' },
  ];

  // Build segments
  type Seg = { start: number; end: number; scope: string };
  const segments: Seg[] = [];

  for (const { re, scope } of patterns) {
    re.lastIndex = 0;
    let m: RegExpExecArray | null;
    while ((m = re.exec(code)) !== null) {
      // Check for overlap
      const overlaps = segments.some((s) => m!.index < s.end && m!.index + m![0].length > s.start);
      if (!overlaps) {
        segments.push({ start: m.index, end: m.index + m[0].length, scope });
      }
    }
  }

  segments.sort((a, b) => a.start - b.start);

  let html = '';
  let pos = 0;
  for (const seg of segments) {
    if (seg.start > pos) {
      html += `<span style="color:${fg};">${escHtml(code.slice(pos, seg.start))}</span>`;
    }
    const settings = resolveTokenColor(theme, seg.scope);
    html += span(code.slice(seg.start, seg.end), {
      foreground: settings.foreground ?? fg,
      fontStyle: settings.fontStyle,
    });
    pos = seg.end;
  }
  if (pos < code.length) {
    html += `<span style="color:${fg};">${escHtml(code.slice(pos))}</span>`;
  }
  return html;
}

function colorSwatch(key: string, value: string): string {
  return `
    <div class="swatch">
      <div class="swatch-color" style="background:${value};"></div>
      <div class="swatch-label">
        <code>${escHtml(key)}</code>
        <span class="swatch-hex">${escHtml(value)}</span>
      </div>
    </div>`;
}

function generatePreview(themePath: string, outputPath: string): void {
  const theme: HoneTheme = JSON.parse(readFileSync(themePath, 'utf-8'));
  const c = theme.colors;

  const bg = c['editor.background'] ?? '#1e1e1e';
  const fg = c['editor.foreground'] ?? '#d4d4d4';
  const sidebar = c['sideBar.background'] ?? '#252526';
  const lineNumFg = c['editorLineNumber.foreground'] ?? '#858585';
  const lineHighlight = c['editor.lineHighlightBackground'] ?? bg;

  const codeHtml = colorizeCode(SAMPLE_CODE, theme);

  // Build line-numbered code
  const lines = SAMPLE_CODE.split('\n');
  const colorLines = colorizeCode(SAMPLE_CODE, theme).split('\n');
  let numberedCode = '';
  for (let i = 0; i < lines.length; i++) {
    const isHighlight = i === 8; // highlight a sample line
    const rowBg = isHighlight ? lineHighlight : 'transparent';
    numberedCode += `<div class="code-line" style="background:${rowBg};">` +
      `<span class="line-num" style="color:${isHighlight ? (c['editorLineNumber.activeForeground'] ?? fg) : lineNumFg};">${String(i + 1).padStart(3)}</span>` +
      `<span class="line-code">${colorLines[i] ?? ''}</span>` +
      `</div>`;
  }

  const uiColorGroups: Array<{ label: string; keys: string[] }> = [
    {
      label: 'Editor',
      keys: ['editor.background', 'editor.foreground', 'editor.selectionBackground', 'editor.lineHighlightBackground', 'editorCursor.foreground'],
    },
    {
      label: 'Gutter & Line Numbers',
      keys: ['editorLineNumber.foreground', 'editorLineNumber.activeForeground', 'editorGutter.addedBackground', 'editorGutter.modifiedBackground', 'editorGutter.deletedBackground'],
    },
    {
      label: 'Sidebar & Activity Bar',
      keys: ['activityBar.background', 'activityBar.foreground', 'sideBar.background', 'sideBar.foreground'],
    },
    {
      label: 'Tabs & Title Bar',
      keys: ['tab.activeBackground', 'tab.activeForeground', 'tab.inactiveBackground', 'tab.inactiveForeground', 'titleBar.activeBackground'],
    },
    {
      label: 'Status Bar',
      keys: ['statusBar.background', 'statusBar.foreground', 'statusBar.debuggingBackground'],
    },
    {
      label: 'Terminal ANSI',
      keys: [
        'terminal.ansiBlack', 'terminal.ansiRed', 'terminal.ansiGreen', 'terminal.ansiYellow',
        'terminal.ansiBlue', 'terminal.ansiMagenta', 'terminal.ansiCyan', 'terminal.ansiWhite',
        'terminal.ansiBrightBlack', 'terminal.ansiBrightRed', 'terminal.ansiBrightGreen', 'terminal.ansiBrightYellow',
        'terminal.ansiBrightBlue', 'terminal.ansiBrightMagenta', 'terminal.ansiBrightCyan', 'terminal.ansiBrightWhite',
      ],
    },
  ];

  const swatchSections = uiColorGroups.map(({ label, keys }) => `
    <section class="swatch-section">
      <h3>${escHtml(label)}</h3>
      <div class="swatches">${keys.map((k) => c[k] ? colorSwatch(k, c[k]) : '').join('')}</div>
    </section>`).join('');

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${escHtml(theme.name)} — Theme Preview</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: system-ui, sans-serif; background: ${bg}; color: ${fg}; padding: 2rem; }
  h1 { font-size: 1.8rem; margin-bottom: 0.25rem; }
  .meta { opacity: 0.6; font-size: 0.875rem; margin-bottom: 2rem; }
  h2 { font-size: 1.1rem; margin: 2rem 0 1rem; letter-spacing: 0.05em; text-transform: uppercase; opacity: 0.7; }
  h3 { font-size: 0.8rem; text-transform: uppercase; letter-spacing: 0.08em; opacity: 0.5; margin-bottom: 0.75rem; }

  .editor-preview {
    border-radius: 8px;
    overflow: hidden;
    font-family: 'Fira Code', 'Cascadia Code', 'Consolas', monospace;
    font-size: 13px;
    line-height: 1.6;
    background: ${bg};
    border: 1px solid ${c['panel.border'] ?? '#444'};
  }
  .editor-titlebar {
    background: ${c['titleBar.activeBackground'] ?? sidebar};
    padding: 0.5rem 1rem;
    font-size: 0.75rem;
    opacity: 0.8;
    border-bottom: 1px solid ${c['panel.border'] ?? '#444'};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .dot { width: 12px; height: 12px; border-radius: 50%; display: inline-block; }
  .editor-tabs {
    background: ${c['tab.inactiveBackground'] ?? sidebar};
    display: flex;
    border-bottom: 1px solid ${c['panel.border'] ?? '#444'};
  }
  .tab {
    padding: 0.4rem 1rem;
    font-size: 0.8rem;
    border-right: 1px solid ${c['tab.border'] ?? '#444'};
  }
  .tab.active { background: ${c['tab.activeBackground'] ?? bg}; color: ${c['tab.activeForeground'] ?? fg}; }
  .tab.inactive { background: ${c['tab.inactiveBackground'] ?? sidebar}; color: ${c['tab.inactiveForeground'] ?? lineNumFg}; }
  .code-block { overflow-x: auto; padding: 0.5rem 0; }
  .code-line { display: flex; padding: 0 0.5rem; white-space: pre; }
  .line-num { min-width: 3rem; text-align: right; padding-right: 1rem; user-select: none; flex-shrink: 0; }
  .line-code { flex: 1; }

  .swatches { display: flex; flex-wrap: wrap; gap: 0.5rem; }
  .swatch { display: flex; align-items: center; gap: 0.5rem; background: ${c['sideBar.background'] ?? sidebar}; border-radius: 6px; padding: 0.4rem 0.6rem; min-width: 220px; }
  .swatch-color { width: 24px; height: 24px; border-radius: 4px; flex-shrink: 0; border: 1px solid rgba(128,128,128,0.2); }
  .swatch-label { display: flex; flex-direction: column; font-size: 0.7rem; }
  .swatch-label code { font-family: monospace; opacity: 0.9; }
  .swatch-hex { opacity: 0.5; }
  .swatch-section { margin-bottom: 1.5rem; }

  .token-grid { display: flex; flex-wrap: wrap; gap: 0.4rem; }
  .token-chip { padding: 0.25rem 0.6rem; border-radius: 4px; font-size: 0.8rem; font-family: monospace; background: ${c['sideBar.background'] ?? sidebar}; }
</style>
</head>
<body>
<h1>${escHtml(theme.name)}</h1>
<p class="meta">Type: ${escHtml(theme.type)} &nbsp;·&nbsp; Hone Theme Preview</p>

<h2>Code Editor</h2>
<div class="editor-preview">
  <div class="editor-titlebar">
    <span class="dot" style="background:#ff5f56;"></span>
    <span class="dot" style="background:#ffbd2e;"></span>
    <span class="dot" style="background:#27c93f;"></span>
    <span style="margin-left:0.5rem;">config.ts</span>
  </div>
  <div class="editor-tabs">
    <div class="tab active">config.ts</div>
    <div class="tab inactive">index.ts</div>
  </div>
  <div class="code-block">${numberedCode}</div>
</div>

<h2>Token Colors</h2>
<div class="token-grid">
${theme.tokenColors.map((tc) => {
  const name = tc.name ?? (Array.isArray(tc.scope) ? tc.scope[0] : tc.scope);
  const fg2 = tc.settings.foreground ?? theme.colors['editor.foreground'];
  const fs = buildFontStyle(tc.settings.fontStyle);
  return `<div class="token-chip" style="color:${fg2};${fs}">${escHtml(name)}</div>`;
}).join('\n')}
</div>

<h2>UI Colors</h2>
${swatchSections}
</body>
</html>`;

  writeFileSync(outputPath, html);
  console.log(`Wrote ${outputPath}`);
}

const [, , input, maybeOutput] = process.argv;
if (!input) {
  console.error('Usage: tsx tools/preview-theme.ts <theme.json> [output.html]');
  process.exit(1);
}

const resolvedInput = resolve(input);
const outputFile = maybeOutput
  ? resolve(maybeOutput)
  : resolve(basename(input, '.json') + '.preview.html');

generatePreview(resolvedInput, outputFile);
