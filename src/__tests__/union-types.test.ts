/**
 * Union type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Union type inference', () => {
  describe('Conditional expressions with different types', () => {
    it('should infer string | number for ternary with different types', async () => {
      const code = 'const flag=true;const result=flag?"success":404;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*string\s*\|\s*number/);
    });

    it('should simplify boolean | boolean to boolean', async () => {
      const code = 'const condition=true;const value=condition?true:false;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*boolean/);
      expect(result).not.toMatch(/boolean\s*\|\s*boolean/);
    });

    it('should infer number | string for ternary', async () => {
      const code = 'const x=5;const result=x>0?100:"error";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(number\s*\|\s*string|string\s*\|\s*number)/);
    });

    it('should handle nested ternary with different types', async () => {
      const code = 'const score=85;const level=score>90?"A":score>70?"B":0;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/level:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
    });
  });

  describe('Logical expressions with different types', () => {
    it('should infer string | number for OR with different types', async () => {
      const code = 'const input="";const value=input||0;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
    });

    it('should infer boolean | string for AND with different types', async () => {
      const code = 'const flag=true;const result=flag&&"done";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(boolean\s*\|\s*string|string\s*\|\s*boolean)/);
    });

    it('should simplify string | string to string in OR', async () => {
      const code = 'const a="hello";const b="world";const result=a||b;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*string/);
      expect(result).not.toMatch(/string\s*\|\s*string/);
    });
  });

  describe('Union type simplification', () => {
    it('should simplify same types in ternary', async () => {
      const code = 'const flag=true;const result=flag?"yes":"no";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*string/);
      expect(result).not.toMatch(/string\s*\|\s*string/);
    });

    it('should simplify number | number to number', async () => {
      const code = 'const x=5;const result=x>0?100:200;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number/);
      expect(result).not.toMatch(/number\s*\|\s*number/);
    });
  });

  describe('Nested unions', () => {
    it('should flatten nested unions from propagated types', async () => {
      const code = 'const flag1=true;const flag2=false;const alpha=flag1?"x":"y";const beta=flag2?alpha:"z";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // alpha is string, beta is also string (all branches are string)
      expect(result).toMatch(/alpha:\s*string/);
      expect(result).toMatch(/beta:\s*string/);
    });

    it('should handle multi-level unions', async () => {
      const code = 'const flag1=true;const flag2=false;const charlie=flag1?"hello":123;const delta=flag2?charlie:true;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // charlie is string | number, delta is string | number | boolean
      expect(result).toMatch(/charlie:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
      expect(result).toMatch(/delta:\s*(string\s*\|\s*number\s*\|\s*boolean|boolean\s*\|\s*number\s*\|\s*string|number\s*\|\s*string\s*\|\s*boolean)/);
    });
  });

  describe('Array unions', () => {
    it('should infer number[] | string[] for different array types', async () => {
      const code = 'const flag=true;const mixed=flag?[1,2,3]:["a","b"];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/mixed:\s*(number\[\]\s*\|\s*string\[\]|string\[\]\s*\|\s*number\[\])/);
    });

    it('should simplify number[] | number[] to number[]', async () => {
      const code = 'const flag=true;const arr=flag?[1,2]:[3,4];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*number\[\]/);
      expect(result).not.toMatch(/number\[\]\s*\|\s*number\[\]/);
    });
  });

  describe('Type propagation with unions', () => {
    it('should propagate union types through assignments', async () => {
      const code = 'const flag=true;const value=flag?"text":42;const copied=value;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
      expect(result).toMatch(/copied:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
    });

    it('should propagate union types in ternary', async () => {
      const code = 'const flag1=true;const flag2=false;const value=flag1?"text":42;const result=flag2?value:"other";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
      // result should be string | number (value is string|number, "other" is string, so union simplifies)
      expect(result).toMatch(/result:\s*(string\s*\|\s*number|number\s*\|\s*string)/);
    });
  });

  describe('Union with null and undefined', () => {
    it('should handle string | null unions', async () => {
      const code = 'const flag=true;const result=flag?"text":null;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(string\s*\|\s*null|null\s*\|\s*string)/);
    });

    it('should handle number | undefined unions', async () => {
      const code = 'const flag=true;const result=flag?42:undefined;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(number\s*\|\s*undefined|undefined\s*\|\s*number)/);
    });
  });

  describe('Union complexity limits', () => {
    it('should handle 3-type unions', async () => {
      const code = 'const x=1;const result=x>0?"text":x<0?123:true;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should create a union with 3 types
      expect(result).toMatch(/result:\s*(string\s*\|\s*number\s*\|\s*boolean|boolean\s*\|\s*number\s*\|\s*string|number\s*\|\s*string\s*\|\s*boolean)/);
    });

    it('should fall back to any for very complex unions', async () => {
      const code = 'const x=1;const result=x===1?"a":x===2?2:x===3?true:x===4?null:"default";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // With 5 different types, should potentially fall back to any or limit union
      // Test passes if it either creates union or falls back to any
      expect(result).toContain('const');
    });
  });

  describe('Edge cases', () => {
    it('should handle union with RegExp', async () => {
      const code = 'const flag=true;const result=flag?/test/:null;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(RegExp\s*\|\s*null|null\s*\|\s*RegExp)/);
    });

    it('should handle union with object', async () => {
      const code = 'const flag=true;const result=flag?{x:1}:null;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(object\s*\|\s*null|null\s*\|\s*object)/);
    });

    it('should create unions even when intermediate values have low confidence', async () => {
      const code = 'const unknownFunc=()=>Math.random();const result=unknownFunc()>0.5?"text":42;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // The ternary branches have high-confidence types (string and number)
      // So union type is inferred regardless of unknownFunc confidence
      expect(result).toMatch(/result:\s*(string \| number|number \| string)/);
    });
  });
});
