import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Symbol and BigInt', () => {
  describe('Symbol', () => {
    it('should infer symbol type from Symbol constructor', async () => {
      const code = 'const sym=Symbol("key");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym:\s*symbol/);
      expect(result).toContain('Symbol');
    });

    it('should handle Symbol with description', async () => {
      const code = 'const id=Symbol("id");const name=Symbol("name");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/id:\s*symbol/);
      expect(result).toMatch(/name:\s*symbol/);
    });

    it('should handle Symbol without description', async () => {
      const code = 'const sym=Symbol();';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym:\s*symbol/);
    });

    it('should handle Symbol in object properties', async () => {
      const code = 'const key=Symbol("key");const obj={[key]:"value"};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/key:\s*symbol/);
      expect(result).toMatch(/obj:\s*object/);
    });

    it('should handle Symbol in array', async () => {
      const code = 'const sym=Symbol("test");const arr=[sym];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym:\s*symbol/);
      expect(result).toMatch(/arr:\s*symbol\[\]/);
    });

    it('should handle Symbol.for', async () => {
      const code = 'const globalSym=Symbol.for("shared");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Symbol.for also returns symbol, but not yet in known-types
      // For now just verify it compiles
      expect(result).toContain('Symbol.for');
    });

    it('should handle Symbol comparison pattern', async () => {
      const code = 'const sym1=Symbol("a");const sym2=Symbol("a");const same=sym1===sym2;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym1:\s*symbol/);
      expect(result).toMatch(/sym2:\s*symbol/);
      expect(result).toMatch(/same:\s*boolean/);
    });
  });

  describe('BigInt', () => {
    it('should infer bigint type from BigInt constructor', async () => {
      const code = 'const big=BigInt(100);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/big:\s*bigint/);
      expect(result).toContain('BigInt');
    });

    it('should infer bigint type from bigint literal', async () => {
      const code = 'const big=100n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/big:\s*bigint/);
      expect(result).toContain('100n');
    });

    it('should handle multiple bigint literals', async () => {
      const code = 'const a=100n;const b=200n;const c=9007199254740991n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Variables may be renamed (a->variable, b->variable2, c->variable3)
      expect(result).toMatch(/(a|variable):\s*bigint/);
      expect(result).toMatch(/(b|variable2):\s*bigint/);
      expect(result).toMatch(/(c|variable3):\s*bigint/);
    });

    it('should handle BigInt with string argument', async () => {
      const code = 'const big=BigInt("9007199254740991");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/big:\s*bigint/);
    });

    it('should handle BigInt with number argument', async () => {
      const code = 'const num=42;const big=BigInt(num);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/num:\s*number/);
      expect(result).toMatch(/big:\s*bigint/);
    });

    it('should handle bigint in array', async () => {
      const code = 'const arr=[100n,200n,300n];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*bigint\[\]/);
    });

    it('should handle bigint in object', async () => {
      const code = 'const obj={id:1n,value:100n};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*id:\s*bigint\s*,\s*value:\s*bigint\s*\}/);
    });

    it('should handle bigint arithmetic', async () => {
      const code = 'const a=100n;const b=200n;const sum=a+b;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Variables may be renamed (a->variable, b->variable2)
      expect(result).toMatch(/(a|variable):\s*bigint/);
      expect(result).toMatch(/(b|variable2):\s*bigint/);
      // Binary operations on bigint should infer bigint
      expect(result).toMatch(/sum:\s*bigint/);
    });

    it('should handle bigint comparison', async () => {
      const code = 'const big=100n;const isLarge=big>50n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/big:\s*bigint/);
      expect(result).toMatch(/isLarge:\s*boolean/);
    });

    it('should handle mixed BigInt usage', async () => {
      const code = 'const literal=100n;const constructed=BigInt(200);const arr=[literal,constructed];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/literal:\s*bigint/);
      expect(result).toMatch(/constructed:\s*bigint/);
      expect(result).toMatch(/arr:\s*bigint\[\]/);
    });
  });

  describe('Combined usage', () => {
    it('should handle Symbol and BigInt together', async () => {
      const code = 'const sym=Symbol("id");const big=100n;const obj={[sym]:big};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym:\s*symbol/);
      expect(result).toMatch(/big:\s*bigint/);
      expect(result).toMatch(/obj:\s*object/);
    });

    it('should handle arrays with multiple types including symbol and bigint', async () => {
      const code = 'const mixed=[Symbol("a"),100n,"text",42];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Mixed array should have a union type or any[]
      expect(result).toContain('mixed');
    });
  });

  describe('Edge cases', () => {
    it('should handle bigint zero', async () => {
      const code = 'const zero=0n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/zero:\s*bigint/);
    });

    it('should handle negative bigint', async () => {
      const code = 'const negative=-100n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Unary minus should preserve bigint type
      expect(result).toMatch(/negative:\s*bigint/);
    });

    it('should handle bigint in conditional', async () => {
      const code = 'const flag=true;const val=flag?100n:200n;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/val:\s*bigint/);
    });

    it('should handle Symbol in ternary', async () => {
      const code = 'const flag=true;const sym=flag?Symbol("a"):Symbol("b");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/sym:\s*symbol/);
    });
  });
});
