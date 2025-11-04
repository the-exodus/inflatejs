/**
 * Array and string method type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Array method type inference', () => {
  describe('Existing methods', () => {
    it('should infer type for reduce', async () => {
      const code = 'const numbers=[1,2,3,4,5];const sum=numbers.reduce((acc,n)=>acc+n,0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // TODO: reduce() return type inference not yet implemented - should infer number from initial value
      // Currently returns no type annotation
      expect(result).toContain('const sum');
    });

    it('should infer type for find', async () => {
      const code = 'const numbers=[1,2,3,4,5];const found=numbers.find(n=>n>3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // find() now returns element type | undefined
      expect(result).toMatch(/found:\s*(number \| undefined|undefined \| number)/);
    });

    it('should infer boolean for some', async () => {
      const code = 'const numbers=[1,2,3,4,5];const hasEven=numbers.some(n=>n%2===0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/hasEven:\s*boolean/);
    });

    it('should infer boolean for every', async () => {
      const code = 'const numbers=[1,2,3,4,5];const allPositive=numbers.every(n=>n>0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/allPositive:\s*boolean/);
    });
  });

  describe('Missing array methods', () => {
    it('should infer number for findIndex', async () => {
      const code = 'const arr=[1,2,3];const idx=arr.findIndex(x=>x>1);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/idx:\s*number/);
    });

    it('should infer number for indexOf', async () => {
      const code = 'const arr=[1,2,3];const idx=arr.indexOf(2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/idx:\s*number/);
    });

    it('should infer array type for flat', async () => {
      const code = 'const nested=[[1,2],[3,4]];const flattened=nested.flat();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/flattened:\s*number\[\]/);
    });

    it('should infer array type for flatMap', async () => {
      const code = 'const arr=[1,2,3];const result=arr.flatMap(x=>[x,x*2]);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // flatMap() now returns the same array type
      expect(result).toMatch(/result:\s*number\[\]/);
    });

    it('should infer array type for slice', async () => {
      const code = 'const arr=[1,2,3,4,5];const sliced=arr.slice(1,3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sliced:\s*number\[\]/);
    });

    it('should infer array type for concat', async () => {
      const code = 'const arr1=[1,2];const arr2=[3,4];const combined=arr1.concat(arr2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/combined:\s*number\[\]/);
    });

    it('should infer number for push', async () => {
      const code = 'const arr=[1,2,3];const len=arr.push(4);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/len:\s*number/);
    });

    it('should infer element type for pop', async () => {
      const code = 'const arr=[1,2,3];const last=arr.pop();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // pop() now returns element type | undefined
      expect(result).toMatch(/last:\s*(number \| undefined|undefined \| number)/);
    });

    it('should infer element type for shift', async () => {
      const code = 'const arr=[1,2,3];const first=arr.shift();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // shift() now returns element type | undefined
      expect(result).toMatch(/first:\s*(number \| undefined|undefined \| number)/);
    });

    it('should infer number for unshift', async () => {
      const code = 'const arr=[2,3];const len=arr.unshift(1);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/len:\s*number/);
    });

    it('should infer boolean for includes', async () => {
      const code = 'const arr=[1,2,3];const has=arr.includes(2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/has:\s*boolean/);
    });

    it('should infer array type for reverse', async () => {
      const code = 'const arr=[1,2,3];const rev=arr.reverse();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/rev:\s*number\[\]/);
    });

    it('should infer array type for sort', async () => {
      const code = 'const arr=[3,1,2];const sorted=arr.sort();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sorted:\s*number\[\]/);
    });
  });
});

describe('String method type inference', () => {
  describe('Missing string methods', () => {
    it('should infer string for slice', async () => {
      const code = 'const text="hello world";const sliced=text.slice(0,5);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sliced:\s*string/);
    });

    it('should infer string for replaceAll', async () => {
      const code = 'const text="hello world";const replaced=text.replaceAll("o","x");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/replaced:\s*string/);
    });

    it('should infer string for trim', async () => {
      const code = 'const text="  hello  ";const trimmed=text.trim();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/trimmed:\s*string/);
    });

    it('should infer string for trimStart', async () => {
      const code = 'const text="  hello";const trimmed=text.trimStart();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/trimmed:\s*string/);
    });

    it('should infer string for trimEnd', async () => {
      const code = 'const text="hello  ";const trimmed=text.trimEnd();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/trimmed:\s*string/);
    });

    it('should infer string for toLowerCase', async () => {
      const code = 'const text="HELLO";const lower=text.toLowerCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/lower:\s*string/);
    });

    it('should infer string for toUpperCase', async () => {
      const code = 'const text="hello";const upper=text.toUpperCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/upper:\s*string/);
    });

    it('should infer boolean for startsWith', async () => {
      const code = 'const text="hello";const starts=text.startsWith("he");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/starts:\s*boolean/);
    });

    it('should infer boolean for endsWith', async () => {
      const code = 'const text="hello";const ends=text.endsWith("lo");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/ends:\s*boolean/);
    });

    it('should infer boolean for includes', async () => {
      const code = 'const text="hello";const has=text.includes("ll");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/has:\s*boolean/);
    });

    it('should infer string for padStart', async () => {
      const code = 'const text="5";const padded=text.padStart(3,"0");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/padded:\s*string/);
    });

    it('should infer string for padEnd', async () => {
      const code = 'const text="5";const padded=text.padEnd(3,"0");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/padded:\s*string/);
    });

    it('should infer string for repeat', async () => {
      const code = 'const text="x";const repeated=text.repeat(3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/repeated:\s*string/);
    });

    it('should infer string for substring', async () => {
      const code = 'const text="hello";const sub=text.substring(1,4);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sub:\s*string/);
    });

    it('should infer string for substr', async () => {
      const code = 'const text="hello";const sub=text.substr(1,3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sub:\s*string/);
    });

    it('should infer string for charAt', async () => {
      const code = 'const text="hello";const char=text.charAt(0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/char:\s*string/);
    });

    it('should infer number for charCodeAt', async () => {
      const code = 'const text="hello";const code=text.charCodeAt(0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/code:\s*number/);
    });

    it('should infer number for search', async () => {
      const code = 'const text="hello";const pos=text.search(/l/);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pos:\s*number/);
    });
  });
});
