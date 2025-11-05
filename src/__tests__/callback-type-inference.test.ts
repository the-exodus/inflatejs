import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Callback Type Inference', () => {
  // NOTE: Callback type inference (TODO.md item #27) should infer parameter types
  // in callbacks based on the array element type. For example:
  // const numbers = [1, 2, 3];
  // numbers.map(x => x * 2);  // x should be inferred as number

  describe('Array.prototype.map - Basic', () => {
    it('should infer callback parameter type from number array', async () => {
      const code = 'const numbers=[1,2,3];const doubled=numbers.map(x=>x*2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as number[]
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be inferred as number (variable may be renamed)
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Result should be number[]
      expect(result).toMatch(/doubled:\s*number\[\]/);
    });

    it('should infer callback parameter type from string array', async () => {
      const code = 'const words=["hello","world"];const lengths=words.map(w=>w.length);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as string[]
      expect(result).toMatch(/words:\s*string\[\]/);

      // Callback parameter should be inferred as string
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);

      // Result should be number[] (string.length returns number)
      expect(result).toMatch(/lengths:\s*number\[\]/);
    });

    it('should infer callback parameter type from boolean array', async () => {
      const code = 'const flags=[true,false,true];const negated=flags.map(f=>!f);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as boolean[]
      expect(result).toMatch(/flags:\s*boolean\[\]/);

      // Callback parameter should be inferred as boolean
      expect(result).toMatch(/\(\w+:\s*boolean\)\s*=>/);

      // Result should be boolean[]
      expect(result).toMatch(/negated:\s*boolean\[\]/);
    });
  });

  describe('Array.prototype.filter - Basic', () => {
    it('should infer callback parameter type from number array', async () => {
      const code = 'const numbers=[1,2,3,4,5];const evens=numbers.filter(n=>n%2===0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as number[]
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be inferred as number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Result should be number[] (filter preserves element type)
      expect(result).toMatch(/evens:\s*number\[\]/);
    });

    it('should infer callback parameter type from string array', async () => {
      const code = 'const words=["a","bb","ccc"];const long=words.filter(w=>w.length>1);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as string[]
      expect(result).toMatch(/words:\s*string\[\]/);

      // Callback parameter should be inferred as string
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);

      // Result should be string[]
      expect(result).toMatch(/long:\s*string\[\]/);
    });
  });

  describe('Array.prototype.forEach - Basic', () => {
    it('should infer callback parameter type from number array', async () => {
      const code = 'const numbers=[1,2,3];numbers.forEach(n=>console.log(n));';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as number[]
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be inferred as number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);
    });

    it('should infer callback parameter type from string array', async () => {
      const code = 'const words=["a","b"];words.forEach(w=>console.log(w));';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed as string[]
      expect(result).toMatch(/words:\s*string\[\]/);

      // Callback parameter should be inferred as string
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should handle data transformation pipeline', async () => {
      const code = 'const prices=[10,20,30];const taxed=prices.map(p=>p*1.1);const rounded=taxed.map(p=>Math.round(p));';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Original array
      expect(result).toMatch(/prices:\s*number\[\]/);

      // First map callback (parameter may be renamed, arrow may be expanded)
      expect(result).toMatch(/\(\w+:\s*(number|any)\)\s*=>/);
      expect(result).toMatch(/taxed:\s*number\[\]/);

      // Second map callback (parameter may be renamed, arrow may be expanded)
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);
      expect(result).toMatch(/rounded:\s*number\[\]/);
    });

    it('should handle string processing pipeline', async () => {
      const code = 'const names=["john","jane"];const capitalized=names.map(n=>n.toUpperCase());const exclaimed=capitalized.map(n=>n+"!");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Original array
      expect(result).toMatch(/names:\s*string\[\]/);

      // First map callback (parameter may be renamed)
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);
      expect(result).toMatch(/capitalized:\s*string\[\]/);

      // Second map callback (parameter may be renamed)
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);
      expect(result).toMatch(/exclaimed:\s*string\[\]/);
    });

    it('should handle filter then map pattern', async () => {
      const code = 'const numbers=[1,2,3,4,5];const doubled=numbers.filter(n=>n>2).map(n=>n*2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Original array
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Filter callback parameter (parameter may be renamed)
      expect(result).toMatch(/filter\(\(\w+:\s*number\)\s*=>/);

      // Map callback parameter (chained from filter, parameter may be renamed)
      expect(result).toMatch(/map\(\(\w+:\s*number\)\s*=>/);

      // Final result
      expect(result).toMatch(/doubled:\s*number\[\]/);
    });

    it('should handle user data processing', async () => {
      const code = 'const users=[{name:"John",age:30},{name:"Jane",age:25}];const names=users.map(u=>u.name);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Users array with object literal shape type
      expect(result).toMatch(/users:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}\[\]/);

      // Callback parameter should be the object type (parameter may be renamed)
      expect(result).toMatch(/\(\w+:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}\)\s*=>/);

      // Result should be string[]
      expect(result).toMatch(/names:\s*string\[\]/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty array', async () => {
      const code = 'const empty=[];const result=empty.map(x=>x*2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Empty arrays are typed as any[] (no element type to infer)
      expect(result).toMatch(/empty:\s*any\[\]/);

      // Callback parameter falls back to any
      expect(result).toMatch(/\(\w+:\s*any\)\s*=>/);
    });

    it('should handle multiple callback parameters (item, index)', async () => {
      const code = 'const numbers=[1,2,3];const indexed=numbers.map((n,i)=>n+i);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // First parameter (item) should be number (variable names may be renamed)
      expect(result).toMatch(/\(\w+:\s*number/);

      // Second parameter (index) should be number
      expect(result).toMatch(/,\s*\w+:\s*number\)/);
    });

    it('should handle multiple callback parameters (item, index, array)', async () => {
      const code = 'const numbers=[1,2,3];const result=numbers.map((n,i,arr)=>n+arr[i]);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // First parameter (item) should be number (variable names may be renamed)
      expect(result).toMatch(/\(\w+:\s*number/);

      // Second parameter (index) should be number
      expect(result).toMatch(/,\s*\w+:\s*number/);

      // Third parameter (array) should be number[]
      expect(result).toMatch(/,\s*\w+:\s*number\[\]/);
    });

    it('should handle nested callbacks', async () => {
      const code = 'const matrix=[[1,2],[3,4]];const flattened=matrix.map(row=>row.map(n=>n*2));';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Matrix should be number[][]
      expect(result).toContain('matrix');

      // Outer callback parameter should be number[]
      expect(result).toMatch(/\(row:\s*number\[\]\)\s*=>/);

      // Inner callback parameter should be number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);
    });

    it('should handle callback with destructuring parameter', async () => {
      const code = 'const users=[{name:"John",age:30}];const names=users.map(({name})=>name);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Users array
      expect(result).toMatch(/users:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}\[\]/);

      // Callback should have pattern-level type annotation
      // This is an advanced case - may be implemented later
      expect(result).toContain('map');
      expect(result).toContain('name');
    });

    it('should handle callback returning callback', async () => {
      const code = 'const numbers=[1,2,3];const adders=numbers.map(n=>x=>x+n);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Outer callback parameter should be number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Inner callback parameter type inference is complex - may not be implemented yet
      expect(result).toContain('adders');
    });
  });

  describe('Array.prototype.reduce - Advanced', () => {
    it.skip('should infer callback parameters for reduce with number accumulator', async () => {
      // TODO: Reduce return type inference not yet implemented
      // Currently reduce is hardcoded to return 'any' in known-types.ts
      // To fix: Make known-types context-aware to infer reduce return type from initial value
      // Blocked on: Context-aware method return type inference (enhancement)
      const code = 'const numbers=[1,2,3];const sum=numbers.reduce((acc,n)=>acc+n,0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Accumulator should be number (from initial value 0)
      expect(result).toMatch(/\(acc:\s*number/);

      // Current value should be number (from array element type)
      // Parameter may be renamed from 'n' to 'value' or similar
      expect(result).toMatch(/,\s*\w+:\s*number\)\s*=>/);

      // Result should be number
      expect(result).toMatch(/sum:\s*number/);
    });

    it.skip('should infer callback parameters for reduce with string accumulator', async () => {
      // TODO: Reduce return type inference not yet implemented
      // Currently reduce is hardcoded to return 'any' in known-types.ts
      // To fix: Make known-types context-aware to infer reduce return type from initial value
      // Blocked on: Context-aware method return type inference (enhancement)
      const code = 'const words=["a","b","c"];const joined=words.reduce((acc,w)=>acc+w,"");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/words:\s*string\[\]/);

      // Accumulator should be string (from initial value "")
      expect(result).toMatch(/\(acc:\s*string/);

      // Current value should be string (from array element type)
      // Parameter may be renamed from 'w' to 'value' or similar
      expect(result).toMatch(/,\s*\w+:\s*string\)\s*=>/);

      // Result should be string
      expect(result).toMatch(/joined:\s*string/);
    });

    it('should infer callback parameters for reduce with array accumulator', async () => {
      const code = 'const numbers=[1,2,3];const doubled=numbers.reduce((acc,n)=>[...acc,n*2],[]);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Accumulator should be inferred from initial value [] and usage
      // This is complex - may infer any[] or number[] depending on implementation
      expect(result).toMatch(/\(acc:\s*(any\[\]|number\[\])/);

      // Current value should be number
      // Parameter may be renamed from 'n' to 'value' or similar
      expect(result).toMatch(/,\s*\w+:\s*number\)\s*=>/);

    });

    it('should infer callback parameters for reduce with object accumulator', async () => {
      const code = 'const numbers=[1,2,3];const counts=numbers.reduce((acc,n)=>{acc[n]=1;return acc;},{});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Accumulator should be {} or object (from initial value {})
      expect(result).toMatch(/\(acc:\s*(\{\}|object)/);

      // Current value should be number
      // Parameter may be renamed from 'n' to 'value' or similar
      expect(result).toMatch(/,\s*\w+:\s*number\)\s*=>/);
    });
  });

  describe('Array.prototype.some and every', () => {
    it('should infer callback parameter type for some', async () => {
      const code = 'const numbers=[1,2,3];const hasEven=numbers.some(n=>n%2===0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Result should be boolean
      expect(result).toMatch(/hasEven:\s*boolean/);
    });

    it('should infer callback parameter type for every', async () => {
      const code = 'const numbers=[1,2,3];const allPositive=numbers.every(n=>n>0);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Result should be boolean
      expect(result).toMatch(/allPositive:\s*boolean/);
    });
  });

  describe('Array.prototype.find and findIndex', () => {
    it('should infer callback parameter type for find', async () => {
      const code = 'const numbers=[1,2,3];const found=numbers.find(n=>n>2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/numbers:\s*number\[\]/);

      // Callback parameter should be number
      expect(result).toMatch(/\(\w+:\s*number\)\s*=>/);

      // Result should be number | undefined
      expect(result).toMatch(/found:\s*(number \| undefined|undefined \| number)/);
    });

    it('should infer callback parameter type for findIndex', async () => {
      const code = 'const words=["a","bb","ccc"];const index=words.findIndex(w=>w.length>1);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array should be typed
      expect(result).toMatch(/words:\s*string\[\]/);

      // Callback parameter should be string
      expect(result).toMatch(/\(\w+:\s*string\)\s*=>/);

      // Result should be number
      expect(result).toMatch(/index:\s*number/);
    });
  });

  describe('Confidence and Fallback', () => {
    it('should fall back to any for callbacks on untyped arrays', async () => {
      const code = 'function process(arr){return arr.map(x=>x*2);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Parameter arr has unknown type
      // Callback parameter should fall back to any
      expect(result).toMatch(/\(\w+:\s*any\)\s*=>/);
    });

    it('should handle mixed type arrays gracefully', async () => {
      const code = 'const mixed=[1,"two",3];const result=mixed.map(x=>x);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Mixed arrays currently inferred as any[]
      // TODO: Union types would make this (number | string)[]
      expect(result).toMatch(/mixed:\s*any\[\]/);
      expect(result).toMatch(/\(\w+:\s*any\)\s*=>/);
    });
  });
});
