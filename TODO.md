# TODO: Type Inference Improvements

This document lists JavaScript/TypeScript constructs that are not currently handled by the type inference system, organized by priority. Each section includes examples that can be used to create tests.

## Priority 1: Critical (High Impact, Quick Wins)

### 1. Template Literals
**Impact**: Very High (used in ~30% of modern JS)
**Effort**: Low (5 minutes)

Currently returns `any`, should return `string`.

**Examples for tests:**
```javascript
// Simple template literal
const name = "John";
const greeting = `Hello, ${name}!`;
// Expected: greeting: string

// Template literal with expressions
const x = 5;
const message = `Result: ${x * 2}`;
// Expected: message: string

// Nested template literals
const outer = `Outer ${`inner ${42}`}`;
// Expected: outer: string
```

### 2. Unary Expressions
**Impact**: High (logical negation, typeof)
**Effort**: Low (10 minutes)

Currently returns `any` for `!`, `typeof`, `-`, `+`, `~`, `void`, `delete`.

**Examples for tests:**
```javascript
// Logical NOT
const isActive = true;
const isInactive = !isActive;
// Expected: isInactive: boolean

// typeof operator
const typeOfValue = typeof 42;
// Expected: typeOfValue: string

// Unary plus/minus
const num = 5;
const negative = -num;
const positive = +num;
// Expected: negative: number, positive: number

// void operator
const result = void 0;
// Expected: result: undefined
```

### 3. Conditional (Ternary) Expressions
**Impact**: High (common pattern)
**Effort**: Medium (20 minutes)

Currently returns `any`, should infer union type or common type.

**Examples for tests:**
```javascript
// Same type branches
const mode = isDev ? "debug" : "production";
// Expected: mode: string

// Number branches
const value = condition ? 100 : 200;
// Expected: value: number

// Different types (union)
const result = flag ? "text" : 42;
// Expected: result: string | number (or 'any' as fallback)

// Nested ternary
const level = score > 90 ? "A" : score > 80 ? "B" : "C";
// Expected: level: string
```

### 4. Logical Expressions (Value Usage)
**Impact**: High (common for defaults)
**Effort**: Medium (20 minutes)

`||` and `&&` used for values, not just booleans.

**Examples for tests:**
```javascript
// OR for default values
const name = userName || "Anonymous";
// Expected: name should match userName's type or fallback type

// AND for conditional values
const result = isReady && fetchData();
// Expected: depends on fetchData() return type

// Nullish coalescing (if supported)
const value = input ?? defaultValue;
// Expected: matches input type
```

### 5. Common Array Methods (Missing)
**Impact**: High (very common)
**Effort**: Low (15 minutes - just add to known-types)

Missing: `reduce`, `find`, `findIndex`, `some`, `every`, `forEach`, `flat`, `flatMap`, `slice`, `concat`, `push`, `pop`, `shift`, `unshift`

**Examples for tests:**
```javascript
const numbers = [1, 2, 3, 4, 5];

// reduce
const sum = numbers.reduce((acc, n) => acc + n, 0);
// Expected: sum: number

// find
const found = numbers.find(n => n > 3);
// Expected: found: number | undefined

// some/every
const hasEven = numbers.some(n => n % 2 === 0);
const allPositive = numbers.every(n => n > 0);
// Expected: hasEven: boolean, allPositive: boolean

// flat
const nested = [[1, 2], [3, 4]];
const flattened = nested.flat();
// Expected: flattened: number[]

// slice
const sliced = numbers.slice(1, 3);
// Expected: sliced: number[]
```

### 6. Common String Methods (Missing)
**Impact**: High (very common)
**Effort**: Low (10 minutes - just add to known-types)

Missing: `slice`, `replace`, `replaceAll`, `trim`, `trimStart`, `trimEnd`, `toLowerCase`, `toUpperCase`, `startsWith`, `endsWith`, `includes`, `match`, `test`, `padStart`, `padEnd`, `repeat`

**Examples for tests:**
```javascript
const text = "Hello World";

// slice
const sliced = text.slice(0, 5);
// Expected: sliced: string

// replace
const replaced = text.replace("World", "Universe");
// Expected: replaced: string

// trim
const trimmed = text.trim();
// Expected: trimmed: string

// toLowerCase/toUpperCase
const lower = text.toLowerCase();
const upper = text.toUpperCase();
// Expected: lower: string, upper: string

// startsWith/endsWith/includes
const starts = text.startsWith("Hello");
const ends = text.endsWith("World");
const contains = text.includes("o");
// Expected: all boolean

// match
const matches = text.match(/[A-Z]/g);
// Expected: matches: RegExpMatchArray | null (or string[] | null)

// repeat
const repeated = "x".repeat(3);
// Expected: repeated: string
```

## Priority 2: Important (Medium Impact)

