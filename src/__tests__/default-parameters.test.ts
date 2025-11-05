/**
 * Default Parameters Tests
 * Tests for Phase 3, item 11: Default parameter type inference
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Default Parameters', () => {
  describe('String defaults', () => {
    it('should infer string type from string literal default', async () => {
      const code = 'function greet(name="Guest"){return `Hello, ${name}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
    });

    it('should infer string type from template literal default', async () => {
      const code = 'function log(prefix=`[INFO]`){return prefix+" message";}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/prefix:\s*string/);
    });

    it('should handle empty string default', async () => {
      const code = 'function process(text=""){return text.toUpperCase();}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/text:\s*string/);
    });
  });

  describe('Number defaults', () => {
    it('should infer number type from integer default', async () => {
      const code = 'function increment(x,delta=1){return x+delta;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/delta:\s*number/);
    });

    it('should infer number type from decimal default', async () => {
      const code = 'function multiply(x,factor=1.5){return x*factor;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/factor:\s*number/);
    });

    it('should infer number type from zero default', async () => {
      const code = 'function sum(a,b=0){return a+b;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/b:\s*number/);
    });

    it('should infer number type from negative default', async () => {
      const code = 'function offset(x,delta=-1){return x+delta;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/delta:\s*number/);
    });
  });

  describe('Boolean defaults', () => {
    it('should infer boolean type from true default', async () => {
      const code = 'function process(verbose=true){return verbose?"yes":"no";}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/verbose:\s*boolean/);
    });

    it('should infer boolean type from false default', async () => {
      const code = 'function check(strict=false){return strict;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/strict:\s*boolean/);
    });
  });

  describe('Null and undefined defaults', () => {
    it('should infer null type from null default', async () => {
      const code = 'function process(value=null){return value;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*null/);
    });

    it('should infer undefined type from undefined default', async () => {
      const code = 'function process(value=undefined){return value;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*undefined/);
    });
  });

  describe('Array defaults', () => {
    it('should infer number[] from number array default', async () => {
      const code = 'function process(items=[1,2,3]){return items.length;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/items:\s*number\[\]/);
    });

    it('should infer string[] from string array default', async () => {
      const code = 'function join(words=["a","b"]){return words.join(",");}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/words:\s*string\[\]/);
    });

    it('should infer any[] from empty array default', async () => {
      const code = 'function process(items=[]){return items.length;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/items:\s*any\[\]/);
    });
  });

  describe('Object defaults', () => {
    it('should infer object type from object literal default', async () => {
      const code = 'function process(opts={x:1,y:2}){return opts.x;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Now infers specific object shape instead of generic 'object'
      expect(result).toMatch(/opts:\s*\{\s*x:\s*number\s*,\s*y:\s*number\s*\}/);
    });

    it('should infer object type from empty object default', async () => {
      const code = 'function merge(obj={}){return obj;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Empty object gets specific {} type instead of generic 'object'
      expect(result).toMatch(/obj:\s*\{\s*\}/);
    });
  });

  describe('Multiple parameters with defaults', () => {
    it('should infer types for all default parameters', async () => {
      const code = 'function config(host="localhost",port=3000,secure=false){return `${host}:${port}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/host:\s*string/);
      expect(result).toMatch(/port:\s*number/);
      expect(result).toMatch(/secure:\s*boolean/);
    });

    it('should handle mix of default and non-default parameters', async () => {
      const code = 'function greet(name,greeting="Hello"){return greeting+" "+name;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/greeting:\s*string/);
      // name has no default, should be any or not typed
    });

    it('should handle parameters before and after defaults', async () => {
      const code = 'function process(a,b=10,c,d=true){return b+d;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/b:\s*number/);
      expect(result).toMatch(/d:\s*boolean/);
    });
  });

  describe('Arrow functions with defaults', () => {
    it('should infer default parameter type in arrow function', async () => {
      const code = 'const greet=(name="Guest")=>`Hello, ${name}`;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
    });

    it('should handle multiple defaults in arrow function', async () => {
      const code = 'const add=(a=0,b=0)=>a+b;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*number/);
      expect(result).toMatch(/b:\s*number/);
    });

    it('should handle arrow function with single default parameter', async () => {
      const code = 'const double=(x=1)=>x*2;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
    });
  });

  describe('Function expressions with defaults', () => {
    it('should infer defaults in named function expression', async () => {
      const code = 'const fn=function greet(name="World"){return name;};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
    });

    it('should infer defaults in anonymous function expression', async () => {
      const code = 'const fn=function(count=0){return count+1;};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/count:\s*number/);
    });
  });

  describe('Complex default expressions', () => {
    it('should infer from binary expression default', async () => {
      const code = 'function calc(x,y=5+10){return x+y;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Binary expression 5+10 should infer as number
      expect(result).toMatch(/y:\s*number/);
    });

    it('should infer from string concatenation default', async () => {
      const code = 'function greet(name,greeting="Hello"+" there"){return greeting;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/greeting:\s*string/);
    });

    it('should infer from unary expression default', async () => {
      const code = 'function negate(x,flag=!true){return flag;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/flag:\s*boolean/);
    });
  });

  describe('Edge cases', () => {
    it('should handle default parameter that references previous parameter', async () => {
      const code = 'function repeat(str,count=str.length){return str.repeat(count);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // count references str.length which is number
      expect(result).toMatch(/count:\s*number/);
    });

    it('should handle RegExp literal default', async () => {
      const code = 'function match(text,pattern=/\\d+/){return pattern.test(text);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should handle very long parameter list with defaults', async () => {
      const code = 'function config(a=1,b=2,c=3,d=4,e=5){return a+b+c+d+e;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*number/);
      expect(result).toMatch(/b:\s*number/);
      expect(result).toMatch(/c:\s*number/);
      expect(result).toMatch(/d:\s*number/);
      expect(result).toMatch(/e:\s*number/);
    });
  });

  describe('Real-world examples', () => {
    it('should handle HTTP request function with defaults', async () => {
      const code = 'function request(url,method="GET",timeout=5000){return `${method} ${url}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/method:\s*string/);
      expect(result).toMatch(/timeout:\s*number/);
    });

    it('should handle logger function with defaults', async () => {
      const code = 'function log(message,level="info",timestamp=Date.now()){return `[${level}] ${message}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/level:\s*string/);
      expect(result).toMatch(/timestamp:\s*number/);
    });

    it('should handle pagination function with defaults', async () => {
      const code = 'function paginate(items,page=1,pageSize=10){return items.slice(page*pageSize,(page+1)*pageSize);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/page:\s*number/);
      expect(result).toMatch(/pageSize:\s*number/);
    });
  });
});
