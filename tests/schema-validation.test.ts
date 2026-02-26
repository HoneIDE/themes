import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';
import Ajv from 'ajv';

const ROOT = join(__dirname, '..');
const THEMES_DIR = join(ROOT, 'themes');
const SCHEMA_PATH = join(ROOT, 'schema', 'theme-schema.json');

const ajv = new Ajv({ allErrors: true });
const schema = JSON.parse(readFileSync(SCHEMA_PATH, 'utf-8'));
const validate = ajv.compile(schema);

const themeFiles = readdirSync(THEMES_DIR).filter((f) => f.endsWith('.json'));

describe('Schema validation', () => {
  test('at least one theme file exists', () => {
    expect(themeFiles.length).toBeGreaterThan(0);
  });

  for (const file of themeFiles) {
    describe(file, () => {
      let theme: Record<string, unknown>;

      beforeAll(() => {
        const raw = readFileSync(join(THEMES_DIR, file), 'utf-8');
        theme = JSON.parse(raw);
      });

      test('is valid JSON and passes schema validation', () => {
        const valid = validate(theme);
        if (!valid) {
          const errors = validate.errors
            ?.map((e) => `  ${e.instancePath || '(root)'}: ${e.message}`)
            .join('\n');
          throw new Error(`Schema validation failed for ${file}:\n${errors}`);
        }
        expect(valid).toBe(true);
      });

      test('has a non-empty name', () => {
        expect(typeof theme.name).toBe('string');
        expect((theme.name as string).length).toBeGreaterThan(0);
      });

      test('type is dark or light', () => {
        expect(['dark', 'light', 'hc-dark', 'hc-light']).toContain(theme.type);
      });

      test('tokenColors is a non-empty array', () => {
        expect(Array.isArray(theme.tokenColors)).toBe(true);
        expect((theme.tokenColors as unknown[]).length).toBeGreaterThan(0);
      });
    });
  }
});
