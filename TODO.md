# TODO: Type Inference Improvements

This document lists JavaScript/TypeScript constructs that are not yet handled by the type inference system. Each section includes examples that can be used to create tests.

**For completed features, see [DONE.md](./DONE.md).**

## Current Status

**Tests**: 751 passing, 2 skipped (out of 753 total)
**Coverage**: ~67% statements, ~58% branches, ~77% functions

**Completed Phases**:
- ✅ Phase 1: Foundation (4/4 items, 75 tests)
- ✅ Phase 2: Common Patterns (6/6 items, 144 tests)
- ✅ Phase 3: Modern JavaScript (4/4 items, 124 tests)
- ✅ Phase 4: Advanced Features (5.5/6 items, 171 tests)

**See [DONE.md](./DONE.md) for full details on completed features.**

---

## Test Quality Requirements

All tests MUST follow the 5-point testing strategy (see CLAUDE.md):
1. ✅ **Minimal test cases** - Constructs tested in isolation
2. ✅ **Realistic test cases** - Constructs tested in real-world scenarios
3. ✅ **Edge cases** - Nested, combined, boundary conditions
4. ✅ **TypeScript compilation** - Generated code compiles without errors
5. ✅ **Confidence scores** - Type inference confidence is reasonable (≥0.7)

**CRITICAL**: Tests must verify what they claim to test. Always check for actual type annotations, not just syntax preservation. See CLAUDE.md "Test Quality Requirements" section for detailed guidelines.

---

## Remaining Features

### Priority 1: High Impact Features

#### 1. Reduce Return Type Inference ⏭️ BLOCKED (2 tests skipped)
**Impact**: Medium (improves callback inference completeness)
**Effort**: Medium (1-2 hours)
**Blocks**: Full callback type inference completion

Currently `reduce` is hardcoded to return `any` in known-types.ts. Need to infer return type from initial value argument.

**Examples that need implementation:**
```javascript
const numbers = [1, 2, 3];

// Reduce with numeric initial value
const sum = numbers.reduce((acc, n) => acc + n, 0);
// Current: sum: any
// Expected: sum: number (from initial value)

// Reduce with object initial value
const obj = numbers.reduce((acc, n) => ({...acc, [n]: n * 2}), {});
// Current: obj: any
// Expected: obj: object (from initial value)

// Reduce with string initial value
const str = ["a", "b", "c"].reduce((acc, s) => acc + s, "");
// Current: str: any
// Expected: str: string (from initial value)

// Reduce with array initial value
const flat = [[1, 2], [3, 4]].reduce((acc, arr) => acc.concat(arr), []);
// Current: flat: any
// Expected: flat: any[] or number[] (from initial value)

// Reduce without initial value (return type from array element type)
const product = [1, 2, 3].reduce((acc, n) => acc * n);
// Current: product: any
// Expected: product: number (from array element type)
```

**Implementation approach**:
1. Make known-types context-aware to accept CallExpression node
2. For `reduce`, inspect second argument (initial value) to infer return type
3. If no initial value, return array element type
4. Handle edge cases (empty arrays, no initial value = error)

**Related tests**: 2 skipped tests in `src/__tests__/callback-inference.test.ts`

---

### Priority 2: Important Features

#### 2. JSON Methods
**Impact**: Medium
**Effort**: Low (5 minutes - add to known-types)

`JSON.parse()`, `JSON.stringify()`

**Examples for tests:**
```javascript
const parsed = JSON.parse('{"x":1}');
// Expected: parsed: any (or object)

const stringified = JSON.stringify({ x: 1 });
// Expected: stringified: string
```

---

#### 3. Promise Static Methods
**Impact**: Medium
**Effort**: Medium (30 minutes)

`Promise.all()`, `Promise.race()`, `Promise.resolve()`, `Promise.reject()`

**Examples for tests:**
```javascript
const p1 = Promise.resolve(42);
// Expected: p1: Promise<number>

const p2 = Promise.reject("error");
// Expected: p2: Promise<never> (or Promise<any>)

const all = Promise.all([p1, Promise.resolve("text")]);
// Expected: all: Promise<(number | string)[]> (or Promise<any[]>)

const race = Promise.race([p1, p2]);
// Expected: race: Promise<number> (or Promise<any>)
```

---

### Priority 3: Advanced Features

#### 4. Nullish Coalescing Enhancement
**Impact**: Low-Medium (ES2020 feature)
**Effort**: Low-Medium (20-30 minutes for union type filtering)

