import { readFileSync, writeFileSync, unlinkSync, existsSync, mkdirSync, rmdirSync } from 'fs';
import { join } from 'path';
import { execSync } from 'child_process';

describe('CLI integration tests', () => {
  const testDir = join(__dirname, '../../__test_temp__');
  const testInputFile = join(testDir, 'input.js');
  const testOutputFile = join(testDir, 'output.js');

  beforeAll(() => {
    // Create test directory
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
  });

  beforeEach(() => {
    // Ensure test directory exists
    if (!existsSync(testDir)) {
      mkdirSync(testDir, { recursive: true });
    }
    // Clean up test files before each test
    try {
      if (existsSync(testInputFile)) {
        unlinkSync(testInputFile);
      }
      if (existsSync(testOutputFile)) {
        unlinkSync(testOutputFile);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  afterAll(() => {
    // Clean up test directory and all files
    try {
      if (existsSync(testInputFile)) {
        unlinkSync(testInputFile);
      }
      if (existsSync(testOutputFile)) {
        unlinkSync(testOutputFile);
      }
      // Clean up any other files in test directory
      const files = require('fs').readdirSync(testDir);
      files.forEach((file: string) => {
        const filePath = join(testDir, file);
        if (existsSync(filePath)) {
          unlinkSync(filePath);
        }
      });
      if (existsSync(testDir)) {
        rmdirSync(testDir);
      }
    } catch (error) {
      // Ignore cleanup errors
    }
  });

  describe('command-line argument parsing', () => {
    it('should process a file with default options', () => {
      const minified = 'const a=1;const b=2;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      expect(existsSync(testOutputFile)).toBe(true);
      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should use default output filename when not specified', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const defaultOutput = testInputFile.replace('.js', '.unminified.js');
      expect(existsSync(defaultOutput)).toBe(true);
      unlinkSync(defaultOutput);
    });

    it('should handle --no-rename option', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}" --no-rename`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('a =');
    });

    it('should handle --infer-types option', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}" --infer-types`, {
        cwd: join(__dirname, '../..'),
      });

      expect(existsSync(testOutputFile)).toBe(true);
    });

    it('should handle --typescript option', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      const tsOutputFile = join(testDir, 'output.ts');
      execSync(`npx ts-node src/index.ts "${testInputFile}" "${tsOutputFile}" --typescript`, {
        cwd: join(__dirname, '../..'),
      });

      expect(existsSync(tsOutputFile)).toBe(true);
      const output = readFileSync(tsOutputFile, 'utf-8');
      expect(output).toContain('// Generated TypeScript code');
      unlinkSync(tsOutputFile);
    });

    it('should handle multiple options together', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      const tsOutputFile = join(testDir, 'output.ts');
      execSync(
        `npx ts-node src/index.ts "${testInputFile}" "${tsOutputFile}" --typescript --infer-types`,
        {
          cwd: join(__dirname, '../..'),
        }
      );

      expect(existsSync(tsOutputFile)).toBe(true);
      unlinkSync(tsOutputFile);
    });
  });

  describe('file I/O', () => {
    it('should read input file correctly', () => {
      const minified = 'const a=1;const b=2;const c=3;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toBeTruthy();
    });

    it('should write output file correctly', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      expect(existsSync(testOutputFile)).toBe(true);
      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output.length).toBeGreaterThan(0);
    });

    it('should overwrite existing output file', () => {
      const minified = 'const a=1;';
      writeFileSync(testInputFile, minified);
      writeFileSync(testOutputFile, 'old content');

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).not.toBe('old content');
    });
  });

  describe('error handling', () => {
    it('should exit with error when no input file specified', () => {
      expect(() => {
        execSync('npx ts-node src/index.ts', {
          cwd: join(__dirname, '../..'),
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('should exit with error when input file does not exist', () => {
      const nonExistentFile = join(testDir, 'nonexistent.js');

      expect(() => {
        execSync(`npx ts-node src/index.ts "${nonExistentFile}" "${testOutputFile}"`, {
          cwd: join(__dirname, '../..'),
          stdio: 'pipe',
        });
      }).toThrow();
    });

    it('should exit with error for invalid JavaScript syntax', () => {
      const invalidCode = 'const a=;';
      writeFileSync(testInputFile, invalidCode);

      expect(() => {
        execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
          cwd: join(__dirname, '../..'),
          stdio: 'pipe',
        });
      }).toThrow();
    });
  });

  describe('output validation', () => {
    it('should produce valid JavaScript output', () => {
      const minified = 'const a=1;const b=a+2;console.log(b);';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');

      // Should be valid JavaScript (can be executed without syntax errors)
      expect(() => {
        new Function(output);
      }).not.toThrow();
    });

    it('should maintain code semantics', () => {
      const minified = 'function add(a,b){return a+b;}const result=add(1,2);';
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('return');
      expect(output).toContain('+');
    });
  });

  describe('complex real-world scenarios', () => {
    it('should handle minified library code', () => {
      const minified = `(function(){const a=function(b){return b*2;};const c=[1,2,3];const d=c.map(a);return d;})();`;
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('map');
      expect(output).toContain('return');
    });

    it('should handle ES6+ features', () => {
      const minified = `const a=[1,2,3];const b=a.map(x=>x*2);const {c,d}={c:1,d:2};const e=\`value: \${c}\`;`;
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('map');
      expect(output).toContain('`');
    });

    it('should handle async/await code', () => {
      const minified = `async function f(){const a=await Promise.resolve(1);return a;}`;
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('async');
      expect(output).toContain('await');
    });

    it('should handle class syntax', () => {
      const minified = `class C{constructor(a){this.a=a;}get value(){return this.a;}}`;
      writeFileSync(testInputFile, minified);

      execSync(`npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}"`, {
        cwd: join(__dirname, '../..'),
      });

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('class');
      expect(output).toContain('constructor');
    });
  });

  describe('TypeScript output integration', () => {
    it('should generate .ts file with --typescript flag', () => {
      const minified = 'const a=42;const b="hello";';
      writeFileSync(testInputFile, minified);

      const tsOutputFile = join(testDir, 'output.ts');
      execSync(`npx ts-node src/index.ts "${testInputFile}" "${tsOutputFile}" --typescript`, {
        cwd: join(__dirname, '../..'),
      });

      expect(existsSync(tsOutputFile)).toBe(true);
      const output = readFileSync(tsOutputFile, 'utf-8');
      expect(output).toContain('// Generated TypeScript code');
      unlinkSync(tsOutputFile);
    });

    it('should change extension to .ts when --typescript is used', () => {
      const minified = 'const a=42;';
      writeFileSync(testInputFile, minified);

      const jsOutputFile = join(testDir, 'output.js');
      execSync(`npx ts-node src/index.ts "${testInputFile}" "${jsOutputFile}" --typescript`, {
        cwd: join(__dirname, '../..'),
      });

      const tsOutputFile = join(testDir, 'output.ts');
      expect(existsSync(tsOutputFile)).toBe(true);
      expect(existsSync(jsOutputFile)).toBe(false);
      unlinkSync(tsOutputFile);
    });
  });

  describe('option combinations', () => {
    it('should work with --no-rename and --infer-types', () => {
      const minified = 'const a=42;const b="test";';
      writeFileSync(testInputFile, minified);

      execSync(
        `npx ts-node src/index.ts "${testInputFile}" "${testOutputFile}" --no-rename --infer-types`,
        {
          cwd: join(__dirname, '../..'),
        }
      );

      const output = readFileSync(testOutputFile, 'utf-8');
      expect(output).toContain('a =');
      expect(output).toContain('b =');
    });

    it('should work with all options enabled', () => {
      const minified = 'const a=42;';
      writeFileSync(testInputFile, minified);

      const tsOutputFile = join(testDir, 'output.ts');
      execSync(
        `npx ts-node src/index.ts "${testInputFile}" "${tsOutputFile}" --typescript --infer-types --no-rename`,
        {
          cwd: join(__dirname, '../..'),
        }
      );

      expect(existsSync(tsOutputFile)).toBe(true);
      const output = readFileSync(tsOutputFile, 'utf-8');
      expect(output).toContain('// Generated TypeScript code');
      unlinkSync(tsOutputFile);
    });
  });
});
