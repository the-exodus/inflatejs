/**
 * Template literal type inference tests
 */

import { describe, it, expect } from 'vitest';
import { unminify } from '../unminifier-facade';

describe('Template literal type inference', () => {
  it('should infer string type for simple template literal', async () => {
    const code = 'const name="John";const greeting=`Hello, ${name}!`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/greeting:\s*string/);
  });

  it('should infer string type for template literal with expressions', async () => {
    const code = 'const x=5;const message=`Result: ${x*2}`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/message:\s*string/);
  });

  it('should infer string type for nested template literals', async () => {
    const code = 'const outer=`Outer ${`inner ${42}`}`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/outer:\s*string/);
  });

  it('should infer string type for template literal with no interpolation', async () => {
    const code = 'const plain=`Hello World`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/plain:\s*string/);
  });

  it('should infer string type for template literal with multiple interpolations', async () => {
    const code = 'const a="foo";const b="bar";const combined=`${a} and ${b}`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/combined:\s*string/);
  });

  it('should infer string type for template literal with method calls', async () => {
    const code = 'const text="hello";const upper=`Text: ${text.toUpperCase()}`;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/upper:\s*string/);
  });

  it('should propagate template literal type through assignments', async () => {
    const code = 'const name="John";const greeting=`Hello, ${name}`;const msg=greeting;';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/greeting:\s*string/);
    expect(result).toMatch(/msg:\s*string/);
  });

  it('should infer string return type for function returning template literal', async () => {
    const code = 'function greet(name){return `Hello, ${name}!`}';
    const result = await unminify(code, { inferTypes: true, outputFormat: 'ts' });

    expect(result).toMatch(/:\s*string/);
  });
});