**Note**: Nullish coalescing (`??`) already works via logical expression support (item #4 in DONE.md). This item is for potential enhancements or edge cases.

**Main Enhancement Opportunity**: Union type filtering - when creating union types for `??`, filter out `null` and `undefined` from the left side since those are the values `??` replaces.

**Important**: This is NOT the same as Type Narrowing (item #9). This is simpler - just proper union type construction for the `??` operator, not control flow analysis.

**Examples for verification:**

```javascript
// Basic cases (already work)
const value = input ?? "default";
// Current: value matches input type or fallback type
// Expected: same (works correctly)

const port = process.env.PORT ?? 3000;
// Current: port: string | number (union type)
// Expected: same (works correctly)

// UNION TYPE FILTERING - Main enhancement needed
// When left side has null/undefined in union, they should be filtered out
// because ?? replaces those values with the right side
const maybeString = getValue(); // returns string | null
const definiteString = maybeString ?? "fallback";
// Current: definiteString: string | null | string (not simplified)
// Expected: definiteString: string (null filtered out because ?? replaces it)

const optional = findUser(); // returns User | undefined
const user = optional ?? getDefaultUser(); // returns User
// Current: user: User | undefined | User
// Expected: user: User (undefined filtered out)

const nullable = parseValue(); // returns number | null | undefined
const value = nullable ?? 0;
// Current: value: number | null | undefined | number
// Expected: value: number (both null and undefined filtered out)

// Chained nullish coalescing
const result = first ?? second ?? third ?? "default";
// Expected: Type should filter null/undefined at each step
// If first: string | null, second: number | undefined, third: boolean | null
// Result should be: string | number | boolean | string → simplified appropriately

// With optional chaining (combined operators)
const name = user?.profile?.name ?? "Anonymous";
// Current: Likely works, but verify type is correct
// Expected: name: string (optional chaining adds undefined, ?? removes it)

const length = array?.length ?? 0;
// Expected: length: number

// With array methods that return T | undefined
const numbers = [1, 2, 3];
const found = numbers.find(n => n > 5) ?? -1;
// Current: found: number | undefined | number
// Expected: found: number (undefined removed by ??)

const first = array.find(x => x.active) ?? getDefault();
// Expected: Type should be element type without undefined

// Nullish coalescing assignment operator (??=)
// This is a separate operator that may not be implemented yet
let config = null;
config ??= { default: true };
// Expected: config: object

let count = undefined;
count ??= 0;
// Expected: count: number

let value = 42;
value ??= 100;  // Doesn't assign because value is not nullish
// Expected: value: number (unchanged)

// Complex union types
const mixed = getMixed(); // returns string | number | null
const result = mixed ?? false;
// Current: result: string | number | null | boolean
// Expected: result: string | number | boolean (null removed)

// In function returns
function getValueOrDefault(input) {
  return input ?? "default";
}
// Expected: If input type known with null/undefined, return type should filter them out

// Nested expressions
const result = (a ?? b) ?? (c ?? d);
// Expected: Proper type filtering through nested expressions

// Note: Type propagation (where filtered types flow through subsequent statements)
// would require control flow analysis and is part of Type Narrowing (item #9).
// This enhancement is just about the ?? operator itself creating correct union types.

// With object/array spread
const config = { ...defaults, ...userConfig ?? {} };
// Expected: Verify nullish coalescing works with spread

// Comparison with || operator (different behavior)
const withOr = "" || "default";        // Returns "default" (empty string is falsy)
const withNullish = "" ?? "default";   // Returns "" (empty string is not nullish)
// Expected: Different types based on whether empty strings are considered
// Current || might incorrectly type this the same as ??

const withOrNum = 0 || 42;             // Returns 42 (0 is falsy)
const withNullishNum = 0 ?? 42;        // Returns 0 (0 is not nullish)
// Expected: These should potentially have different type behaviors
```

**Implementation approach**:
1. In `inferLogicalExpressionType` for `??` operator specifically
2. When left operand has union type, filter out `null` and `undefined` types from the union
3. Create union of filtered left type with right type
4. Simplify the resulting union (deduplicate, etc.)

**Example logic**:
- Left: `string | null` + Right: `string` → Result: `string` (null filtered, then deduplicated)
- Left: `number | undefined` + Right: `number` → Result: `number` (undefined filtered, then deduplicated)
- Left: `string | null` + Right: `number` → Result: `string | number` (null filtered)

**This enhancement would improve type accuracy for modern JavaScript patterns without requiring complex control flow analysis.**

---

#### 5. Generator Functions
**Impact**: Low (specialized use)
**Effort**: High (2 hours)

**Examples for tests:**
```javascript
function* numberGenerator() {
  yield 1;
  yield 2;
  yield 3;
}
// Expected: numberGenerator: () => Generator<number>

const gen = numberGenerator();
const first = gen.next();
// Expected: first: IteratorResult<number>
```

---

#### 6. Async Iterators
**Impact**: Low (advanced feature)
**Effort**: High (2 hours)

**Examples for tests:**
```javascript
async function* asyncGenerator() {
  yield await Promise.resolve(1);
  yield await Promise.resolve(2);
}
// Expected: asyncGenerator: () => AsyncGenerator<number>
```

---

#### 7. Symbol and BigInt
**Impact**: Low (rarely used in minified code)
**Effort**: Low (5 minutes)

**Examples for tests:**
```javascript
const sym = Symbol("key");
// Expected: sym: symbol

const big = 100n;
// Expected: big: bigint

const computed = BigInt(100);
// Expected: computed: bigint
```

---

#### 8. Computed Property Names
**Impact**: Low
**Effort**: Medium (1 hour)

**Examples for tests:**
```javascript
const key = "name";
const obj = {
  [key]: "John",
  [`${key}Upper`]: "JOHN"
};
// Expected: obj: object (limited inference possible)
```

---

#### 9. Type Narrowing
**Impact**: Medium (important for accuracy)
**Effort**: Very High (4+ hours - requires control flow analysis)

**Examples for tests:**
```javascript
function process(value) {
  if (typeof value === "string") {
    // value should be narrowed to string here
    return value.toUpperCase();
  } else if (typeof value === "number") {
    // value should be narrowed to number here
    return value * 2;
  }
  return value;
}
```

---

#### 10. IndexedAccess / Computed Member Access
**Impact**: Medium
**Effort**: Medium (1 hour)

**Examples for tests:**
```javascript
const arr = [1, 2, 3];
const first = arr[0];
// Expected: first: number (or any if array type unknown)

const obj = { x: 1, y: 2 };
const key = "x";
const value = obj[key];
// Expected: value: any (dynamic access is hard to type)
```

---

#### 11. this Context
**Impact**: Medium
**Effort**: High (2-3 hours)

**Examples for tests:**
```javascript
const obj = {
  value: 42,
  getValue() {
    return this.value;
  }
};
// Expected: getValue should recognize this.value as number
```

---

#### 12. Closures with Captured Variables
**Impact**: Medium
**Effort**: Medium (current system might handle, may need verification)

**Examples for tests:**
```javascript
function createCounter() {
  let count = 0;
  return function() {
    count++;
    return count;
  };
}
const counter = createCounter();
const value = counter();
// Expected: value: number (if count type is tracked)
```

---

#### 13. Class Property Tracking
**Impact**: Medium-High (significantly improves class feature inference)
**Effort**: Very High (3-4 hours - requires architectural changes)

**Why needed**: Currently, getters and methods that return `this.property` cannot infer accurate types because property types are not tracked across the class scope. This limits the usefulness of class feature inference.

**Dependencies**: Will be significantly helped by type narrowing (item #9) implementation, which provides control flow analysis that can track property assignments.

**What's needed**:
1. Class-level property type map to track property assignments
2. Track property declarations (e.g., `x: number;`)
3. Track constructor assignments (e.g., `this.x = x;`)
4. Track method assignments (e.g., `this.count++;`)
5. Resolve `this.property` expressions using the property type map
6. Handle property reassignments with different types
7. Support property type narrowing in conditional branches

**Examples for tests:**
```javascript
// Constructor property assignment
class User {
  constructor(name, age) {
    this._name = name;  // Should track: _name from parameter
    this._age = age;    // Should track: _age from parameter
  }

  get name() {
    return this._name;  // Should infer: () => any (from parameter)
  }

  get age() {
    return this._age;   // Should infer: () => any (from parameter)
  }
}
// Expected: name getter should return type of _name property

// Property declaration
class Counter {
  _count = 0;  // Property declaration with literal

  get count() {
    return this._count;  // Should infer: () => number
  }

  increment() {
    this._count++;       // Tracks mutation
    return this._count;  // Should infer: () => number
  }
}
// Expected: count getter should return number

// Multiple assignments
class State {
  constructor(initial) {
    this.value = initial;  // Assignment from parameter
  }

  reset() {
    this.value = 0;        // Assignment with literal
  }

  clear() {
    this.value = "";       // Assignment with different type
  }

  getValue() {
    return this.value;     // Should infer: () => any (mixed types)
  }
}
// Expected: getValue should return union type or any

// With type narrowing (future enhancement)
class Optional {
  constructor(value) {
    this._value = value;
  }

  hasValue() {
    return this._value !== null;
  }

  getValue() {
    if (this.hasValue()) {
      return this._value;  // Narrowed to non-null
    }
    throw new Error("No value");
  }
}
// Expected: After type narrowing, getValue could infer more specific type
```

**Implementation approach**:
1. Add `classPropertyTypes: Map<string, Map<string, InferredType>>` to TypeCollector
2. During ClassDeclaration traversal:
   - Create property map for the class
   - Track ClassProperty nodes (property declarations)
   - Track constructor assignments (`this.x = value`)
   - Track method assignments to `this.property`
3. Enhance MemberExpression inference:
   - When `object` is `ThisExpression`, lookup property type
   - Requires tracking "current class context" during traversal
4. Handle property reassignments:
   - Multiple assignments with same type → keep that type
   - Multiple assignments with different types → union type or `any`
5. Integration with type narrowing (future):
   - Use control flow analysis to track property type changes
   - Support conditional narrowing (e.g., `if (this.value !== null)`)

**Current limitations**:
- Getters returning `this.property` have low confidence
- Methods returning `this.property` cannot infer accurate types
- Property mutations not tracked across methods

**Related items**:
- See DONE.md item #19 (Class Features) - Currently limited by lack of property tracking
- Item #9 (Type Narrowing) - Will provide control flow analysis for property tracking
- Item #11 (this Context) - Related to understanding `this.property` access

---

## Implementation Priority Recommendations

### Next Recommended Items (Ordered by ROI)

1. **Reduce Return Type Inference** (item #1) - Completes callback inference, unblocks 2 tests
   - Medium effort, medium impact
   - Direct improvement to existing feature
   - Clear implementation path

2. **JSON Methods** (item #2) - Quick win, commonly used
   - Low effort (5 minutes)
   - Medium impact
   - Just add to known-types

3. **Symbol and BigInt** (item #7) - Quick win for completeness
   - Low effort (5 minutes)
   - Low impact but easy to add
   - Just add to known-types

4. **Computed Property Names** (item #8) - Modern JavaScript support
   - Medium effort (1 hour)
   - Low-medium impact
   - Improves object literal inference

5. **IndexedAccess / Computed Member Access** (item #10) - Common pattern
   - Medium effort (1 hour)
   - Medium impact
   - Useful for array/object access

### Advanced Items (Longer Term)

6. **Promise Static Methods** (item #3) - Async support
   - Medium effort (30 minutes)
   - Medium impact
   - Requires Promise type support

7. **Closures with Captured Variables** (item #12) - Improve closure inference
   - Medium effort (may already work)
   - Medium impact
   - May just need verification tests

8. **Type Narrowing** (item #9) - High value but complex
   - Very high effort (4+ hours)
   - Medium impact (improves accuracy significantly)
   - Requires control flow analysis
   - Unlocks other features

9. **Class Property Tracking** (item #13) - Improves class inference
   - Very high effort (3-4 hours)
   - Medium-high impact
   - Depends on type narrowing
   - Significantly improves class features

10. **this Context** (item #11) - Related to class property tracking
    - High effort (2-3 hours)
    - Medium impact
    - Works with class property tracking

### Specialized Features (Lower Priority)

11. **Generator Functions** (item #5) - Specialized use case
    - High effort (2 hours)
    - Low impact
    - Rarely used in minified code

12. **Async Iterators** (item #6) - Advanced feature
    - High effort (2 hours)
    - Low impact
    - Very specialized

---

## Testing Strategy

For each TODO item, when implemented:

1. **Create a minimal test case** showing the construct in isolation
2. **Create a realistic test case** showing the construct in context
3. **Test edge cases** (nested, combined with other features)
4. **Verify TypeScript output** compiles without errors
5. **Check confidence scores** are reasonable (≥0.7 for good inferences)

See CLAUDE.md for detailed test quality requirements and examples.

---

## Summary Statistics

### Remaining by Priority
- **Priority 1 (High Impact)**: 1 item
- **Priority 2 (Important)**: 2 items
- **Priority 3 (Advanced)**: 10 items

### Remaining by Effort
- **Low (< 30 min)**: 3 items (JSON, Symbol/BigInt, Nullish coalescing check)
- **Medium (30 min - 2 hours)**: 5 items (Reduce, Promise, Computed properties, IndexedAccess, Closures)
- **High (2+ hours)**: 5 items (Generators, Async iterators, Type narrowing, this Context, Class property tracking)

### Quick Wins Available
Implementing items #1, #2, #7 would take ~1.5 hours and complete:
- Reduce return type inference (completes callback inference)
- JSON methods (parse, stringify)
- Symbol and BigInt literals

---

**Note**: See [DONE.md](./DONE.md) for all completed features with examples and test results.
