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
});
