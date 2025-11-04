import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Destructuring', () => {
  describe('Object Destructuring - Basic', () => {
    it('should handle basic object destructuring from literal', async () => {
      const code = 'const user={name:"John",age:30};const {name,age}=user;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Variables should have inferred types from object literal
      expect(result).toMatch(/name:\s*string/);
      expect(result).toMatch(/age:\s*number/);
    });

    it('should handle object destructuring with property access', async () => {
      const code = 'const obj={x:1,y:2};const {x,y}=obj;const sum=x+y;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
      expect(result).toMatch(/sum:\s*number/);
    });

    it('should handle object destructuring with renaming (alias)', async () => {
      const code = 'const user={name:"John"};const {name:userName}=user;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // The alias (userName) should have the type of the original property
      expect(result).toMatch(/userName:\s*string/);
    });

    it('should handle partial object destructuring', async () => {
      const code = 'const obj={a:1,b:2,c:3};const {a,c}=obj;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*number/);
      expect(result).toMatch(/c:\s*number/);
    });
  });

  describe('Object Destructuring - Advanced', () => {
    it('should handle nested object destructuring', async () => {
      const code = 'const data={user:{name:"John",age:30}};const {user:{name,age}}=data;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
      expect(result).toMatch(/age:\s*number/);
    });

    it('should handle object destructuring with default values', async () => {
      const code = 'const obj={x:1};const {x,y=2}=obj;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/); // Default value is number
    });

    it('should handle object destructuring with rest properties', async () => {
      const code = 'const obj={a:1,b:2,c:3};const {a,...rest}=obj;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*number/);
      expect(result).toMatch(/rest:\s*object/); // Rest should be object
    });

    it('should handle object destructuring from unknown object', async () => {
      const code = 'function process(obj){const {x,y}=obj;return x+y;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // When destructuring from unknown object, variables should be any
      expect(result).toMatch(/x:\s*any/);
      expect(result).toMatch(/y:\s*any/);
    });
  });

  describe('Array Destructuring - Basic', () => {
    it('should handle basic array destructuring from literal', async () => {
      const code = 'const coords=[10,20];const [x,y]=coords;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
    });

    it('should handle array destructuring with usage', async () => {
      const code = 'const arr=[1,2,3];const [first,second]=arr;const sum=first+second;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/first:\s*number/);
      expect(result).toMatch(/second:\s*number/);
      expect(result).toMatch(/sum:\s*number/);
    });

    it('should handle array destructuring with skipped elements', async () => {
      const code = 'const arr=[1,2,3,4];const [first,,third]=arr;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/first:\s*number/);
      expect(result).toMatch(/third:\s*number/);
    });
  });

  describe('Array Destructuring - Advanced', () => {
    it('should handle nested array destructuring', async () => {
      const code = 'const matrix=[[1,2],[3,4]];const [[a,b],[c,d]]=matrix;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*number/);
      expect(result).toMatch(/b:\s*number/);
      expect(result).toMatch(/c:\s*number/);
      expect(result).toMatch(/d:\s*number/);
    });

    it('should handle array destructuring with default values', async () => {
      const code = 'const arr=[1];const [x,y=2,z=3]=arr;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
      expect(result).toMatch(/z:\s*number/);
    });

    it('should handle array destructuring with rest elements', async () => {
      const code = 'const arr=[1,2,3,4,5];const [first,...rest]=arr;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/first:\s*number/);
      expect(result).toMatch(/rest:\s*number\[\]/); // Rest should be number[]
    });

    it('should handle array destructuring from string array', async () => {
      const code = 'const words=["hello","world"];const [first,second]=words;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/first:\s*string/);
      expect(result).toMatch(/second:\s*string/);
    });

    it('should handle array destructuring from unknown array', async () => {
      const code = 'function process(arr){const [x,y]=arr;return x+y;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // When destructuring from unknown array, variables should be any
      expect(result).toMatch(/x:\s*any/);
      expect(result).toMatch(/y:\s*any/);
    });
  });

  describe('Parameter Destructuring', () => {
    it('should handle object destructuring in function parameters', async () => {
      const code = 'function greet({name,age}){return `${name} is ${age}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Parameters from destructuring should be any by default
      expect(result).toMatch(/name:\s*any/);
      expect(result).toMatch(/age:\s*any/);
    });

    it('should handle object destructuring in arrow function parameters', async () => {
      const code = 'const greet=({name,age})=>`${name} is ${age}`;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*any/);
      expect(result).toMatch(/age:\s*any/);
    });

    it('should handle array destructuring in function parameters', async () => {
      const code = 'function sum([a,b]){return a+b;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*any/);
      expect(result).toMatch(/b:\s*any/);
    });

    it('should handle parameter destructuring with default values', async () => {
      const code = 'function greet({name="Guest",age=0}={}){return name;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/); // Default value gives type
      expect(result).toMatch(/age:\s*number/);
    });

    it('should handle parameter destructuring with rest', async () => {
      const code = 'function process({first,...rest}){return first;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/first:\s*any/);
      expect(result).toMatch(/rest:\s*object/);
    });

    it('should handle mixed parameters with destructuring', async () => {
      const code = 'function fn(a,{x,y},b){return a+x+y+b;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/a:\s*any/);
      expect(result).toMatch(/x:\s*any/);
      expect(result).toMatch(/y:\s*any/);
      expect(result).toMatch(/b:\s*any/);
    });
  });

  describe('Mixed and Edge Cases', () => {
    it('should handle mixed object and array destructuring', async () => {
      const code = 'const data={arr:[1,2]};const {arr:[x,y]}=data;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
    });

    it('should handle destructuring in variable reassignment', async () => {
      const code = 'let x,y;const obj={a:1,b:2};({a:x,b:y}=obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // x and y should get types from the assignment
      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
    });

    it('should handle destructuring in for-of loop', async () => {
      const code = 'const arr=[[1,2],[3,4]];for(const [x,y] of arr){console.log(x,y);}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
    });

    it('should handle complex nested destructuring', async () => {
      const code = 'const data={user:{name:"John",coords:[10,20]}};const {user:{name,coords:[x,y]}}=data;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
      expect(result).toMatch(/x:\s*number/);
      expect(result).toMatch(/y:\s*number/);
    });

    it('should handle empty destructuring patterns', async () => {
      const code = 'const obj={};const {}=obj;const arr=[];const []=arr;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should not crash, just format properly
      expect(result).toBeTruthy();
      expect(result).toContain('const obj');
      expect(result).toContain('const arr');
    });
  });

  describe('Realistic Scenarios', () => {
    it('should handle destructuring in API response processing', async () => {
      const code = 'function processUser(response){const {data:{user:{id,name,email}}}=response;return {id,name,email};}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Variables should be typed as any when source is unknown
      expect(result).toMatch(/id:\s*any/);
      expect(result).toMatch(/name:\s*any/);
      expect(result).toMatch(/email:\s*any/);
    });

    it('should handle destructuring with type propagation', async () => {
      const code = 'const config={port:3000,host:"localhost"};const {port,host}=config;const url=`http://${host}:${port}`;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/port:\s*number/);
      expect(result).toMatch(/host:\s*string/);
      expect(result).toMatch(/url:\s*string/); // Template literal is string
    });

    it('should handle destructuring in React-style props', async () => {
      const code = 'function Component({title,count,onClick}){return `${title}: ${count}`;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/title:\s*any/);
      expect(result).toMatch(/count:\s*any/);
      expect(result).toMatch(/onClick:\s*any/);
    });

    it('should handle destructuring in coordinate calculations', async () => {
      const code = 'const points=[[0,0],[3,4]];const [[x1,y1],[x2,y2]]=points;const dist=Math.sqrt((x2-x1)**2+(y2-y1)**2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/x1:\s*number/);
      expect(result).toMatch(/y1:\s*number/);
      expect(result).toMatch(/x2:\s*number/);
      expect(result).toMatch(/y2:\s*number/);
      expect(result).toMatch(/dist:\s*number/);
    });
  });
});