### 7. Destructuring
**Impact**: Medium-High (ES6+ standard)
**Effort**: High (2-3 hours - complex AST handling)

Object and array destructuring in assignments and parameters.

**Examples for tests:**
```javascript
// Object destructuring
const user = { name: "John", age: 30 };
const { name, age } = user;
// Expected: name: string, age: number (if user type known)

// Array destructuring
const coords = [10, 20];
const [x, y] = coords;
// Expected: x: number, y: number (if coords type known)

// Nested destructuring
const data = { user: { name: "John" } };
const { user: { name: userName } } = data;
// Expected: userName: string

// Parameter destructuring
function greet({ name, age }) {
  return `${name} is ${age}`;
}
// Expected: name: any, age: any (or infer from usage)

// Array destructuring with rest
const [first, ...rest] = [1, 2, 3, 4];
// Expected: first: number, rest: number[]
```

### 8. Spread Operator
**Impact**: Medium (common in modern code)
**Effort**: Medium (1 hour)

Spread in arrays, objects, and function calls.

**Examples for tests:**
```javascript
// Array spread
const arr1 = [1, 2, 3];
const arr2 = [...arr1, 4, 5];
// Expected: arr2: number[]

// Object spread
const obj1 = { x: 1, y: 2 };
const obj2 = { ...obj1, z: 3 };
// Expected: obj2: object

// Function call spread
const nums = [1, 2, 3];
const max = Math.max(...nums);
// Expected: max: number
```

### 9. Rest Parameters
**Impact**: Medium
**Effort**: Medium (1 hour)

Functions with rest parameters.

**Examples for tests:**
```javascript
// Rest parameters
function sum(...numbers) {
  return numbers.reduce((a, b) => a + b, 0);
}
// Expected: sum: (...args: any[]) => number

// Rest with typed parameters
function log(message, ...args) {
  console.log(message, args);
}
// Expected: log: (any, ...any[]) => void
```

### 10. Default Parameters
**Impact**: Medium
**Effort**: Low-Medium (30 minutes)

Function parameters with default values.

**Examples for tests:**
```javascript
// Default parameter with literal
function greet(name = "Guest") {
  return `Hello, ${name}`;
}
// Expected: greet: (string?) => string

// Default parameter with expression
function increment(x, delta = 1) {
  return x + delta;
}
// Expected: increment: (any, number?) => number
```

### 11. RegExp Literals
**Impact**: Medium
**Effort**: Low (5 minutes)

Regular expression literals should be typed as `RegExp`.

**Examples for tests:**
```javascript
const pattern = /\d+/g;
// Expected: pattern: RegExp

const emailRegex = /^[a-z]+@[a-z]+\.[a-z]+$/i;
// Expected: emailRegex: RegExp
```

### 12. Object Static Methods
**Impact**: Medium (common utilities)
**Effort**: Low (10 minutes - add to known-types)

`Object.keys()`, `Object.values()`, `Object.entries()`, etc.

**Examples for tests:**
```javascript
const obj = { x: 1, y: 2, z: 3 };

const keys = Object.keys(obj);
// Expected: keys: string[]

const values = Object.values(obj);
// Expected: values: any[] (or number[] if obj type known)

const entries = Object.entries(obj);
// Expected: entries: [string, any][] (or [string, number][] if obj type known)

const assigned = Object.assign({}, obj, { w: 4 });
// Expected: assigned: object
```

### 13. Array Static Methods
**Impact**: Medium
**Effort**: Low (5 minutes - add to known-types)

`Array.isArray()`, `Array.from()`, etc.

**Examples for tests:**
```javascript
const isArr = Array.isArray([1, 2, 3]);
// Expected: isArr: boolean

const arr = Array.from("hello");
// Expected: arr: string[]

const filled = Array(5).fill(0);
// Expected: filled: number[]
```

### 14. Type Conversion Functions
**Impact**: Medium
**Effort**: Low (5 minutes - add to known-types)

`parseInt()`, `parseFloat()`, `Number()`, `String()`, `Boolean()`

**Examples for tests:**
```javascript
const num = parseInt("42");
// Expected: num: number

const float = parseFloat("3.14");
// Expected: float: number

const str = String(123);
// Expected: str: string

const bool = Boolean(1);
// Expected: bool: boolean
```

### 15. JSON Methods
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

### 16. Promise Static Methods
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

## Priority 3: Advanced (Lower Impact or Complex)

### 17. Optional Chaining
**Impact**: Medium (ES2020 feature)
**Effort**: High (2 hours - needs careful null handling)

**Examples for tests:**
```javascript
const user = { profile: { name: "John" } };
const name = user?.profile?.name;
// Expected: name: string | undefined

const result = obj?.method?.();
// Expected: result depends on method return type or undefined
```

