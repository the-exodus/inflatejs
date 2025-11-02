# Test Fixtures for InflateJS

This directory contains test files for manual testing and verification of InflateJS functionality.

## Files

### complex-minified.js
A comprehensive minified JavaScript file that tests various features:
- **Primitive types**: numbers, strings, arrays, objects
- **Functions**: regular functions, arrow functions, async functions
- **Classes**: constructor, methods
- **Closures**: functions returning functions with closure variables
- **Array methods**: map, filter, reduce, flat
- **String methods**: toUpperCase, split, charAt, substring, length
- **Promises**: Promise constructor, async/await, error handling
- **Control flow**: if/else, for loops, try/catch
- **Operators**: arithmetic, comparison, ternary
- **Complex scenarios**: nested functions, IIFEs, chained methods

### complex-unminified.js
Output from: `npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/complex-unminified.js --infer-types`

**Features demonstrated:**
- ✅ Variable renaming: `a` → `variable`, `b` → `variable2`, etc.
- ✅ Parameter renaming: `f`, `g` → `param`, `value`, etc.
- ✅ Type inference: JSDoc comments added for functions with confident type information
- ✅ Code formatting: Proper indentation, line breaks, consistent style
- ✅ Syntax expansion: Arrow functions expanded to block statements

**Type annotations found:**
- `e`: `(number, number) => number` - inferred from numeric addition
- `l`: `(number[]) => number` - inferred from array parameter and numeric return
- `s`: `(any) => number` - async function with numeric return
- `b1`: `(number) => number` - closure factory function
- `n1`: `(string, string) => object` - inferred from string methods and object return
- `b2`: `(number, number) => number` - numeric comparison and arithmetic
- `f2`: `() => object` - returns object literal
- `i2`: `(string) => number` - string parameter, numeric return (concatenation)
- `t2`: `() => number` - async function returning number

### complex-unminified.ts
Output from: `npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/complex-unminified.ts --typescript`

- Basic TypeScript output with `.ts` extension
- Variable renaming applied
- No type inference (requires explicit `--infer-types` flag)

### complex-unminified-full.ts
Output from: `npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/complex-unminified-full.ts --typescript --infer-types`

- ✅ **Full TypeScript output with native type annotations**
- ✅ **JSDoc comments converted to native TypeScript syntax**
- ✅ **Examples:**
  - `function e(param: number, value: number): number`
  - `function l(param5: number[]): number`
  - `async function s(param8: any): Promise<number>` (async returns wrapped in Promise<>)
  - `function n1(param11: string, value2: string): object`
  - `async function t2(): Promise<number>`

## Testing Commands

### Basic unminification (rename only)
```bash
npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/output.js
```

### With type inference
```bash
npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/output.js --infer-types
```

### TypeScript output
```bash
npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/output.ts --typescript
```

### Full featured (rename + type inference + TypeScript)
```bash
npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/output.ts --typescript --infer-types
```

### Without renaming
```bash
npx ts-node src/index.ts test-fixtures/complex-minified.js test-fixtures/output.js --no-rename
```

## Verification

All output files are valid JavaScript/TypeScript and can be executed:

```bash
# Run the JavaScript output
node test-fixtures/complex-unminified.js

# Check TypeScript compilation
npx tsc --noEmit test-fixtures/complex-unminified-full.ts
```

## Type Inference Examples

The type inference system successfully identifies types through:

1. **Literal inference**: `const a = 42` → `number`
2. **String method inference**: `param.toUpperCase()` → `param: string`
3. **Array method inference**: `param.map()` → array type
4. **Numeric operations**: `x + y` → numeric types
5. **Return type propagation**: Function return statements → function return type
6. **Inter-procedural inference**: Types flow through function calls
7. **Known constructors**: `new Promise()`, `new Date()` → known types
8. **Usage patterns**: `charAt()`, `split()`, `filter()`, `reduce()` → specific types

## Known Limitations

1. ~~**JSDoc vs Native TypeScript**~~ ✅ **FIXED**: TypeScript output now uses native TypeScript function signatures (e.g., `function foo(x: number): string`)
2. **Complex types**: Generic types, union types, and intersection types are simplified (currently uses `object`, `any`, etc.)
3. **Class type inference**: Class properties and methods don't get type annotations yet
4. **Variable declarations**: Top-level const/let variables don't get type annotations (only functions)
5. **Function return type accuracy**: Some complex cases like higher-order functions may have incorrect return types (e.g., a function returning a function may be typed as returning the inner return type)

## Future Enhancements

- ~~Native TypeScript function signature conversion~~ ✅ **DONE**
- ~~Async function Promise<> return type wrapping~~ ✅ **DONE**
- Variable type annotations (`const x: number = 42`)
- Class property type annotations
- Interface generation from object literals
- Generic type inference (e.g., `Array<number>` instead of `number[]`)
- Union and intersection types
- More sophisticated type narrowing
- Higher-order function return types
