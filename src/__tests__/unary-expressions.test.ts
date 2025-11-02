/**
 * Unary expression type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Unary expression type inference', () => {
  describe('Logical NOT (!)', () => {
    it('should infer boolean for logical NOT of boolean', async () => {
      const code = 'const isActive=true;const isInactive=!isActive;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/isInactive:\s*boolean/);
    });

    it('should infer boolean for logical NOT of any value', async () => {
      const code = 'const value=42;const notValue=!value;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/notValue:\s*boolean/);
    });

    it('should infer boolean for double NOT', async () => {
      const code = 'const x=5;const bool=!!x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/bool:\s*boolean/);
    });
  });

  describe('typeof operator', () => {
    it('should infer string for typeof number', async () => {
      const code = 'const typeOfValue=typeof 42;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/typeOfValue:\s*string/);
    });

    it('should infer string for typeof variable', async () => {
      const code = 'const x=10;const typeOfX=typeof x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/typeOfX:\s*string/);
    });

    it('should infer string for typeof in function return', async () => {
      const code = 'function getType(x){return typeof x}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*string/);
    });
  });

  describe('Unary plus (+) and minus (-)', () => {
    it('should infer number for unary minus', async () => {
      const code = 'const num=5;const negative=-num;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/negative:\s*number/);
    });

    it('should infer number for unary plus', async () => {
      const code = 'const str="42";const num=+str;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });

    it('should infer number for unary minus of literal', async () => {
      const code = 'const negative=-42;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/negative:\s*number/);
    });

    it('should handle nested unary minus', async () => {
      const code = 'const x=5;const result=-(-x);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number/);
    });
  });

  describe('void operator', () => {
    it('should infer undefined for void expression', async () => {
      const code = 'const result=void 0;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*undefined/);
    });

    it('should infer undefined for void function call', async () => {
      const code = 'function doSomething(){return 42}const result=void doSomething();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*undefined/);
    });
  });

  describe('Bitwise NOT (~)', () => {
    it('should infer number for bitwise NOT', async () => {
      const code = 'const num=5;const inverted=~num;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/inverted:\s*number/);
    });

    it('should infer number for double bitwise NOT', async () => {
      const code = 'const x=5.7;const int=~~x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/int:\s*number/);
    });
  });

  describe('delete operator', () => {
    it('should infer boolean for delete operation', async () => {
      const code = 'const obj={x:1};const result=delete obj.x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*boolean/);
    });
  });

  describe('Complex unary expressions', () => {
    it('should handle unary in return statements', async () => {
      const code = 'function isNotActive(flag){return !flag}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*boolean/);
    });

    it('should handle mixed unary operators', async () => {
      const code = 'const x=5;const result=!(-x);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*boolean/);
    });

    it('should propagate unary result types through assignments', async () => {
      const code = 'const x=10;const typeStr=typeof x;const copied=typeStr;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/typeStr:\s*string/);
      expect(result).toMatch(/copied:\s*string/);
    });
  });
});
