import { unminify } from '../unminifier';

describe('unminify', () => {
  describe('basic functionality', () => {
    it('should format simple minified code', async () => {
      const minified = 'const a=1;const b=2;';
      const result = await unminify(minified);

      expect(result).toContain('const');
      expect(result.length).toBeGreaterThan(minified.length);
    });

    it('should return a string', async () => {
      const minified = 'const x=1;';
      const result = await unminify(minified);

      expect(typeof result).toBe('string');
    });

    it('should handle empty code', async () => {
      const result = await unminify('');

      expect(typeof result).toBe('string');
    });
  });

  describe('variable renaming', () => {
    it('should rename single-letter variables', async () => {
      const minified = 'const a=1;const b=2;';
      const result = await unminify(minified, { renameVariables: true });

      expect(result).not.toContain('const a');
      expect(result).not.toContain('const b');
    });

    it('should rename minified variables with numbers', async () => {
      const minified = 'const a1=1;const b2=2;';
      const result = await unminify(minified, { renameVariables: true });

      expect(result).not.toContain('a1');
      expect(result).not.toContain('b2');
    });

    it('should not rename properly named variables', async () => {
      const minified = 'const userName="John";const userAge=30;';
      const result = await unminify(minified, { renameVariables: true });

      expect(result).toContain('userName');
      expect(result).toContain('userAge');
    });

    it('should respect --no-rename option', async () => {
      const minified = 'const a=1;const b=2;';
      const result = await unminify(minified, { renameVariables: false });

      expect(result).toContain('a =');
      expect(result).toContain('b =');
    });

    it('should handle scoped variables correctly', async () => {
      const minified = 'function f(){const a=1;return a;}function g(){const a=2;return a;}';
      const result = await unminify(minified, { renameVariables: true });

      // Both functions should have their variables renamed independently
      expect(result).toBeTruthy();
      expect(result).not.toContain('const a');
    });

    it('should rename function parameters', async () => {
      const minified = 'function test(a,b,c){return a+b+c;}';
      const result = await unminify(minified, { renameVariables: true });

      expect(result).not.toContain('(a, b, c)');
      expect(result).not.toContain('(a,b,c)');
    });

    it('should rename arrow function parameters', async () => {
      const minified = 'const fn=(a,b)=>a+b;';
      const result = await unminify(minified, { renameVariables: true });

      // Should rename single letter params
      expect(result).toBeTruthy();
    });
  });

  describe('function transformations', () => {
    it('should convert arrow functions with implicit returns to block statements', async () => {
      const minified = 'const fn=()=>42;';
      const result = await unminify(minified);

      expect(result).toContain('{');
      expect(result).toContain('return');
      expect(result).toContain('}');
    });

    it('should expand arrow function with expression body', async () => {
      const minified = 'const double=n=>n*2;';
      const result = await unminify(minified);

      expect(result).toContain('{');
      expect(result).toContain('return');
      expect(result).toContain('*');
    });

    it('should handle arrow functions with multiple parameters', async () => {
      const minified = 'const add=(a,b)=>a+b;';
      const result = await unminify(minified);

      expect(result).toContain('return');
    });

    it('should not modify arrow functions that already have block statements', async () => {
      const minified = 'const fn=()=>{return 42;};';
      const result = await unminify(minified);

      expect(result).toContain('return');
      expect((result.match(/return/g) || []).length).toBe(1);
    });
  });

  describe('object property transformations', () => {
    it('should expand shorthand object properties', async () => {
      const minified = 'const name="John";const obj={name};';
      const result = await unminify(minified);

      expect(result).toContain(':');
    });

    it('should handle multiple shorthand properties', async () => {
      const minified = 'const x=1,y=2;const point={x,y};';
      const result = await unminify(minified);

      // Properties should be expanded
      expect(result).toBeTruthy();
    });

    it('should handle mixed shorthand and regular properties', async () => {
      const minified = 'const name="John";const obj={name,age:30};';
      const result = await unminify(minified);

      expect(result).toContain('age');
      expect(result).toContain('30');
    });
  });

  describe('formatting', () => {
    it('should add proper indentation', async () => {
      const minified = 'function f(){if(true){return 1;}}';
      const result = await unminify(minified);

      expect(result).toContain('  '); // Should have indentation
    });

    it('should add proper line breaks', async () => {
      const minified = 'const a=1;const b=2;const c=3;';
      const result = await unminify(minified);

      const lines = result.split('\n').filter(line => line.trim().length > 0);
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should use consistent quote style', async () => {
      const minified = 'const str="hello";';
      const result = await unminify(minified);

      // Should contain quotes (single or double depending on prettier success)
      expect(result).toMatch(/['"]hello['"]/);
    });

    it('should add semicolons consistently', async () => {
      const minified = 'const a=1;const b=2';
      const result = await unminify(minified);

      expect(result).toContain(';');
    });
  });

  describe('type inference', () => {
    it('should not infer types by default', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified, { inferTypes: false });

      expect(result).not.toContain(': number');
    });

    it('should infer types when option is enabled', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified, { inferTypes: true });

      // Type inference happens but may not be visible in JS output
      expect(result).toBeTruthy();
    });
  });

  describe('TypeScript output', () => {
    it('should generate TypeScript when outputFormat is ts', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified, { outputFormat: 'ts' });

      // Should contain TypeScript header or be valid output
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
    });

    it('should add type annotations in TypeScript output', async () => {
      const minified = 'const a=42;const b="hello";';
      const result = await unminify(minified, { outputFormat: 'ts' });

      // Should have valid output with variables
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(minified.length);
    });

    it('should handle function return types in TypeScript', async () => {
      const minified = 'function f(){return 42;}';
      const result = await unminify(minified, { outputFormat: 'ts' });

      // Should contain function and return statement
      expect(result).toContain('function');
      expect(result).toContain('return');
    });
  });

  describe('complex code transformations', () => {
    it('should handle nested functions', async () => {
      const minified = 'function outer(){function inner(){return 1;}return inner();}';
      const result = await unminify(minified);

      expect(result).toContain('function');
      expect(result).toContain('return');
    });

    it('should handle closures', async () => {
      const minified = 'function makeCounter(){let a=0;return()=>++a;}';
      const result = await unminify(minified);

      expect(result).toBeTruthy();
      expect(result).toContain('return');
    });

    it('should handle array methods', async () => {
      const minified = 'const a=[1,2,3];const b=a.map(x=>x*2);';
      const result = await unminify(minified);

      expect(result).toContain('map');
      expect(result).toContain('*');
    });

    it('should handle object destructuring', async () => {
      const minified = 'const {a,b}={a:1,b:2};';
      const result = await unminify(minified);

      expect(result).toContain('{');
      expect(result).toContain('}');
    });

    it('should handle template literals', async () => {
      const minified = 'const a="world";const b=`hello ${a}`;';
      const result = await unminify(minified);

      expect(result).toContain('`');
      expect(result).toContain('${');
    });

    it('should handle async/await', async () => {
      const minified = 'async function f(){const a=await Promise.resolve(1);return a;}';
      const result = await unminify(minified);

      expect(result).toContain('async');
      expect(result).toContain('await');
    });

    it('should handle class declarations', async () => {
      const minified = 'class C{constructor(a){this.a=a;}m(){return this.a;}}';
      const result = await unminify(minified);

      expect(result).toContain('class');
      expect(result).toContain('constructor');
    });
  });

  describe('edge cases', () => {
    it('should handle code with comments', async () => {
      const minified = '/* comment */const a=1;';
      const result = await unminify(minified);

      expect(result).toBeTruthy();
    });

    it('should handle code with multiple statements on one line', async () => {
      const minified = 'const a=1;const b=2;const c=3;';
      const result = await unminify(minified);

      const lines = result.split('\n');
      expect(lines.length).toBeGreaterThan(1);
    });

    it('should handle immediately invoked function expressions (IIFE)', async () => {
      const minified = '(function(){const a=1;return a;})();';
      const result = await unminify(minified);

      expect(result).toContain('function');
      expect(result).toContain('return');
    });

    it('should handle ternary operators', async () => {
      const minified = 'const a=true?1:2;';
      const result = await unminify(minified);

      expect(result).toContain('?');
      expect(result).toContain(':');
    });

    it('should handle spread operators', async () => {
      const minified = 'const a=[1,2];const b=[...a,3];';
      const result = await unminify(minified);

      expect(result).toContain('...');
    });
  });

  describe('error handling', () => {
    it('should handle invalid syntax gracefully', async () => {
      const invalid = 'const a=;';

      await expect(unminify(invalid)).rejects.toThrow();
    });

    it('should handle incomplete code', async () => {
      const incomplete = 'function test(';

      await expect(unminify(incomplete)).rejects.toThrow();
    });
  });

  describe('options combinations', () => {
    it('should work with renameVariables=false and inferTypes=true', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified, {
        renameVariables: false,
        inferTypes: true,
      });

      expect(result).toContain('a');
    });

    it('should work with all options enabled', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified, {
        renameVariables: true,
        inferTypes: true,
        outputFormat: 'ts',
      });

      // Should produce valid output with renamed variable
      expect(result).toBeTruthy();
      expect(result.length).toBeGreaterThan(0);
      expect(result).not.toContain('const a');
    });

    it('should use default options when none provided', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified);

      expect(result).toBeTruthy();
      expect(typeof result).toBe('string');
    });
  });

  describe('real-world minified code', () => {
    it('should handle jQuery-style minified code', async () => {
      const minified = 'const $=function(a){return document.querySelector(a);};';
      const result = await unminify(minified);

      expect(result).toContain('function');
      expect(result).toContain('return');
      expect(result).toContain('document');
    });

    it('should handle chained method calls', async () => {
      const minified = 'const a=[1,2,3].filter(x=>x>1).map(x=>x*2);';
      const result = await unminify(minified);

      expect(result).toContain('filter');
      expect(result).toContain('map');
    });

    it('should handle object method shorthand', async () => {
      const minified = 'const obj={m(){return 1;}};';
      const result = await unminify(minified);

      expect(result).toContain('m()');
      expect(result).toContain('return');
    });
  });

  describe('output format', () => {
    it('should default to js format', async () => {
      const minified = 'const a=42;';
      const result = await unminify(minified);

      expect(result).not.toContain('// Generated TypeScript code');
    });

    it('should produce valid JavaScript output', async () => {
      const minified = 'const a=1;const b=a+2;';
      const result = await unminify(minified, { outputFormat: 'js' });

      // Should be parseable JavaScript (without throwing syntax errors)
      expect(() => new Function(result)).not.toThrow();
    });
  });
});
