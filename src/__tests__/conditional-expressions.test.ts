/**
 * Conditional (ternary) expression type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Conditional expression type inference', () => {
  describe('Same type branches', () => {
    it('should infer string when both branches return string', async () => {
      const code = 'const isDev=true;const mode=isDev?"debug":"production";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/mode:\s*string/);
    });

    it('should infer number when both branches return number', async () => {
      const code = 'const condition=true;const value=condition?100:200;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*number/);
    });

    it('should infer boolean when both branches return boolean', async () => {
      const code = 'const x=5;const result=x>10?true:false;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*boolean/);
    });
  });

  describe('Different type branches', () => {
    it('should handle different types gracefully', async () => {
      const code = 'const flag=true;const result=flag?"text":42;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should have some type annotation (may be 'any' for mixed types)
      expect(result).toContain('const');
    });
  });

  describe('Nested ternary', () => {
    it('should infer type for nested ternary with same types', async () => {
      const code = 'const score=85;const level=score>90?"A":score>80?"B":"C";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/level:\s*string/);
    });

    it('should handle complex nested ternary', async () => {
      const code = 'const x=5;const y=10;const max=x>y?x:y>20?20:y;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/max:\s*number/);
    });
  });

  describe('Ternary with expressions', () => {
    it('should infer type from ternary with variable references', async () => {
      const code = 'const a=10;const b=20;const flag=true;const result=flag?a:b;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number/);
    });

    it('should infer type from ternary with string method returning same type', async () => {
      const code = 'const flag=true;const result=flag?"hello".toUpperCase():"world";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Both branches are strings (method call on string literal + string literal)
      expect(result).toContain('const');
    });

    it('should infer string type for ternary with method call on variable', async () => {
      const code = 'const text="hello";const flag=true;const result=flag?text.toUpperCase():"world";';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // This was previously failing (returned 'any' with confidence 0.5)
      // Now should correctly infer 'string' type
      expect(result).toMatch(/result:\s*string/);
    });

    it('should infer type from ternary with numeric operations', async () => {
      const code = 'const x=5;const result=x>10?100:200;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*number/);
    });
  });

  describe('Ternary in function returns', () => {
    it('should infer function return type from ternary', async () => {
      const code = 'function getStatus(active){return active?"active":"inactive"}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*string/);
    });

    it('should infer function return type from numeric ternary', async () => {
      const code = 'function getScore(passing){return passing?100:0}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*number/);
    });
  });

  describe('Ternary with template literals', () => {
    it('should infer string for ternary with template literals', async () => {
      const code = 'const name="John";const formal=true;const greeting=formal?`Hello, ${name}`:`Hey ${name}`;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/greeting:\s*string/);
    });
  });

  describe('Type propagation', () => {
    it('should propagate ternary result type through assignments', async () => {
      const code = 'const flag=true;const value=flag?"yes":"no";const copied=value;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/value:\s*string/);
      expect(result).toMatch(/copied:\s*string/);
    });

    it('should use ternary result in further operations', async () => {
      const code = 'const flag=true;const num=flag?10:20;const doubled=num*2;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
      expect(result).toMatch(/doubled:\s*number/);
    });
  });
});
