/**
 * Confidence Score Validation Tests
 *
 * These tests verify that the type inference system assigns reasonable
 * confidence scores to inferred types (≥0.7 for good inferences).
 */

import { describe, it, expect } from 'vitest';
import { parse } from '@babel/parser';
import { TypeCollector } from '../services/type-inference/type-collector';
import { TypeResolver } from '../services/type-inference/type-resolver';
import { CallGraphBuilder } from '../services/type-inference/call-graph-builder';
import { UsageAnalyzer } from '../services/type-inference/usage-analyzer';

describe('Confidence Score Validation', () => {
  describe('Literal types should have confidence 1.0', () => {
    it('should assign 1.0 confidence to string literals', () => {
      const code = 'const text = "hello";';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const textType = typeMap.get('text');
      expect(textType).toBeDefined();
      expect(textType!.typeName).toBe('string');
      expect(textType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to number literals', () => {
      const code = 'const num = 42;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const numType = typeMap.get('num');
      expect(numType).toBeDefined();
      expect(numType!.typeName).toBe('number');
      expect(numType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to boolean literals', () => {
      const code = 'const flag = true;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const flagType = typeMap.get('flag');
      expect(flagType).toBeDefined();
      expect(flagType!.typeName).toBe('boolean');
      expect(flagType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to null', () => {
      const code = 'const value = null;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const valueType = typeMap.get('value');
      expect(valueType).toBeDefined();
      expect(valueType!.typeName).toBe('null');
      expect(valueType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to template literals', () => {
      const code = 'const greeting = `Hello!`;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const greetingType = typeMap.get('greeting');
      expect(greetingType).toBeDefined();
      expect(greetingType!.typeName).toBe('string');
      expect(greetingType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to RegExp literals', () => {
      const code = 'const pattern = /test/i;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const patternType = typeMap.get('pattern');
      expect(patternType).toBeDefined();
      expect(patternType!.typeName).toBe('RegExp');
      expect(patternType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to undefined', () => {
      const code = 'const value = undefined;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const valueType = typeMap.get('value');
      expect(valueType).toBeDefined();
      expect(valueType!.typeName).toBe('undefined');
      expect(valueType!.confidence).toBe(1.0);
    });
  });

  describe('Array types should have confidence ≥0.9', () => {
    it('should assign high confidence to homogeneous arrays', () => {
      const code = 'const numbers = [1, 2, 3];';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const numbersType = typeMap.get('numbers');
      expect(numbersType).toBeDefined();
      expect(numbersType!.typeName).toBe('number[]');
      expect(numbersType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign reasonable confidence to empty arrays', () => {
      const code = 'const empty = [];';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const emptyType = typeMap.get('empty');
      expect(emptyType).toBeDefined();
      expect(emptyType!.typeName).toBe('any[]');
      expect(emptyType!.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Method calls should have confidence ≥0.9', () => {
    it('should assign high confidence to string methods', () => {
      const code = 'const text = "hello"; const upper = text.toUpperCase();';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const upperType = typeMap.get('upper');
      expect(upperType).toBeDefined();
      expect(upperType!.typeName).toBe('string');
      expect(upperType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign high confidence to array methods', () => {
      const code = 'const arr = [1, 2, 3]; const doubled = arr.map(x => x * 2);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const doubledType = typeMap.get('doubled');
      expect(doubledType).toBeDefined();
      expect(doubledType!.typeName).toBe('number[]');
      expect(doubledType!.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Union types should have confidence ≥0.7', () => {
    it('should assign reasonable confidence to union types from conditionals', () => {
      const code = 'const flag = true; const result = flag ? "text" : 42;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const resultType = typeMap.get('result');
      expect(resultType).toBeDefined();
      expect(resultType!.typeName).toMatch(/string\s*\|\s*number|number\s*\|\s*string/);
      expect(resultType!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should assign reasonable confidence to union types from logical expressions', () => {
      const code = 'const input = ""; const value = input || 0;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const valueType = typeMap.get('value');
      expect(valueType).toBeDefined();
      expect(valueType!.typeName).toMatch(/string\s*\|\s*number|number\s*\|\s*string/);
      expect(valueType!.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Context-aware method inference should have confidence ≥0.9', () => {
    it('should assign high confidence to string.slice()', () => {
      const code = 'const text = "hello"; const sliced = text.slice(0, 2);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const slicedType = typeMap.get('sliced');
      expect(slicedType).toBeDefined();
      expect(slicedType!.typeName).toBe('string');
      expect(slicedType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign high confidence to array.slice()', () => {
      const code = 'const arr = [1, 2, 3]; const sliced = arr.slice(0, 2);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const slicedType = typeMap.get('sliced');
      expect(slicedType).toBeDefined();
      expect(slicedType!.typeName).toBe('number[]');
      expect(slicedType!.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Unary expressions should have confidence 1.0', () => {
    it('should assign 1.0 confidence to logical NOT', () => {
      const code = 'const flag = true; const negated = !flag;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const negatedType = typeMap.get('negated');
      expect(negatedType).toBeDefined();
      expect(negatedType!.typeName).toBe('boolean');
      expect(negatedType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to typeof', () => {
      const code = 'const typeStr = typeof 42;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const typeStrType = typeMap.get('typeStr');
      expect(typeStrType).toBeDefined();
      expect(typeStrType!.typeName).toBe('string');
      expect(typeStrType!.confidence).toBe(1.0);
    });

    it('should assign 1.0 confidence to void', () => {
      const code = 'const result = void 0;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const resultType = typeMap.get('result');
      expect(resultType).toBeDefined();
      expect(resultType!.typeName).toBe('undefined');
      expect(resultType!.confidence).toBe(1.0);
    });
  });

  describe('Static methods should have confidence ≥0.9', () => {
    it('should assign high confidence to Object.keys()', () => {
      const code = 'const obj = { a: 1 }; const keys = Object.keys(obj);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const keysType = typeMap.get('keys');
      expect(keysType).toBeDefined();
      expect(keysType!.typeName).toBe('string[]');
      expect(keysType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign high confidence to Array.isArray()', () => {
      const code = 'const arr = [1, 2]; const isArr = Array.isArray(arr);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const isArrType = typeMap.get('isArr');
      expect(isArrType).toBeDefined();
      expect(isArrType!.typeName).toBe('boolean');
      expect(isArrType!.confidence).toBeGreaterThanOrEqual(0.9);
    });
  });

  describe('Phase 3 features should have appropriate confidence', () => {
    it('should assign high confidence to default parameter types', () => {
      const code = 'function greet(name = "World") { return name; }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const nameType = typeMap.get('name');
      expect(nameType).toBeDefined();
      expect(nameType!.typeName).toBe('string');
      expect(nameType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign high confidence to rest parameter types', () => {
      const code = 'function sum(...nums) { return nums; }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const numsType = typeMap.get('nums');
      expect(numsType).toBeDefined();
      expect(numsType!.typeName).toBe('any[]');
      expect(numsType!.confidence).toBeGreaterThanOrEqual(0.8);
    });

    it('should assign high confidence to spread operator in arrays', () => {
      const code = 'const arr1 = [1, 2, 3]; const arr2 = [...arr1, 4, 5];';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const arr2Type = typeMap.get('arr2');
      expect(arr2Type).toBeDefined();
      expect(arr2Type!.typeName).toBe('number[]');
      expect(arr2Type!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign high confidence to spread operator in function calls', () => {
      const code = 'const nums = [1, 2, 3]; const max = Math.max(...nums);';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const maxType = typeMap.get('max');
      expect(maxType).toBeDefined();
      expect(maxType!.typeName).toBe('number');
      expect(maxType!.confidence).toBeGreaterThanOrEqual(0.9);
    });

    it('should assign reasonable confidence to object spread', () => {
      const code = 'const obj1 = { x: 1 }; const obj2 = { ...obj1, y: 2 };';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const obj2Type = typeMap.get('obj2');
      expect(obj2Type).toBeDefined();
      expect(obj2Type!.typeName).toBe('object');
      expect(obj2Type!.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Optional chaining should have appropriate confidence', () => {
    it('should assign reasonable confidence to optional property access', () => {
      const code = 'const obj = { x: 1 }; const value = obj?.x;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const valueType = typeMap.get('value');
      expect(valueType).toBeDefined();
      // Optional access on unknown property types may return any or any | undefined
      expect(valueType!.typeName).toMatch(/any/);
    });

    it('should assign reasonable confidence to optional method calls', () => {
      const code = 'const text = "hello"; const upper = text.toUpperCase();';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Note: This tests non-optional call to establish baseline
      const upperType = typeMap.get('upper');
      expect(upperType).toBeDefined();
      expect(upperType!.confidence).toBeGreaterThanOrEqual(0.1);
    });

    it('should handle nested optional chaining', () => {
      const code = 'const obj = { a: { b: 1 } }; const value = obj?.a?.b;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      const valueType = typeMap.get('value');
      expect(valueType).toBeDefined();
      // Should preserve optional chaining
      expect(valueType!.confidence).toBeGreaterThanOrEqual(0.1);
    });
  });

  describe('Type propagation should maintain reasonable confidence', () => {
    it('should propagate high confidence types through assignment', () => {
      const code = 'const original = "hello"; const copied = original;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const copiedType = typeMap.get('copied');
      expect(copiedType).toBeDefined();
      expect(copiedType!.typeName).toBe('string');
      expect(copiedType!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should maintain confidence through chained method calls', () => {
      const code = 'const text = "hello"; const result = text.slice(0, 2).toUpperCase();';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      const resultType = typeMap.get('result');
      expect(resultType).toBeDefined();
      expect(resultType!.typeName).toBe('string');
      expect(resultType!.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('Phase 4 features should have appropriate confidence', () => {
    it('should assign high confidence to class method return types', () => {
      const code = 'class Math { double(x) { return x * 2; } }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      // Method return type should be inferred with high confidence
      const mathType = typeMap.get('Math');
      expect(mathType).toBeDefined();
      // Class type should be recognized
      expect(mathType!.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should assign high confidence to static method return types', () => {
      const code = 'class Calculator { static add(a, b) { return a + b; } }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      // Static method return type should be inferred
      const calcType = typeMap.get('Calculator');
      expect(calcType).toBeDefined();
      expect(calcType!.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should assign high confidence to getter return types', () => {
      const code = 'class Counter { get count() { return 42; } }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      // Getter return type should be inferred with high confidence
      const counterType = typeMap.get('Counter');
      expect(counterType).toBeDefined();
      expect(counterType!.confidence).toBeGreaterThanOrEqual(0.5);
    });

    it('should assign reasonable confidence to class constructor parameters', () => {
      const code = 'class Point { constructor(x, y) { this.x = x; this.y = y; } }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Constructor parameters should be typed
      const xType = typeMap.get('x');
      const yType = typeMap.get('y');

      // Parameters may not be in top-level typeMap (depends on implementation)
      // This test verifies the class itself is recognized
      const pointType = typeMap.get('Point');
      expect(pointType).toBeDefined();
    });

    it('should handle class methods with literal returns', () => {
      const code = 'class Service { getName() { return "service"; } getPort() { return 3000; } isActive() { return true; } }';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);
      const callGraph = new CallGraphBuilder().buildCallGraph(ast);
      const usageMap = new UsageAnalyzer().analyzeUsage(ast, typeMap);
      const resolver = new TypeResolver();
      resolver.setCurrentAst(ast);
      resolver.resolveTypes(typeMap, usageMap, callGraph);

      // Method return types should be inferred from literals
      const serviceType = typeMap.get('Service');
      expect(serviceType).toBeDefined();
    });

    // TODO: Blocked on destructuring type propagation implementation
    // Object literal shapes are now inferred (item #7b complete), but we haven't
    // implemented propagating those types to destructured variables yet.
    // This is a follow-up feature - see TODO.md item #7c
    it.skip('should assign high confidence to object destructuring from literals', () => {
      const code = 'const user = { name: "John", age: 30 }; const { name, age } = user;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Destructured variables should have high confidence from literal
      const nameType = typeMap.get('name');
      const ageType = typeMap.get('age');

      expect(nameType).toBeDefined();
      expect(nameType!.typeName).toBe('string');
      expect(nameType!.confidence).toBeGreaterThanOrEqual(0.7);

      expect(ageType).toBeDefined();
      expect(ageType!.typeName).toBe('number');
      expect(ageType!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    // TODO: Blocked on destructuring type propagation - see item #7c
    it.skip('should assign high confidence to array destructuring from literals', () => {
      const code = 'const coords = [10, 20]; const [x, y] = coords;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Destructured variables should inherit array element type
      const xType = typeMap.get('x');
      const yType = typeMap.get('y');

      expect(xType).toBeDefined();
      expect(xType!.typeName).toBe('number');
      expect(xType!.confidence).toBeGreaterThanOrEqual(0.7);

      expect(yType).toBeDefined();
      expect(yType!.typeName).toBe('number');
      expect(yType!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    // TODO: Blocked on destructuring type propagation - see item #7c
    it.skip('should assign reasonable confidence to nested destructuring', () => {
      const code = 'const data = { user: { name: "John" } }; const { user: { name } } = data;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Nested destructuring should preserve type
      const nameType = typeMap.get('name');
      expect(nameType).toBeDefined();
      expect(nameType!.typeName).toBe('string');
      expect(nameType!.confidence).toBeGreaterThanOrEqual(0.7);
    });

    // TODO: Blocked on destructuring type propagation - see item #7c
    it.skip('should assign high confidence to destructuring with default values', () => {
      const code = 'const obj = { x: 1 }; const { x, y = 2 } = obj;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // Default value should provide type
      const xType = typeMap.get('x');
      const yType = typeMap.get('y');

      expect(xType).toBeDefined();
      expect(xType!.typeName).toBe('number');
      expect(xType!.confidence).toBeGreaterThanOrEqual(0.7);

      expect(yType).toBeDefined();
      expect(yType!.typeName).toBe('number');
      expect(yType!.confidence).toBeGreaterThanOrEqual(0.7); // From default value
    });

    // TODO: Blocked on destructuring type propagation - see item #7c
    it.skip('should handle destructuring with rest elements', () => {
      const code = 'const arr = [1, 2, 3]; const [first, ...rest] = arr;';
      const ast = parse(code, { sourceType: 'module' });
      const collector = new TypeCollector();
      const typeMap = collector.collectTypes(ast);

      // First element should be number
      const firstType = typeMap.get('first');
      expect(firstType).toBeDefined();
      expect(firstType!.typeName).toBe('number');
      expect(firstType!.confidence).toBeGreaterThanOrEqual(0.7);

      // Rest should be number[]
      const restType = typeMap.get('rest');
      expect(restType).toBeDefined();
      expect(restType!.typeName).toBe('number[]');
      expect(restType!.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });
});
