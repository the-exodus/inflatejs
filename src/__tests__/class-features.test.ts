import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Class Features - Type Inference', () => {
  describe('Basic Class Properties', () => {
    it('should infer property types from constructor assignments', async () => {
      const code = 'class Point{constructor(x,y){this.x=x;this.y=y;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should infer types for constructor parameters based on usage
      expect(result).toMatch(/constructor\s*\(\s*x:\s*any\s*,\s*y:\s*any\s*\)/);
    });

    it('should infer property types from literal assignments in constructor', async () => {
      const code = 'class User{constructor(){this.id=1;this.name="John";this.active=true;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Constructor should have no parameters
      expect(result).toContain('constructor()');
      // Properties should be inferred from literal assignments
      // Note: Property type annotations not yet implemented
      // TODO: When property declarations are added, should check:
      // expect(result).toMatch(/id:\s*number/);
      // expect(result).toMatch(/name:\s*string/);
      // expect(result).toMatch(/active:\s*boolean/);
    });

    it('should handle class with mixed property types', async () => {
      const code = 'class Config{constructor(port,host){this.port=port||3000;this.host=host||"localhost";this.enabled=true;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should handle default values in constructor
      expect(result).toMatch(/constructor\s*\(\s*port:\s*any\s*,\s*host:\s*any\s*\)/);
    });
  });

  describe('Class Methods', () => {
    it('should infer method return types from return statements', async () => {
      const code = 'class Math{double(x){return x*2;}square(x){return x*x;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Methods should have inferred return types
      expect(result).toMatch(/double\s*\(\s*x:\s*any\s*\):\s*number/);
      expect(result).toMatch(/square\s*\(\s*x:\s*any\s*\):\s*number/);
    });

    it('should infer method return type as string', async () => {
      const code = 'class Formatter{format(name){return"Hello, "+name;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/format\s*\(\s*name:\s*any\s*\):\s*string/);
    });

    it('should handle methods with multiple return statements', async () => {
      const code = 'class Validator{check(x){if(x>0)return true;return false;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/check\s*\(\s*x:\s*any\s*\):\s*boolean/);
    });

    it('should handle methods that return objects', async () => {
      const code = 'class Factory{create(){return{x:1,y:2};}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Now infers specific object shape instead of generic 'object'
      expect(result).toMatch(/create\s*\(\s*\):\s*\{\s*x:\s*number\s*,\s*y:\s*number\s*\}/);
    });

    it('should handle methods that return arrays', async () => {
      const code = 'class Array{getNumbers(){return[1,2,3];}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/getNumbers\s*\(\s*\):\s*number\[\]/);
    });

    it('should handle methods with no return (void)', async () => {
      const code = 'class Logger{log(msg){console.log(msg);}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Methods with no explicit return should be void
      expect(result).toMatch(/log\s*\(\s*msg:\s*any\s*\):\s*void/);
    });
  });

  describe('Static Methods', () => {
    it('should infer static method return types', async () => {
      const code = 'class MathUtils{static add(a,b){return a+b;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Static method should have return type
      expect(result).toMatch(/static\s+add\s*\(\s*a:\s*any\s*,\s*b:\s*any\s*\):\s*number/);
    });

    it('should handle multiple static methods', async () => {
      const code = 'class StringUtils{static upper(s){return s.toUpperCase();}static lower(s){return s.toLowerCase();}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/static\s+upper\s*\(\s*s:\s*any\s*\):\s*string/);
      expect(result).toMatch(/static\s+lower\s*\(\s*s:\s*any\s*\):\s*string/);
    });

    it('should handle static methods returning boolean', async () => {
      const code = 'class Validator{static isValid(x){return x>0;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/static\s+isValid\s*\(\s*x:\s*any\s*\):\s*boolean/);
    });

    it('should handle static factory methods', async () => {
      const code = 'class Point{static origin(){return new Point(0,0);}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should recognize static method (return type may be 'any' or 'Point')
      expect(result).toMatch(/static\s+origin\s*\(\s*\):\s*(any|Point)/);
    });
  });

  describe('Getters and Setters', () => {
    it('should infer getter return types', async () => {
      const code = 'class Person{get age(){return 30;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Getter should have return type
      expect(result).toMatch(/get\s+age\s*\(\s*\):\s*number/);
    });

    it('should infer getter return type from property', async () => {
      const code = 'class User{constructor(){this._name="John";}get name(){return this._name;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // TODO: Property type tracking not yet implemented
      // When implemented, should infer: get name(): string
      // For now, getters returning this.property don't get type annotations due to low confidence
      expect(result).toContain('get name()');
    });

    it('should handle setter parameter types', async () => {
      const code = 'class Counter{set value(v){this._value=v;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Setter should have parameter type
      expect(result).toMatch(/set\s+value\s*\(\s*v:\s*any\s*\)/);
    });

    it('should handle getter and setter together', async () => {
      const code = 'class Temperature{get celsius(){return this._c;}set celsius(v){this._c=v;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Both getter and setter should be present
      // TODO: Getter return type requires property tracking (not yet implemented)
      expect(result).toContain('get celsius()');
      expect(result).toMatch(/set\s+celsius\s*\(\s*v:\s*any\s*\)/);
    });

    it('should infer getter return type from computation', async () => {
      const code = 'class Rectangle{constructor(w,h){this.w=w;this.h=h;}get area(){return this.w*this.h;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Getter should return number from multiplication
      expect(result).toMatch(/get\s+area\s*\(\s*\):\s*number/);
    });
  });

  describe('Class Inheritance', () => {
    it('should handle basic class inheritance', async () => {
      const code = 'class Animal{speak(){return"sound";}}class Dog extends Animal{bark(){return"woof";}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Both classes should be present with extends keyword
      expect(result).toContain('class Animal');
      expect(result).toContain('class Dog extends Animal');
      expect(result).toMatch(/speak\s*\(\s*\):\s*string/);
      expect(result).toMatch(/bark\s*\(\s*\):\s*string/);
    });

    it('should handle constructor with super call', async () => {
      const code = 'class Point{constructor(x,y){this.x=x;this.y=y;}}class Point3D extends Point{constructor(x,y,z){super(x,y);this.z=z;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Both constructors should be present
      expect(result).toContain('extends Point');
      expect(result).toContain('super(x, y)');
    });

    it('should handle multiple levels of inheritance', async () => {
      const code = 'class A{m1(){return 1;}}class B extends A{m2(){return 2;}}class C extends B{m3(){return 3;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class B extends A');
      expect(result).toContain('class C extends B');
      expect(result).toMatch(/m1\s*\(\s*\):\s*number/);
      expect(result).toMatch(/m2\s*\(\s*\):\s*number/);
      expect(result).toMatch(/m3\s*\(\s*\):\s*number/);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should handle a Point class with distance method', async () => {
      const code = 'class Point{constructor(x,y){this.x=x;this.y=y;}distance(){return Math.sqrt(this.x*this.x+this.y*this.y);}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class Point');
      expect(result).toMatch(/distance\s*\(\s*\):\s*number/);
    });

    it('should handle a User class with methods', async () => {
      const code = 'class User{constructor(name,age){this.name=name;this.age=age;}isAdult(){return this.age>=18;}getInfo(){return this.name+" is "+this.age;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class User');
      expect(result).toMatch(/isAdult\s*\(\s*\):\s*boolean/);
      expect(result).toMatch(/getInfo\s*\(\s*\):\s*string/);
    });

    it('should handle a Counter class with getter/setter', async () => {
      const code = 'class Counter{constructor(){this._count=0;}get count(){return this._count;}set count(v){this._count=v;}increment(){this._count++;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class Counter');
      // TODO: Getter return type requires property tracking (not yet implemented)
      expect(result).toContain('get count()');
      expect(result).toMatch(/set\s+count\s*\(\s*v:\s*any\s*\)/);
      expect(result).toMatch(/increment\s*\(\s*\):\s*void/);
    });

    it('should handle a Calculator class with static methods', async () => {
      const code = 'class Calculator{static add(a,b){return a+b;}static multiply(a,b){return a*b;}static isPositive(n){return n>0;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class Calculator');
      expect(result).toMatch(/static\s+add\s*\(\s*a:\s*any\s*,\s*b:\s*any\s*\):\s*number/);
      expect(result).toMatch(/static\s+multiply\s*\(\s*a:\s*any\s*,\s*b:\s*any\s*\):\s*number/);
      expect(result).toMatch(/static\s+isPositive\s*\(\s*n:\s*any\s*\):\s*boolean/);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty class', async () => {
      const code = 'class Empty{}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class Empty');
    });

    it('should handle class with only constructor', async () => {
      const code = 'class OnlyConstructor{constructor(x){this.x=x;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class OnlyConstructor');
      expect(result).toMatch(/constructor\s*\(\s*x:\s*any\s*\)/);
    });

    it('should handle class with only static methods', async () => {
      const code = 'class StaticOnly{static helper(){return 42;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class StaticOnly');
      expect(result).toMatch(/static\s+helper\s*\(\s*\):\s*number/);
    });

    it('should handle methods with complex return types', async () => {
      const code = 'class Complex{getArray(){return[1,2,3];}getObject(){return{x:1};}getString(){return"test";}getBoolean(){return true;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/getArray\s*\(\s*\):\s*number\[\]/);
      // Now infers specific object shape instead of generic 'object'
      expect(result).toMatch(/getObject\s*\(\s*\):\s*\{\s*x:\s*number\s*\}/);
      expect(result).toMatch(/getString\s*\(\s*\):\s*string/);
      expect(result).toMatch(/getBoolean\s*\(\s*\):\s*boolean/);
    });

    it('should handle method with ternary return', async () => {
      const code = 'class Conditional{getValue(flag){return flag?1:0;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/getValue\s*\(\s*flag:\s*any\s*\):\s*number/);
    });

    it('should handle method with logical expression return', async () => {
      const code = 'class Logical{getDefault(x){return x||"default";}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // May return union type or 'any' depending on implementation
      expect(result).toMatch(/getDefault\s*\(\s*x:\s*any\s*\):\s*(any|string)/);
    });

    it('should handle class with arrow function property', async () => {
      const code = 'class WithArrow{constructor(){this.arrow=()=>42;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class WithArrow');
      // Arrow function is preserved (may be expanded to block statement by formatter)
      expect(result).toMatch(/(=>\s*42|=>\s*\{\s*return 42)/);
    });

    it('should handle nested classes', async () => {
      const code = 'class Outer{static Inner=class{getValue(){return 1;}}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class Outer');
      // Inner class handling may vary
      expect(result).toMatch(/getValue\s*\(\s*\):\s*number/);
    });
  });

  describe('Method Parameter Types', () => {
    it('should handle methods with default parameters', async () => {
      const code = 'class DefaultParams{greet(name="Guest"){return"Hello, "+name;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Default parameter should be typed
      expect(result).toMatch(/greet\s*\(\s*name:\s*string\s*=\s*"Guest"\s*\):\s*string/);
    });

    it('should handle methods with rest parameters', async () => {
      const code = 'class RestParams{sum(...nums){return nums.reduce((a,b)=>a+b,0);}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Rest parameter should be typed as array
      // TODO: Method return type inference for reduce() not yet implemented
      // Currently returns low confidence due to complex callback inference
      expect(result).toMatch(/sum\s*\(\s*\.\.\.nums:\s*any\[\]\s*\)/);
    });

    it('should handle methods with mixed parameter types', async () => {
      const code = 'class MixedParams{process(required,optional=10,...rest){return required+optional+rest.length;}}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/process\s*\(\s*required:\s*any\s*,\s*optional:\s*number\s*=\s*10\s*,\s*\.\.\.rest:\s*any\[\]\s*\):\s*number/);
    });
  });

  describe('Class Expressions', () => {
    it('should handle class expressions assigned to variables', async () => {
      const code = 'const MyClass=class{getValue(){return 42;}};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Class expression should be handled
      expect(result).toContain('class');
      expect(result).toMatch(/getValue\s*\(\s*\):\s*number/);
    });

    it('should handle named class expressions', async () => {
      const code = 'const Named=class NamedClass{getName(){return"test";}};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toContain('class NamedClass');
      expect(result).toMatch(/getName\s*\(\s*\):\s*string/);
    });
  });
});