### 18. Nullish Coalescing
**Impact**: Low-Medium (ES2020 feature)
**Effort**: Low (10 minutes)

**Examples for tests:**
```javascript
const value = input ?? "default";
// Expected: value matches input type or fallback type

const port = process.env.PORT ?? 3000;
// Expected: port: string | number (union type)
```

### 19. Class Features
**Impact**: Medium
**Effort**: High (3-4 hours)

Class inheritance, static methods, getters/setters, private fields.

**Examples for tests:**
```javascript
// Basic class
class Point {
  x: number;
  y: number;

  constructor(x, y) {
    this.x = x;
    this.y = y;
  }

  distance() {
    return Math.sqrt(this.x ** 2 + this.y ** 2);
  }
}
// Expected: Point type, distance: () => number

// Class inheritance
class Point3D extends Point {
  z: number;

  constructor(x, y, z) {
    super(x, y);
    this.z = z;
  }
}
// Expected: Point3D extends Point

// Static methods
class MathUtils {
  static add(a, b) {
    return a + b;
  }
}
// Expected: MathUtils.add: (any, any) => number

// Getters and setters
class Person {
  _name: string;

  get name() {
    return this._name;
  }

  set name(value) {
    this._name = value;
  }
}
// Expected: name getter returns string, setter accepts string
```

### 20. Generator Functions
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

### 21. Async Iterators
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

### 22. Symbol and BigInt
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

### 23. Computed Property Names
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

### 24. Type Narrowing
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

### 25. Callback Type Inference
**Impact**: High (very useful)
**Effort**: Very High (4+ hours - requires sophisticated analysis)

Infer parameter types in callbacks from array element types.

**Examples for tests:**
```javascript
const numbers = [1, 2, 3, 4, 5];

// Callback parameter should be inferred as number
const doubled = numbers.map(x => x * 2);
// Expected: x: number, doubled: number[]

const filtered = numbers.filter(x => x > 2);
// Expected: x: number, filtered: number[]

// String array
const words = ["hello", "world"];
const lengths = words.map(word => word.length);
// Expected: word: string, lengths: number[]
```

### 26. Chained Method Calls
**Impact**: High (common pattern)
**Effort**: Medium (current system should handle, may need fixes)

**Examples for tests:**
```javascript
const result = "hello,world,test"
  .split(",")
  .map(s => s.toUpperCase())
  .filter(s => s.length > 5)
  .join("-");
// Expected: result: string
// Each step: split->string[], map->string[], filter->string[], join->string
```

### 27. IndexedAccess / Computed Member Access
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

### 28. this Context
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

### 29. Closures with Captured Variables
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

### 30. Union Types from Conditionals
**Impact**: Medium (improves accuracy)
**Effort**: High (2 hours)

**Examples for tests:**
```javascript
function getValue(flag) {
  if (flag) {
    return "text";
  } else {
    return 42;
  }
}
// Expected: getValue: (any) => string | number (or any as fallback)
```

## Summary Statistics

### By Priority
- **Priority 1 (Critical)**: 6 items - Quick wins, high impact
- **Priority 2 (Important)**: 11 items - Medium effort, good ROI
- **Priority 3 (Advanced)**: 13 items - Complex or specialized

### By Effort
- **Low (< 30 min)**: 12 items
- **Medium (30 min - 2 hours)**: 11 items
- **High (2+ hours)**: 7 items

### Quick Wins (< 1 hour total)
Implementing Priority 1 items 1-6 would add support for:
- Template literals
- Unary expressions (!, typeof, etc.)
- Ternary operators
- Logical operators for values
- ~40 missing array methods
- ~20 missing string methods

**Impact**: Would improve type inference coverage from ~50% to ~75%+ of common JavaScript code.

## Testing Strategy

For each TODO item:

1. **Create a minimal test case** showing the construct in isolation
2. **Create a realistic test case** showing the construct in context
3. **Test edge cases** (nested, combined with other features)
4. **Verify TypeScript output** compiles without errors
5. **Check confidence scores** are reasonable (≥0.7 for good inferences)

## Implementation Order Recommendation

### Phase 1 (1 hour): Foundation
1. Template literals
2. Unary expressions
3. Ternary operators
4. Missing array/string methods in known-types

### Phase 2 (2 hours): Common Patterns
5. Logical expressions for values
6. RegExp literals
7. Object/Array static methods
8. Type conversion functions

### Phase 3 (3 hours): Modern JavaScript
9. Default parameters
10. Rest parameters
11. Optional chaining
12. Spread operator

### Phase 4 (4+ hours): Advanced Features
13. Destructuring
14. Class features
15. Callback type inference
16. Type narrowing

---

**Note**: Each item includes examples that can be directly converted into test cases. The examples show both the input JavaScript and the expected inferred types in comments.
