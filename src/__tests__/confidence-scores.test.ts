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
});
