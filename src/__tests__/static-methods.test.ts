/**
 * Object and Array static methods type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Object static methods type inference', () => {
  describe('Object.keys()', () => {
    it('should infer string[] for Object.keys()', async () => {
      const code = 'const obj={x:1,y:2,z:3};const keys=Object.keys(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/keys:\s*string\[\]/);
    });

    it('should infer string[] for Object.keys() with literal', async () => {
      const code = 'const keys=Object.keys({a:1,b:2});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/keys:\s*string\[\]/);
    });

    it('should infer string[] for Object.keys() in expression', async () => {
      const code = 'const obj={x:1};const keys=Object.keys(obj);const count=keys.length;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/keys:\s*string\[\]/);
      expect(result).toMatch(/count:\s*number/);
    });
  });

  describe('Object.values()', () => {
    it('should infer any[] for Object.values()', async () => {
      const code = 'const obj={x:1,y:2,z:3};const values=Object.values(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/values:\s*any\[\]/);
    });

    it('should infer any[] for Object.values() with literal', async () => {
      const code = 'const values=Object.values({a:"hello",b:"world"});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/values:\s*any\[\]/);
    });
  });

  describe('Object.entries()', () => {
    it('should infer [string, any][] for Object.entries()', async () => {
      const code = 'const obj={x:1,y:2};const entries=Object.entries(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/entries:\s*\[string,\s*any\]\[\]/);
    });

    it('should infer [string, any][] for Object.entries() with literal', async () => {
      const code = 'const entries=Object.entries({a:1,b:2});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/entries:\s*\[string,\s*any\]\[\]/);
    });
  });

  describe('Object.assign()', () => {
    it('should infer object for Object.assign()', async () => {
      const code = 'const obj1={x:1};const obj2={y:2};const merged=Object.assign(obj1,obj2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/merged:\s*object/);
    });

    it('should infer object for Object.assign() with literal', async () => {
      const code = 'const merged=Object.assign({},{a:1},{b:2});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/merged:\s*object/);
    });
  });

  describe('Object.create()', () => {
    it('should infer object for Object.create()', async () => {
      const code = 'const proto={x:1};const obj=Object.create(proto);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*object/);
    });

    it('should infer object for Object.create(null)', async () => {
      const code = 'const obj=Object.create(null);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*object/);
    });
  });

  describe('Object.freeze() and Object.seal()', () => {
    it('should infer object for Object.freeze()', async () => {
      const code = 'const obj={x:1};const frozen=Object.freeze(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/frozen:\s*object/);
    });

    it('should infer object for Object.seal()', async () => {
      const code = 'const obj={x:1};const sealed=Object.seal(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sealed:\s*object/);
    });
  });
});

describe('Array static methods type inference', () => {
  describe('Array.isArray()', () => {
    it('should infer boolean for Array.isArray()', async () => {
      const code = 'const arr=[1,2,3];const isArr=Array.isArray(arr);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/isArr:\s*boolean/);
    });

    it('should infer boolean for Array.isArray() with literal', async () => {
      const code = 'const isArr=Array.isArray([1,2,3]);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/isArr:\s*boolean/);
    });

    it('should infer boolean for Array.isArray() with non-array', async () => {
      const code = 'const isArr=Array.isArray("hello");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/isArr:\s*boolean/);
    });
  });

  describe('Array.from()', () => {
    it('should infer any[] for Array.from()', async () => {
      const code = 'const arr=Array.from("hello");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*any\[\]/);
    });

    it('should infer any[] for Array.from() with iterable', async () => {
      const code = 'const set=new Set([1,2,3]);const arr=Array.from(set);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*any\[\]/);
    });

    it('should infer any[] for Array.from() with array-like', async () => {
      const code = 'const arrayLike={0:"a",1:"b",length:2};const arr=Array.from(arrayLike);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*any\[\]/);
    });
  });

  describe('Array.of()', () => {
    it('should infer any[] for Array.of()', async () => {
      const code = 'const arr=Array.of(1,2,3);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*any\[\]/);
    });

    it('should infer any[] for Array.of() with single element', async () => {
      const code = 'const arr=Array.of(5);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*any\[\]/);
    });
  });
});

describe('Type conversion functions', () => {
  describe('parseInt() and parseFloat()', () => {
    it('should infer number for parseInt()', async () => {
      const code = 'const num=parseInt("42");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });

    it('should infer number for parseInt() with radix', async () => {
      const code = 'const num=parseInt("ff",16);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });

    it('should infer number for parseFloat()', async () => {
      const code = 'const num=parseFloat("3.14");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });
  });

  describe('Number(), String(), Boolean()', () => {
    it('should infer number for Number()', async () => {
      const code = 'const num=Number("123");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });

    it('should infer number for Number() with boolean', async () => {
      const code = 'const num=Number(true);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
    });

    it('should infer string for String()', async () => {
      const code = 'const str=String(123);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/str:\s*string/);
    });

    it('should infer string for String() with boolean', async () => {
      const code = 'const str=String(false);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/str:\s*string/);
    });

    it('should infer boolean for Boolean()', async () => {
      const code = 'const bool=Boolean(1);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/bool:\s*boolean/);
    });

    it('should infer boolean for Boolean() with string', async () => {
      const code = 'const bool=Boolean("hello");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/bool:\s*boolean/);
    });
  });

  describe('Type conversion in expressions', () => {
    it('should handle parseInt() in arithmetic', async () => {
      const code = 'const num=parseInt("10");const doubled=num*2;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
      expect(result).toMatch(/doubled:\s*number/);
    });

    it('should handle String() in concatenation', async () => {
      const code = 'const str=String(42);const msg="Number: "+str;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/str:\s*string/);
      expect(result).toMatch(/msg:\s*string/);
    });

    it('should handle Boolean() in conditions', async () => {
      const code = 'const value=1;const bool=Boolean(value);const result=bool?"yes":"no";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/bool:\s*boolean/);
      expect(result).toMatch(/result:\s*string/);
    });
  });
});
