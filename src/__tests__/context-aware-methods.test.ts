/**
 * Context-aware method inference tests
 * Tests for methods that exist on multiple types with different return types
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Context-aware method inference', () => {
  describe('slice() method', () => {
    describe('String slice', () => {
      it('should infer string for string.slice()', async () => {
        const code = 'const text="hello world";const sliced=text.slice(0,5);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/sliced:\s*string/);
      });

      it('should infer string for string.slice() with one argument', async () => {
        const code = 'const text="hello";const sub=text.slice(1);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/sub:\s*string/);
      });

      it('should infer string for chained string.slice()', async () => {
        const code = 'const text="hello world";const result=text.slice(0,5).slice(1);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string/);
      });
    });

    describe('Array slice', () => {
      it('should infer number[] for number[].slice()', async () => {
        const code = 'const numbers=[1,2,3,4,5];const sliced=numbers.slice(1,3);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/sliced:\s*number\[\]/);
      });

      it('should infer string[] for string[].slice()', async () => {
        const code = 'const strings=["a","b","c"];const partial=strings.slice(0,2);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/partial:\s*string\[\]/);
      });

      it('should infer array type for chained array.slice()', async () => {
        const code = 'const arr=[1,2,3,4,5];const result=arr.slice(0,3).slice(1);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });
    });

    describe('slice() in expressions', () => {
      it('should infer correct type for array.slice() in ternary', async () => {
        const code = 'const flag=true;const arr=[1,2,3];const result=flag?arr.slice(0,2):[4,5];';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });

      it('should infer correct type for string.slice() in ternary', async () => {
        const code = 'const flag=true;const text="hello";const result=flag?text.slice(0,2):"world";';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string/);
      });

      it('should infer correct type for slice() in logical OR', async () => {
        const code = 'const arr=[1,2,3];const result=arr.slice(0,1)||[0];';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });
    });
  });

  describe('concat() method', () => {
    describe('String concat', () => {
      it('should infer string for string.concat()', async () => {
        const code = 'const text="hello";const result=text.concat(" world");';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string/);
      });

      it('should infer string for chained string.concat()', async () => {
        const code = 'const text="hello";const result=text.concat(" ").concat("world");';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string/);
      });
    });

    describe('Array concat', () => {
      it('should infer number[] for number[].concat()', async () => {
        const code = 'const arr=[1,2,3];const result=arr.concat([4,5]);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });

      it('should infer string[] for string[].concat()', async () => {
        const code = 'const arr=["a","b"];const result=arr.concat(["c","d"]);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string\[\]/);
      });

      it('should infer array type for chained array.concat()', async () => {
        const code = 'const arr=[1,2];const result=arr.concat([3]).concat([4]);';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });
    });

    describe('concat() in expressions', () => {
      it('should infer correct type for array.concat() in ternary', async () => {
        const code = 'const flag=true;const arr=[1,2];const result=flag?arr.concat([3]):[4,5];';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*number\[\]/);
      });

      it('should infer correct type for string.concat() in ternary', async () => {
        const code = 'const flag=true;const text="hello";const result=flag?text.concat(" world"):"hi";';
        const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

        expect(result).toMatch(/result:\s*string/);
      });
    });
  });

  describe('Other array methods returning same type', () => {
    it('should infer number[] for map()', async () => {
      const code = 'const arr=[1,2,3];const doubled=arr.map(x=>x*2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/doubled:\s*number\[\]/);
    });

    it('should infer number[] for filter()', async () => {
      const code = 'const arr=[1,2,3,4];const evens=arr.filter(x=>x%2===0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/evens:\s*number\[\]/);
    });

    it('should infer number[] for reverse()', async () => {
      const code = 'const arr=[1,2,3];const reversed=arr.reverse();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/reversed:\s*number\[\]/);
    });

    it('should infer number[] for sort()', async () => {
      const code = 'const arr=[3,1,2];const sorted=arr.sort();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sorted:\s*number\[\]/);
    });
  });

  describe('String methods', () => {
    it('should infer string for substring()', async () => {
      const code = 'const text="hello";const sub=text.substring(1,4);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sub:\s*string/);
    });

    it('should infer string for substr()', async () => {
      const code = 'const text="hello";const sub=text.substr(1,3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sub:\s*string/);
    });

    it('should infer string for replace()', async () => {
      const code = 'const text="hello";const replaced=text.replace("h","H");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/replaced:\s*string/);
    });

    it('should infer string for trim()', async () => {
      const code = 'const text="  hello  ";const trimmed=text.trim();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/trimmed:\s*string/);
    });

    it('should infer string for toUpperCase()', async () => {
      const code = 'const text="hello";const upper=text.toUpperCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/upper:\s*string/);
    });

    it('should infer string for toLowerCase()', async () => {
      const code = 'const text="HELLO";const lower=text.toLowerCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/lower:\s*string/);
    });
  });

  describe('Complex scenarios', () => {
    it('should handle mixed string and array operations', async () => {
      const code = 'const text="hello";const arr=[1,2,3];const str=text.slice(0,2);const nums=arr.slice(0,2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/str:\s*string/);
      expect(result).toMatch(/nums:\s*number\[\]/);
    });

    it('should handle slice() on propagated types', async () => {
      const code = 'const original="hello";const copied=original;const sliced=copied.slice(0,2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sliced:\s*string/);
    });

    it('should handle concat() on propagated types', async () => {
      const code = 'const original=[1,2];const copied=original;const concatenated=copied.concat([3]);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/concatenated:\s*number\[\]/);
    });

    it('should handle method chaining', async () => {
      const code = 'const text="hello world";const result=text.slice(0,5).toUpperCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*string/);
    });

    it('should handle array method chaining', async () => {
      const code = 'const arr=[1,2,3,4,5];const result=arr.slice(0,4).filter(x=>x>2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number\[\]/);
    });
  });
});
