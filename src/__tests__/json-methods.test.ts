import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('JSON Methods', () => {
  describe('JSON.parse', () => {
    it('should infer any type from JSON.parse (no annotation)', async () => {
      const code = 'const data=JSON.parse(\'{"x":1}\');';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // JSON.parse returns any, which doesn't get annotated in output
      // Verify NO type annotation appears (confirming it's inferred as 'any')
      expect(result).not.toMatch(/data:\s*\w+/);
      expect(result).toContain('JSON.parse');
      // Confidence score verification in confidence-scores.test.ts confirms it's 'any' with 1.0 confidence
    });

    it('should handle JSON.parse with variable argument', async () => {
      const code = 'const json=\'{"name":"John"}\';const obj=JSON.parse(json);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/json:\s*string/);
      // obj is 'any', so no type annotation should appear
      expect(result).not.toMatch(/obj:\s*\w+/);
      expect(result).toContain('JSON.parse');
    });

    it('should handle JSON.parse in assignment', async () => {
      const code = 'let config;config=JSON.parse(\'{"enabled":true}\');';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // config is 'any', so no type annotation should appear
      expect(result).not.toMatch(/config:\s*\w+/);
      expect(result).toContain('JSON.parse');
    });

    it('should handle JSON.parse with property access', async () => {
      const code = 'const data=JSON.parse(\'{"x":1}\');const val=data.x;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // data is 'any', so no type annotation should appear
      expect(result).not.toMatch(/data:\s*\w+/);
      // This test also verifies property access on 'any' type is preserved
      expect(result).toContain('JSON.parse');
      expect(result).toContain('data.x');
    });
  });

  describe('JSON.stringify', () => {
    it('should infer string type from JSON.stringify', async () => {
      const code = 'const str=JSON.stringify({x:1,y:2});';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // JSON.stringify always returns string
      expect(result).toMatch(/str:\s*string/);
      expect(result).toContain('JSON.stringify');
    });

    it('should handle JSON.stringify with variable argument', async () => {
      const code = 'const obj={name:"John",age:30};const json=JSON.stringify(obj);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}/);
      expect(result).toMatch(/json:\s*string/);
    });

    it('should handle JSON.stringify with array', async () => {
      const code = 'const arr=[1,2,3];const str=JSON.stringify(arr);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/arr:\s*number\[\]/);
      expect(result).toMatch(/str:\s*string/);
    });

    it('should handle JSON.stringify with null and undefined', async () => {
      const code = 'const nullStr=JSON.stringify(null);const undefinedStr=JSON.stringify(undefined);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Both return string
      expect(result).toMatch(/nullStr:\s*string/);
      expect(result).toMatch(/undefinedStr:\s*string/);
    });

    it('should handle JSON.stringify with replacer and space arguments', async () => {
      const code = 'const obj={x:1};const pretty=JSON.stringify(obj,null,2);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/pretty:\s*string/);
    });
  });

  describe('JSON roundtrip', () => {
    it('should handle JSON parse and stringify together', async () => {
      const code = 'const obj={x:1,y:2};const str=JSON.stringify(obj);const parsed=JSON.parse(str);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*x:\s*number\s*,\s*y:\s*number\s*\}/);
      expect(result).toMatch(/str:\s*string/);
      expect(result).toContain('JSON.parse');
      expect(result).toContain('parsed');
    });

    it('should handle JSON in API calls pattern', async () => {
      const code = 'const response=\'{"status":"ok"}\';const data=JSON.parse(response);const result=data.status;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/response:\s*string/);
      expect(result).toContain('JSON.parse');
      expect(result).toContain('data.status');
    });

    it('should handle JSON in localStorage pattern', async () => {
      const code = 'const config={theme:"dark"};const stored=JSON.stringify(config);';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/config:\s*\{\s*theme:\s*string\s*\}/);
      expect(result).toMatch(/stored:\s*string/);
    });
  });

  describe('Error handling patterns', () => {
    it('should handle JSON.parse in try-catch', async () => {
      const code = 'let data;try{data=JSON.parse(input);}catch(e){data=null;}';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // data is 'any' from JSON.parse, so no type annotation
      expect(result).not.toMatch(/data:\s*\w+/);
      expect(result).toContain('JSON.parse');
      expect(result).toContain('try');
      expect(result).toContain('catch');
    });

    it('should handle JSON methods in conditional', async () => {
      const code = 'const str=isValid?JSON.stringify(obj):null;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Union type: string | null
      expect(result).toMatch(/str:\s*(string \| null|null \| string)/);
    });
  });
});
