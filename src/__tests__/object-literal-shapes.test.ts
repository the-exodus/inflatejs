import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Object Literal Shape Types', () => {
  describe('Basic Object Literals', () => {
    it('should infer shape type for simple object literal', async () => {
      const code = 'const user={name:"John",age:30};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should infer specific shape, not generic 'object'
      expect(result).toMatch(/user:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}/);
    });

    it('should infer shape type for object with different property types', async () => {
      const code = 'const config={port:3000,host:"localhost",debug:true};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should infer all property types correctly
      expect(result).toMatch(/config:\s*\{\s*port:\s*number/);
      expect(result).toMatch(/host:\s*string/);
      expect(result).toMatch(/debug:\s*boolean/);
    });

    it('should infer shape type for object with string property', async () => {
      const code = 'const obj={name:"test"};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*name:\s*string\s*\}/);
    });

    it('should infer shape type for object with number property', async () => {
      const code = 'const obj={count:42};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*count:\s*number\s*\}/);
    });

    it('should infer shape type for object with boolean property', async () => {
      const code = 'const obj={active:true};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/obj:\s*\{\s*active:\s*boolean\s*\}/);
    });
  });

  describe('Nested Object Literals', () => {
    it('should infer shape type for nested objects', async () => {
      const code = 'const data={user:{name:"John",age:30}};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should infer nested shape
      expect(result).toMatch(/data:\s*\{\s*user:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}\s*\}/);
    });

    it('should infer shape type for deeply nested objects', async () => {
      const code = 'const data={a:{b:{c:1}}};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Should handle multiple levels of nesting
      expect(result).toMatch(/data:\s*\{\s*a:\s*\{\s*b:\s*\{\s*c:\s*number\s*\}\s*\}\s*\}/);
    });

    it('should infer shape type for object with multiple nested objects', async () => {
      const code = 'const data={user:{name:"John"},settings:{theme:"dark"}};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/user:\s*\{\s*name:\s*string\s*\}/);
      expect(result).toMatch(/settings:\s*\{\s*theme:\s*string\s*\}/);
    });
  });

  describe('Objects with Arrays', () => {
    it('should infer shape type for object with array property', async () => {
      const code = 'const data={items:[1,2,3]};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Array property should be typed as number[]
      expect(result).toMatch(/data:\s*\{\s*items:\s*number\[\]\s*\}/);
    });

    it('should infer shape type for object with string array property', async () => {
      const code = 'const data={tags:["a","b"]};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/data:\s*\{\s*tags:\s*string\[\]\s*\}/);
    });

    it('should infer shape type for object with mixed properties including arrays', async () => {
      const code = 'const data={name:"test",items:[1,2]};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/name:\s*string/);
      expect(result).toMatch(/items:\s*number\[\]/);
    });
  });

  describe('Edge Cases', () => {
    it('should infer shape type for empty object', async () => {
      const code = 'const obj={};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Empty object should be typed as {}
      expect(result).toMatch(/obj:\s*\{\s*\}/);
    });

    it('should infer shape type for object with null value', async () => {
      const code = 'const obj={value:null};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // null should be typed as null or any
      expect(result).toMatch(/obj:\s*\{\s*value:\s*(null|any)\s*\}/);
    });

    it('should handle object with computed property names', async () => {
      const code = 'const key="name";const obj={[key]:"John"};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Computed properties are harder - at minimum should not crash
      // Could fall back to 'object' or infer { [key: string]: string }
      expect(result).toContain('obj');
    });
  });

  describe('Integration with Destructuring', () => {
    // These tests verify that proper object shape types enable destructuring to work

    it('should enable destructuring to infer types from object literal', async () => {
      const code = 'const user={name:"John",age:30};const {name,age}=user;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // With proper shape type, TypeScript can infer destructured variable types
      expect(result).toMatch(/user:\s*\{\s*name:\s*string\s*,\s*age:\s*number\s*\}/);
      expect(result).toContain('name: name');
      expect(result).toContain('age: age');
      // TypeScript will infer the types from the source object shape
    });

    it('should enable nested destructuring to work', async () => {
      const code = 'const data={user:{name:"John"}};const {user:{name}}=data;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Nested object shape should enable nested destructuring
      expect(result).toMatch(/data:\s*\{\s*user:\s*\{\s*name:\s*string\s*\}\s*\}/);
    });

    it('should enable destructuring with mixed object and array', async () => {
      const code = 'const data={arr:[1,2]};const {arr:[x,y]}=data;';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Shape should include array type
      expect(result).toMatch(/data:\s*\{\s*arr:\s*number\[\]\s*\}/);
    });
  });

  describe('Realistic Scenarios', () => {
    it('should infer shape type for configuration object', async () => {
      const code = 'const config={port:3000,host:"localhost",ssl:true,timeout:5000};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/config:\s*\{/);
      expect(result).toMatch(/port:\s*number/);
      expect(result).toMatch(/host:\s*string/);
      expect(result).toMatch(/ssl:\s*boolean/);
      expect(result).toMatch(/timeout:\s*number/);
    });

    it('should infer shape type for user data object', async () => {
      const code = 'const user={id:1,name:"John",email:"john@example.com",active:true};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      expect(result).toMatch(/user:\s*\{/);
      expect(result).toMatch(/id:\s*number/);
      expect(result).toMatch(/name:\s*string/);
      expect(result).toMatch(/email:\s*string/);
      expect(result).toMatch(/active:\s*boolean/);
    });

    it('should infer shape type for API response object', async () => {
      const code = 'const response={status:200,data:{user:{id:1,name:"John"}},error:null};';
      const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

      // Complex nested structure
      expect(result).toMatch(/response:\s*\{/);
      expect(result).toMatch(/status:\s*number/);
      expect(result).toMatch(/data:\s*\{/);
      expect(result).toMatch(/user:\s*\{/);
      expect(result).toMatch(/id:\s*number/);
      expect(result).toMatch(/name:\s*string/);
    });
  });
});
