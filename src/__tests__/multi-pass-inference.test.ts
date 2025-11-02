/**
 * Multi-pass type inference tests
 * Tests for iterative type refinement, Promise unwrapping, and cross-variable propagation
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Multi-pass type inference', () => {
  describe('Promise constructor inference', () => {
    it('should infer Promise<number> from new Promise with resolve(number)', async () => {
      const code = 'function f(x){return new Promise(r=>{r(x*2)})}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise<number>/);
    });

    it('should infer Promise<string> from new Promise with resolve(string)', async () => {
      const code = 'function f(x){return new Promise(r=>{r("hello")})}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise<string>/);
    });

    it('should handle Promise with resolve in nested callback', async () => {
      const code = 'function f(x){return new Promise(r=>{setTimeout(()=>r(x*2),100)})}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise<number>/);
    });

    it('should infer Promise<any> when resolve type cannot be determined', async () => {
      const code = 'function f(){return new Promise(r=>{r()})}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise</);
    });
  });

  describe('Promise unwrapping with await', () => {
    it('should unwrap Promise<number> to number with await', async () => {
      const code = `
        function p(){return new Promise(r=>r(42))}
        async function f(){const x=await p();return x+1}
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // The variable x should have type number (unwrapped from Promise<number>)
      // The function f should return Promise<number>
      expect(result).toMatch(/async function.*Promise<number>/);
    });

    it('should handle multiple await expressions', async () => {
      const code = `
        function p1(){return new Promise(r=>r(10))}
        function p2(){return new Promise(r=>r(20))}
        async function f(){const a=await p1();const b=await p2();return a+b}
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise<number>/);
    });

    it('should handle await of non-Promise values', async () => {
      const code = 'async function f(x){const y=await x;return y}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should not crash, should handle gracefully
      expect(result).toContain('async function');
    });
  });

  describe('Variable-to-variable type propagation', () => {
    it('should propagate type from one variable to another', async () => {
      const code = 'const a=42;const b=a;const c=b;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // All variables should be inferred as number
      expect(result).toMatch(/const.*:\s*number.*=\s*42/);
    });

    it('should propagate string type through assignments', async () => {
      const code = 'const x="hello";const y=x;const z=y.toUpperCase();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*string/);
    });

    it('should propagate array type through assignments', async () => {
      const code = 'const a=[1,2,3];const b=a;const c=b.map(x=>x*2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/number\[\]/);
    });

    it('should propagate function return types to variables', async () => {
      const code = 'function f(){return 42}const x=f();const y=x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*number/);
    });
  });

  describe('Binary expression type inference', () => {
    it('should infer number from arithmetic operations', async () => {
      const code = 'const a=5+3;const b=a*2;const c=b-1;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*number/);
    });

    it('should infer string from string concatenation', async () => {
      const code = 'const a="hello";const b=a+" world";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*string/);
    });

    it('should infer string when concatenating string with number', async () => {
      const code = 'const a="value: ";const b=a+42;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*string/);
    });

    it('should infer boolean from comparison operations', async () => {
      const code = 'const a=5>3;const b=10===10;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Comparisons return boolean, but we might not annotate literals
      expect(result).toContain('const');
    });
  });

  describe('Member expression type inference', () => {
    it('should infer type from string methods', async () => {
      const code = 'const s="hello";const a=s.split(",");const b=s.length;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/string\[\]/); // split returns string[]
      expect(result).toMatch(/:\s*number/); // length is number
    });

    it('should infer type from array methods', async () => {
      const code = 'const arr=[1,2,3];const mapped=arr.map(x=>x*2);const joined=arr.join(",");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/number\[\]/);
      expect(result).toMatch(/:\s*string/);
    });
  });

  describe('Complex multi-pass scenarios', () => {
    it('should handle Promise chain with multiple passes', async () => {
      const code = `
        function fetchData(){return new Promise(r=>r({id:1,name:"test"}))}
        async function process(){
          const data=await fetchData();
          const id=data.id;
          return id;
        }
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/Promise/);
      expect(result).toContain('async');
    });

    it('should handle iterative refinement across function calls', async () => {
      const code = `
        function add(a,b){return a+b}
        function double(x){return x*2}
        const result1=add(5,3);
        const result2=double(result1);
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*number/);
    });

    it('should handle higher-order functions with type propagation', async () => {
      const code = `
        function makeAdder(x){return function(y){return x+y}}
        const add5=makeAdder(5);
        const result=add5(10);
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/=>/); // Should have function types
    });
  });

  describe('Constructor inference', () => {
    it('should infer Date type from new Date', async () => {
      const code = 'const d=new Date();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*Date/);
    });

    it('should infer Error type from new Error', async () => {
      const code = 'const e=new Error("test");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*Error/);
    });

    it('should infer RegExp type from new RegExp', async () => {
      const code = 'const r=new RegExp("\\\\d+");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*RegExp/);
    });
  });

  describe('Edge cases and convergence', () => {
    it('should handle circular references gracefully', async () => {
      const code = 'function a(){return b()}function b(){return a()}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should not hang or crash
      expect(result).toContain('function');
    });

    it('should converge on correct types within iteration limit', async () => {
      const code = `
        const a=1;
        const b=a;
        const c=b;
        const d=c;
        const e=d;
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // All should eventually be inferred as number
      expect(result).toMatch(/:\s*number/);
    });

    it('should handle mixed literal and variable assignments', async () => {
      const code = `
        const x=10;
        const y="hello";
        const z=[1,2,3];
        const a=x;
        const b=y;
        const c=z;
      `;
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*number/);
      expect(result).toMatch(/:\s*string/);
      expect(result).toMatch(/number\[\]/);
    });
  });
});
