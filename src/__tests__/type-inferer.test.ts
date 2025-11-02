import { describe, it, expect, beforeEach } from 'vitest';
import * as parser from '@babel/parser';
import { TypeInferer } from '../type-inferer';
import { TypeMap } from '../types';

describe('TypeInferer', () => {
  let inferer: TypeInferer;

  beforeEach(() => {
    inferer = new TypeInferer();
  });

  describe('basic literal type inference', () => {
    it('should infer string type from string literal', () => {
      const code = `const message = 'hello';`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('message')).toBe(true);
      expect(types.get('message')?.typeName).toBe('string');
      expect(types.get('message')?.confidence).toBe(1.0);
    });

    it('should infer number type from numeric literal', () => {
      const code = `const age = 42;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('age')).toBe(true);
      expect(types.get('age')?.typeName).toBe('number');
      expect(types.get('age')?.confidence).toBe(1.0);
    });

    it('should infer boolean type from boolean literal', () => {
      const code = `const isActive = true;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('isActive')).toBe(true);
      expect(types.get('isActive')?.typeName).toBe('boolean');
      expect(types.get('isActive')?.confidence).toBe(1.0);
    });

    it('should infer null type from null literal', () => {
      const code = `const value = null;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('value')).toBe(true);
      expect(types.get('value')?.typeName).toBe('null');
      expect(types.get('value')?.confidence).toBe(1.0);
    });
  });

  describe('array type inference', () => {
    it('should infer any[] for empty array', () => {
      const code = `const items = [];`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('items')).toBe(true);
      expect(types.get('items')?.typeName).toBe('any[]');
      expect(types.get('items')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer string[] for homogeneous string array', () => {
      const code = `const names = ['Alice', 'Bob', 'Charlie'];`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('names')).toBe(true);
      expect(types.get('names')?.typeName).toBe('string[]');
      expect(types.get('names')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer number[] for homogeneous number array', () => {
      const code = `const numbers = [1, 2, 3, 4, 5];`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('numbers')).toBe(true);
      expect(types.get('numbers')?.typeName).toBe('number[]');
      expect(types.get('numbers')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer any[] for heterogeneous array', () => {
      const code = `const mixed = [1, 'two', true];`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('mixed')).toBe(true);
      expect(types.get('mixed')?.typeName).toBe('any[]');
    });
  });

  describe('object type inference', () => {
    it('should infer object type from object literal', () => {
      const code = `const user = { name: 'John', age: 30 };`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('user')).toBe(true);
      expect(types.get('user')?.typeName).toBe('object');
      expect(types.get('user')?.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('function type inference', () => {
    it('should infer Function type for function expression', () => {
      const code = `const fn = function() { return 42; };`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('fn')).toBe(true);
      expect(types.get('fn')?.typeName).toBe('Function');
      expect(types.get('fn')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer Function type for arrow function', () => {
      const code = `const fn = () => 42;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('fn')).toBe(true);
      expect(types.get('fn')?.typeName).toBe('Function');
      expect(types.get('fn')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer function return type from return statement', () => {
      const code = `function getValue() { return 'test'; }`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('getValue')).toBe(true);
      const funcType = types.get('getValue');
      expect(funcType?.typeName).toContain('=>');
      expect(funcType?.typeName).toContain('string');
    });

    it('should infer void return type for function without return', () => {
      const code = `function doSomething() { console.log('test'); }`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('doSomething')).toBe(true);
      const funcType = types.get('doSomething');
      expect(funcType?.typeName).toContain('void');
    });
  });

  describe('usage-based type inference', () => {
    it('should infer number type from arithmetic operations', () => {
      const code = `
        const x = 0;
        const result = x + 10;
      `;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('x')).toBe(true);
      expect(types.get('x')?.typeName).toBe('number');
    });

    it('should infer string type from string methods', () => {
      const code = `
        let text;
        text.toLowerCase();
      `;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('text')).toBe(true);
      expect(types.get('text')?.typeName).toBe('string');
      expect(types.get('text')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer array type from array methods', () => {
      const code = `
        let items;
        items.push(1);
        items.filter(x => x > 0);
      `;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('items')).toBe(true);
      expect(types.get('items')?.typeName).toBe('any[]');
      expect(types.get('items')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should infer type from comparison with literal', () => {
      const code = `
        let count;
        if (count > 10) { }
      `;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('count')).toBe(true);
      expect(types.get('count')?.typeName).toBe('number');
    });
  });

  describe('parameter type inference', () => {
    it('should track function parameters', () => {
      const code = `function greet(name, age) { return name + age; }`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('name')).toBe(true);
      expect(types.has('age')).toBe(true);
    });

    it('should infer parameter types from usage', () => {
      const code = `
        function calculate(x, y) {
          return x * y;
        }
      `;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('x')).toBe(true);
      expect(types.has('y')).toBe(true);
    });
  });

  describe('known types integration', () => {
    it('should use known types for String constructor', () => {
      const code = `const s = String('hello');`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('s')).toBe(true);
      expect(types.get('s')?.typeName).toBe('string');
      expect(types.get('s')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should use known types for Number constructor', () => {
      const code = `const n = Number('42');`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('n')).toBe(true);
      expect(types.get('n')?.typeName).toBe('number');
      expect(types.get('n')?.confidence).toBeGreaterThanOrEqual(0.7);
    });

    it('should use known types for Date constructor', () => {
      const code = `const d = Date();`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('d')).toBe(true);
      expect(types.get('d')?.typeName).toBe('Date');
      expect(types.get('d')?.confidence).toBeGreaterThanOrEqual(0.7);
    });
  });

  describe('edge cases', () => {
    it('should handle variables without initialization', () => {
      const code = `let x;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('x')).toBe(true);
      expect(types.get('x')?.typeName).toBe('any');
    });

    it('should handle complex nested structures', () => {
      const code = `const complex = [[1, 2], [3, 4]];`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.has('complex')).toBe(true);
      expect(types.get('complex')?.typeName).toContain('[]');
    });

    it('should return empty map for empty code', () => {
      const code = ``;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types).toBeInstanceOf(Map);
      expect(types.size).toBe(0);
    });
  });

  describe('type confidence scoring', () => {
    it('should have high confidence for literal types', () => {
      const code = `const x = 42;`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.get('x')?.confidence).toBe(1.0);
    });

    it('should have lower confidence for inferred types', () => {
      const code = `let x; x.toUpperCase();`;
      const ast = parser.parse(code, { sourceType: 'module' });
      const types = inferer.inferTypes(ast);

      expect(types.get('x')?.confidence).toBeLessThan(1.0);
      expect(types.get('x')?.confidence).toBeGreaterThan(0);
    });
  });

  describe('inter-procedural type inference', () => {
    describe('parameter type inference from call sites', () => {
      it('should infer parameter type from literal argument', () => {
        const code = `
          function greet(name) {
            return 'Hello ' + name;
          }
          greet('John');
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('name')).toBe(true);
        expect(types.get('name')?.typeName).toBe('string');
        expect(types.get('name')?.confidence).toBeGreaterThan(0.5);
      });

      it('should infer parameter type from typed variable argument', () => {
        const code = `
          function double(num) {
            return num * 2;
          }
          const x = 42;
          double(x);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('num')).toBe(true);
        expect(types.get('num')?.typeName).toBe('number');
        expect(types.get('num')?.confidence).toBeGreaterThan(0.5);
      });

      it('should infer parameter types from multiple call sites', () => {
        const code = `
          function process(value) {
            return value;
          }
          process(10);
          process(20);
          process(30);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('value')).toBe(true);
        expect(types.get('value')?.typeName).toBe('number');
      });

      it('should handle multiple parameters from call sites', () => {
        const code = `
          function calculate(a, b, c) {
            return a + b + c;
          }
          calculate(1, 2, 3);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('a')?.typeName).toBe('number');
        expect(types.get('b')?.typeName).toBe('number');
        expect(types.get('c')?.typeName).toBe('number');
      });
    });

    describe('return type inference from function calls', () => {
      it('should infer return type from called function', () => {
        const code = `
          function getString() {
            return 'hello';
          }
          function wrapper() {
            return getString();
          }
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('wrapper')).toBe(true);
        const wrapperType = types.get('wrapper')?.typeName;
        expect(wrapperType).toContain('string');
      });

      it('should infer variable type from function return', () => {
        const code = `
          function getNumber() {
            return 42;
          }
          const result = getNumber();
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('result')).toBe(true);
        expect(types.get('result')?.typeName).toBe('number');
      });

      it('should propagate return types through call chain', () => {
        const code = `
          function getBase() {
            return 100;
          }
          function getMiddle() {
            return getBase();
          }
          function getTop() {
            return getMiddle();
          }
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('getBase')?.typeName).toContain('number');
        expect(types.get('getMiddle')?.typeName).toContain('number');
        expect(types.get('getTop')?.typeName).toContain('number');
      });
    });

    describe('assignment tracking across functions', () => {
      it('should track type through variable assignment and function call', () => {
        const code = `
          function transform(input) {
            return input.toUpperCase();
          }
          const text = 'hello';
          const result = transform(text);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('input')?.typeName).toBe('string');
        expect(types.get('text')?.typeName).toBe('string');
        expect(types.get('result')?.typeName).toBe('string');
      });

      it('should infer parameter type from variable passed as argument', () => {
        const code = `
          function processArray(arr) {
            return arr.length;
          }
          const items = [1, 2, 3];
          processArray(items);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('arr')?.typeName).toContain('[]');
        expect(types.get('items')?.typeName).toContain('[]');
      });
    });

    describe('circular reference handling', () => {
      it('should handle direct recursion without infinite loop', () => {
        const code = `
          function factorial(n) {
            if (n <= 1) return 1;
            return n * factorial(n - 1);
          }
          factorial(5);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });

        // Should not hang
        expect(() => {
          const types = inferer.inferTypes(ast);
          expect(types.has('factorial')).toBe(true);
        }).not.toThrow();
      });

      it('should handle mutual recursion without infinite loop', () => {
        const code = `
          function isEven(n) {
            if (n === 0) return true;
            return isOdd(n - 1);
          }
          function isOdd(n) {
            if (n === 0) return false;
            return isEven(n - 1);
          }
          isEven(4);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });

        // Should not hang
        expect(() => {
          const types = inferer.inferTypes(ast);
          expect(types.has('isEven')).toBe(true);
          expect(types.has('isOdd')).toBe(true);
        }).not.toThrow();
      });

      it('should handle complex call graph cycles', () => {
        const code = `
          function a(x) { return b(x); }
          function b(x) { return c(x); }
          function c(x) { return a(x); }
          a(42);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });

        // Should not hang
        expect(() => {
          const types = inferer.inferTypes(ast);
          expect(types.has('a')).toBe(true);
        }).not.toThrow();
      });
    });

    describe('complex type propagation', () => {
      it('should infer types through nested function calls', () => {
        const code = `
          function add(a, b) {
            return a + b;
          }
          function compute(x, y) {
            return add(x, y) * 2;
          }
          compute(10, 20);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('a')?.typeName).toBe('number');
        expect(types.get('b')?.typeName).toBe('number');
        expect(types.get('x')?.typeName).toBe('number');
        expect(types.get('y')?.typeName).toBe('number');
      });

      it('should handle parameter used in multiple contexts', () => {
        const code = `
          function helper(val) {
            return val * 2;
          }
          function main(data) {
            const processed = helper(data);
            return processed + 10;
          }
          main(5);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('val')?.typeName).toBe('number');
        expect(types.get('data')?.typeName).toBe('number');
      });

      it('should infer array element type from operations', () => {
        const code = `
          function sumArray(numbers) {
            return numbers.reduce((acc, num) => acc + num, 0);
          }
          sumArray([1, 2, 3, 4, 5]);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('numbers')?.typeName).toContain('[]');
      });
    });

    describe('function signature inference', () => {
      it('should infer complete function signature with parameter and return types', () => {
        const code = `
          function multiply(x, y) {
            return x * y;
          }
          const result = multiply(5, 10);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        const funcType = types.get('multiply')?.typeName;
        expect(funcType).toBeDefined();
        // Should contain parameter types and return type
        expect(funcType).toContain('=>');
      });

      it('should infer void return for functions with no return', () => {
        const code = `
          function logMessage(msg) {
            console.log(msg);
          }
          logMessage('Hello');
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        const funcType = types.get('logMessage')?.typeName;
        expect(funcType).toContain('void');
        expect(types.get('msg')?.typeName).toBe('string');
      });

      it('should handle functions with multiple return types', () => {
        const code = `
          function getValue(flag) {
            if (flag) {
              return 'string';
            }
            return 42;
          }
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('getValue')).toBe(true);
        // Should handle union types or pick most confident
      });
    });

    describe('edge cases and robustness', () => {
      it('should handle undefined functions gracefully', () => {
        const code = `
          const result = undefinedFunction(42);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('result')).toBe(true);
        expect(types.get('result')?.typeName).toBe('any');
      });

      it('should handle immediately invoked function expressions', () => {
        const code = `
          const result = (function(x) {
            return x * 2;
          })(42);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.has('result')).toBe(true);
        expect(types.get('result')?.typeName).toBe('number');
      });

      it('should handle arrow functions as arguments', () => {
        const code = `
          function map(arr, fn) {
            return arr.map(fn);
          }
          const numbers = [1, 2, 3];
          map(numbers, x => x * 2);
        `;
        const ast = parser.parse(code, { sourceType: 'module' });
        const types = inferer.inferTypes(ast);

        expect(types.get('arr')?.typeName).toContain('[]');
        expect(types.get('fn')?.typeName).toContain('Function');
      });

      it('should limit traversal depth for very deep call chains', () => {
        const code = `
          function level1() { return level2(); }
          function level2() { return level3(); }
          function level3() { return level4(); }
          function level4() { return level5(); }
          function level5() { return level6(); }
          function level6() { return level7(); }
          function level7() { return level8(); }
          function level8() { return 'deep'; }
          level1();
        `;
        const ast = parser.parse(code, { sourceType: 'module' });

        // Should complete in reasonable time
        const start = Date.now();
        const types = inferer.inferTypes(ast);
        const duration = Date.now() - start;

        expect(duration).toBeLessThan(5000); // Should complete within 5 seconds
        expect(types.has('level1')).toBe(true);
      });
    });
  });
});
