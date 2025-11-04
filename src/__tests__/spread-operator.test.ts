/**
 * Spread Operator Tests
 * Tests for Phase 3, item 14: Spread operator type inference
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Spread Operator', () => {
  describe('Array spread', () => {
    it('should infer number[] from spreading number array', async () => {
      const code = 'const arr1=[1,2,3];const arr2=[...arr1,4,5];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr1:\s*number\[\]/);
      expect(result).toMatch(/arr2:\s*number\[\]/);
    });

    it('should infer string[] from spreading string array', async () => {
      const code = 'const words=["a","b"];const more=[...words,"c"];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/words:\s*string\[\]/);
      expect(result).toMatch(/more:\s*string\[\]/);
    });

    it('should handle spread with only spread elements', async () => {
      const code = 'const arr1=[1,2];const arr2=[3,4];const combined=[...arr1,...arr2];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/combined:\s*number\[\]/);
    });

    it('should handle spread at beginning of array', async () => {
      const code = 'const arr=[1,2];const result=[...arr];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number\[\]/);
    });

    it('should handle spread in middle of array', async () => {
      const code = 'const mid=[2,3];const arr=[1,...mid,4];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*number\[\]/);
    });

    it('should handle empty array spread', async () => {
      const code = 'const empty=[];const result=[...empty,1,2];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*(any\[\]|number\[\])/);
    });
  });

  describe('Object spread', () => {
    it('should infer object from spreading object', async () => {
      const code = 'const obj1={x:1,y:2};const obj2={...obj1,z:3};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj1:\s*object/);
      expect(result).toMatch(/obj2:\s*object/);
    });

    it('should handle multiple object spreads', async () => {
      const code = 'const a={x:1};const b={y:2};const c={...a,...b,z:3};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/variable3:\s*object/);
    });

    it('should handle object spread with no additional properties', async () => {
      const code = 'const orig={a:1};const copy={...orig};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/copy:\s*object/);
    });

    it('should handle empty object spread', async () => {
      const code = 'const empty={};const result={...empty,x:1};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*object/);
    });
  });

  describe('Function call spread', () => {
    it('should infer type from Math.max with spread', async () => {
      const code = 'const nums=[1,2,3];const max=Math.max(...nums);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/max:\s*number/);
    });

    it('should infer type from Math.min with spread', async () => {
      const code = 'const values=[5,10,15];const min=Math.min(...values);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/min:\s*number/);
    });

    it('should handle spread in function call with other args', async () => {
      const code = 'const arr=[2,3];const result=Math.max(1,...arr,4);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number/);
    });

    it('should handle array concat with spread', async () => {
      const code = 'const a=[1,2];const b=[3,4];const result=[].concat(...a,...b);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*any\[\]/);
    });
  });

  describe('Mixed spread scenarios', () => {
    it('should handle spread in arrow function return', async () => {
      const code = 'const clone=arr=>[...arr];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should compile without errors
      expect(result).toBeTruthy();
    });

    it('should handle spread with different types', async () => {
      const code = 'const nums=[1,2];const strs=["a","b"];const mixed=[...nums,...strs];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Mixed array - could be any[] or (number | string)[]
      expect(result).toMatch(/mixed:\s*(any\[\]|\(number \| string\)\[\])/);
    });

    it('should handle nested spread', async () => {
      const code = 'const inner=[1,2];const outer=[[...inner],3];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toBeTruthy();
    });
  });

  describe('Spread in array methods', () => {
    it('should handle spread with push', async () => {
      const code = 'const arr=[1,2];const more=[3,4];arr.push(...more);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toBeTruthy();
    });

    it('should handle spread with unshift', async () => {
      const code = 'const arr=[3,4];const prefix=[1,2];arr.unshift(...prefix);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toBeTruthy();
    });
  });

  describe('Edge cases', () => {
    it('should handle spread of spread', async () => {
      const code = 'const a=[1];const b=[...a];const c=[...b];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/variable3:\s*number\[\]/);
    });

    it('should handle spread in ternary', async () => {
      const code = 'const arr=[1,2];const result=true?[...arr]:[3,4];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number\[\]/);
    });

    it('should handle spread with template', async () => {
      const code = 'const args=[1,2];console.log(`Values:`,...args);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toBeTruthy();
    });

    it('should handle object spread with computed keys', async () => {
      const code = 'const obj={a:1};const key="b";const result={...obj,[key]:2};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*object/);
    });
  });

  describe('Real-world examples', () => {
    it('should handle array cloning pattern', async () => {
      const code = 'const original=[1,2,3];const clone=[...original];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/clone:\s*number\[\]/);
    });

    it('should handle object cloning pattern', async () => {
      const code = 'const user={name:"John",age:30};const userCopy={...user};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/userCopy:\s*object/);
    });

    it('should handle merging objects pattern', async () => {
      const code = 'const defaults={x:0,y:0};const config={...defaults,x:10};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/config:\s*object/);
    });

    it('should handle array concatenation pattern', async () => {
      const code = 'const arr1=[1,2];const arr2=[3,4];const all=[...arr1,...arr2];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/all:\s*number\[\]/);
    });

    it('should handle function with spread args', async () => {
      const code = 'function sum(...nums){return nums.reduce((a,b)=>a+b,0);}const arr=[1,2,3];const total=sum(...arr);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toBeTruthy();
    });

    it('should handle array prepend/append', async () => {
      const code = 'const middle=[2,3];const arr=[1,...middle,4];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*number\[\]/);
    });
  });
});
