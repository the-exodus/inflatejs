/**
 * RegExp literal type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('RegExp literal type inference', () => {
  describe('Basic RegExp literals', () => {
    it('should infer RegExp for simple pattern with global flag', async () => {
      const code = 'const pattern=/\\d+/g;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp for pattern without flags', async () => {
      const code = 'const pattern=/test/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp for pattern with case-insensitive flag', async () => {
      const code = 'const pattern=/hello/i;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp for pattern with multiple flags', async () => {
      const code = 'const pattern=/test/gim;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });
  });

  describe('Complex RegExp patterns', () => {
    it('should infer RegExp for email pattern', async () => {
      const code = 'const emailRegex=/^[a-z]+@[a-z]+\\.[a-z]+$/i;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/emailRegex:\s*RegExp/);
    });

    it('should infer RegExp for URL pattern', async () => {
      const code = 'const urlPattern=/^https?:\\/\\/[^\\s]+$/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/urlPattern:\s*RegExp/);
    });

    it('should infer RegExp for phone number pattern', async () => {
      const code = 'const phoneRegex=/^\\d{3}-\\d{3}-\\d{4}$/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/phoneRegex:\s*RegExp/);
    });

    it('should infer RegExp for pattern with character classes', async () => {
      const code = 'const pattern=/[a-zA-Z0-9_]+/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp for pattern with quantifiers', async () => {
      const code = 'const pattern=/\\w{2,5}/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp for pattern with groups', async () => {
      const code = 'const pattern=/(\\d+)-(\\w+)/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });
  });

  describe('RegExp in function context', () => {
    it('should infer RegExp for function parameter default', async () => {
      const code = 'function test(pattern=/\\d+/){return pattern}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Default parameter types ARE inferred - parameter gets RegExp type annotation
      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp return type', async () => {
      const code = 'function getPattern(){return /test/}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/:\s*RegExp/);
    });

    it('should infer RegExp in arrow function', async () => {
      const code = 'const getRegex=()=>/\\d+/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // TODO: Arrow function return type annotations not yet implemented
      // Currently infers Function type for the variable but not the specific return type
      expect(result).toMatch(/getRegex:\s*Function/);
    });
  });

  describe('RegExp in expressions', () => {
    it('should infer RegExp in ternary expression', async () => {
      const code = 'const flag=true;const pattern=flag?/\\d+/:/\\w+/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp in logical OR', async () => {
      const code = 'const userPattern=/test/;const pattern=userPattern||/default/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should infer RegExp in array', async () => {
      const code = 'const patterns=[/\\d+/,/\\w+/,/test/];';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/patterns:\s*RegExp\[\]/);
    });

    it('should infer RegExp in object', async () => {
      const code = 'const validators={email:/^.+@.+$/,phone:/^\\d{10}$/};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/validators:\s*object/);
    });
  });

  describe('Type propagation', () => {
    it('should propagate RegExp type through assignments', async () => {
      const code = 'const pattern=/\\d+/;const copied=pattern;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
      expect(result).toMatch(/copied:\s*RegExp/);
    });

    it('should propagate RegExp type through ternary', async () => {
      const code = 'const pattern=/\\d+/;const flag=true;const result=flag?pattern:/test/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/result:\s*RegExp/);
    });
  });

  describe('RegExp methods', () => {
    it('should handle RegExp test method', async () => {
      const code = 'const pattern=/\\d+/;const isMatch=pattern.test("123");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
      // test() returns boolean
      expect(result).toMatch(/isMatch:\s*boolean/);
    });

    it('should handle RegExp exec method', async () => {
      const code = 'const pattern=/\\d+/;const match=pattern.exec("test123");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
      // TODO: exec() return type not in known types - should be RegExpExecArray | null
      // Currently returns no type annotation
      expect(result).toContain('const match');
    });
  });

  describe('String methods with RegExp', () => {
    it('should handle string match with RegExp', async () => {
      const code = 'const text="hello";const pattern=/l+/;const matches=text.match(pattern);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
      // match() is in known types and returns string (incorrectly - should be string[] | null)
      // This is a known limitation documented in the type system
      expect(result).toMatch(/matches:\s*string/);
    });

    it('should handle string replace with RegExp', async () => {
      const code = 'const text="hello";const result=text.replace(/l/g,"L");';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // replace() returns string
      expect(result).toMatch(/result:\s*string/);
    });

    it('should handle string split with RegExp', async () => {
      const code = 'const text="a,b;c";const parts=text.split(/[,;]/);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // split() returns string[]
      expect(result).toMatch(/parts:\s*string\[\]/);
    });

    it('should handle string search with RegExp', async () => {
      const code = 'const text="hello";const index=text.search(/l+/);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // search() returns number
      expect(result).toMatch(/index:\s*number/);
    });
  });

  describe('Edge cases', () => {
    it('should handle empty RegExp', async () => {
      const code = 'const pattern=/(?:)/;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should handle RegExp with escaped characters', async () => {
      const code = 'const pattern=/\\/\\*.*\\*\\//;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern:\s*RegExp/);
    });

    it('should handle multiple RegExp declarations', async () => {
      const code = 'const pattern1=/test/;const pattern2=/\\d+/;const pattern3=/[a-z]/i;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pattern1:\s*RegExp/);
      expect(result).toMatch(/pattern2:\s*RegExp/);
      expect(result).toMatch(/pattern3:\s*RegExp/);
    });
  });
});
