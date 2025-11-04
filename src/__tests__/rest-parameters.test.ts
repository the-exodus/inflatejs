/**
 * Rest Parameters Tests
 * Tests for Phase 3, item 12: Rest parameter type inference
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Rest Parameters', () => {
  describe('Basic rest parameters', () => {
    it('should infer any[] for simple rest parameter', async () => {
      const code = 'function sum(...numbers){return numbers.reduce((a,b)=>a+b,0);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.numbers:\s*any\[\]/);
    });

    it('should handle rest parameter as only parameter', async () => {
      const code = 'function logAll(...args){console.log(args);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });

    it('should handle empty rest parameter usage', async () => {
      const code = 'function noop(...rest){return;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.rest:\s*any\[\]/);
    });
  });

  describe('Rest parameters with other parameters', () => {
    it('should handle rest parameter after regular parameter', async () => {
      const code = 'function log(message,...args){console.log(message,args);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });

    it('should handle rest parameter after multiple parameters', async () => {
      const code = 'function process(a,b,c,...rest){return rest.length;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.rest:\s*any\[\]/);
    });

    it('should handle rest parameter after default parameter', async () => {
      const code = 'function greet(prefix="Hello",...names){return prefix+" "+names.join(",");}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/prefix:\s*string/);
      expect(result).toMatch(/\.\.\.names:\s*any\[\]/);
    });
  });

  describe('Arrow functions with rest parameters', () => {
    it('should infer rest parameter type in arrow function', async () => {
      const code = 'const sum=(...nums)=>nums.reduce((a,b)=>a+b,0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.nums:\s*any\[\]/);
    });

    it('should handle arrow function with param and rest', async () => {
      const code = 'const combine=(first,...rest)=>[first,...rest];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.rest:\s*any\[\]/);
    });

    it('should handle single rest parameter in arrow function', async () => {
      const code = 'const logArgs=(...args)=>console.log(args);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });
  });

  describe('Function expressions with rest parameters', () => {
    it('should infer rest in named function expression', async () => {
      const code = 'const fn=function process(...items){return items;};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.items:\s*any\[\]/);
    });

    it('should infer rest in anonymous function expression', async () => {
      const code = 'const fn=function(...values){return values.length;};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.values:\s*any\[\]/);
    });
  });

  describe('Rest parameters with array methods', () => {
    it('should handle rest parameter with map', async () => {
      const code = 'function doubleAll(...nums){return nums.map(n=>n*2);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.nums:\s*any\[\]/);
    });

    it('should handle rest parameter with filter', async () => {
      const code = 'function filterPositive(...nums){return nums.filter(n=>n>0);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.nums:\s*any\[\]/);
    });

    it('should handle rest parameter with reduce', async () => {
      const code = 'function sum(...nums){return nums.reduce((acc,n)=>acc+n,0);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.nums:\s*any\[\]/);
    });

    it('should handle rest parameter with join', async () => {
      const code = 'function concat(...strs){return strs.join("");}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.strs:\s*any\[\]/);
    });
  });

  describe('Rest parameters with properties', () => {
    it('should handle rest.length access', async () => {
      const code = 'function count(...items){return items.length;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.items:\s*any\[\]/);
    });

    it('should handle rest element access', async () => {
      const code = 'function getFirst(...values){return values[0];}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.values:\s*any\[\]/);
    });

    it('should handle rest with slice', async () => {
      const code = 'function getTail(...all){return all.slice(1);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.all:\s*any\[\]/);
    });
  });

  describe('Edge cases', () => {
    it('should handle rest parameter in async function', async () => {
      const code = 'async function fetchAll(...urls){return Promise.all(urls.map(fetch));}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.urls:\s*any\[\]/);
    });

    it('should handle rest parameter with destructuring usage', async () => {
      const code = 'function process(...args){const [first,...rest]=args;return first;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });

    it('should handle rest parameter with spread in return', async () => {
      const code = 'function clone(...items){return [...items];}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.items:\s*any\[\]/);
    });

    it('should handle very long rest parameter name', async () => {
      const code = 'function process(...veryLongRestParameterName){return veryLongRestParameterName;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.veryLongRestParameterName:\s*any\[\]/);
    });
  });

  describe('Real-world examples', () => {
    it('should handle variadic math function', async () => {
      const code = 'function max(...numbers){return Math.max(...numbers);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.numbers:\s*any\[\]/);
    });

    it('should handle logger with formatting', async () => {
      const code = 'function log(level,...messages){console.log(`[${level}]`,...messages);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.messages:\s*any\[\]/);
    });

    it('should handle event emitter pattern', async () => {
      const code = 'function emit(event,...args){this.listeners[event].forEach(fn=>fn(...args));}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });

    it('should handle array concatenation helper', async () => {
      const code = 'function concat(...arrays){return [].concat(...arrays);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.arrays:\s*any\[\]/);
    });

    it('should handle argument forwarding', async () => {
      const code = 'function wrapper(...args){return someFunction(...args);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/\.\.\.args:\s*any\[\]/);
    });
  });
});
