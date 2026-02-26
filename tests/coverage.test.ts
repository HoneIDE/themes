import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

const ROOT = join(__dirname, '..');
const THEMES_DIR = join(ROOT, 'themes');

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

const themeFiles = readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json'));

describe('Coverage tests', () => {
  for (const file of themeFiles) {
    describe(file, () => {
      let theme: HoneTheme;

      beforeAll(() => {
        theme = JSON.parse(readFileSync(join(THEMES_DIR, file), 'utf-8')) as HoneTheme;
      });

      // --- UI Color Coverage ---
      describe('required UI colors', () => {
        for (const key of REQUIRED_UI_COLORS) {
          test(`has ${key}`, () => {
            // Use Object.hasOwn to avoid Jest treating dots as path separators
            expect(Object.prototype.hasOwnProperty.call(theme.colors, key)).toBe(true);
            expect(theme.colors[key]).toMatch(COLOR_RE);
          });
        }
      });

      // --- Token Scope Coverage ---
      describe('required token scopes', () => {
        for (const scope of REQUIRED_TOKEN_SCOPES) {
          test(`covers scope: ${scope}`, () => {
            const allScopes = theme.tokenColors.flatMap((tc) =>
              Array.isArray(tc.scope) ? tc.scope : [tc.scope],
            );
            const covered = allScopes.some(
              (s) =>
                s === scope ||
                s.startsWith(scope + '.') ||
                s.startsWith(scope + ' '),
            );
            expect(covered).toBe(true);
          });
        }
      });

      // --- Type constraint ---
      test('type is dark or light (or hc variant)', () => {
        expect(['dark', 'light', 'hc-dark', 'hc-light']).toContain(theme.type);
      });

      // --- All color values valid hex ---
      test('all colors are valid hex strings', () => {
        const invalid = Object.entries(theme.colors).filter(
          ([, v]) => !COLOR_RE.test(v),
        );
        expect(invalid).toHaveLength(0);
      });

      // --- WCAG contrast ---
      test('editor foreground/background meets minimum contrast (3:1)', () => {
        const bg = theme.colors['editor.background'];
        const fg = theme.colors['editor.foreground'];
        if (!bg || !fg || !COLOR_RE.test(bg) || !COLOR_RE.test(fg)) return;
        const ratio = contrastRatio(bg, fg);
        expect(ratio).toBeGreaterThanOrEqual(3);
      });

      test('editor foreground/background meets WCAG AA (4.5:1) — warn if not', () => {
        const bg = theme.colors['editor.background'];
        const fg = theme.colors['editor.foreground'];
        if (!bg || !fg || !COLOR_RE.test(bg) || !COLOR_RE.test(fg)) return;
        const ratio = contrastRatio(bg, fg);
        if (ratio < 4.5) {
          console.warn(
            `[${file}] WCAG AA: editor contrast ratio is ${ratio.toFixed(2)}:1 (below 4.5:1)`,
          );
        }
        // Non-fatal: only warn, don't fail
        expect(ratio).toBeGreaterThan(0);
      });

      // --- Semantic token colors ---
      test('semanticTokenColors values are strings or objects', () => {
        if (!theme.semanticTokenColors) return;
        for (const [key, value] of Object.entries(theme.semanticTokenColors)) {
          if (typeof value === 'string') {
            expect(value).toMatch(COLOR_RE);
          } else {
            expect(typeof value).toBe('object');
            if ((value as TokenSettings).foreground) {
              expect((value as TokenSettings).foreground).toMatch(COLOR_RE);
            }
          }
        }
      });
    });
  }
});
