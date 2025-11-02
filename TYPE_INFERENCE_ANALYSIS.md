# Type Inference System Analysis Report

## Executive Summary

The type inference system in InflateJS has **good coverage for basic cases** but has several **blind spots** for modern JavaScript constructs. The system handles literals, arrays, objects, functions, and simple method calls well, but struggles with advanced patterns.

---

## 1. HANDLED CONSTRUCTS

### TypeCollector.inferTypeFromNode() - AST Node Types

Located in: `/home/tobias/Work/personal/inflatejs/src/services/type-inference/type-collector.ts`

**Handled Node Types:**
- `StringLiteral` → `'string'` (confidence: 1.0)
- `NumericLiteral` → `'number'` (confidence: 1.0)
- `BooleanLiteral` → `'boolean'` (confidence: 1.0)
- `NullLiteral` → `'null'` (confidence: 1.0)
- `ArrayExpression` → `'T[]'` or `'any[]'` (confidence: 0.7-0.9)
- `ObjectExpression` → `'object'` (confidence: 0.8)
- `FunctionExpression` → `'Function'` (confidence: 0.9)
- `ArrowFunctionExpression` → `'Function'` (confidence: 0.9)
- `CallExpression` → Uses knownTypes lookup (confidence: 0.8)
- `NewExpression` → Constructor inference (confidence: 0.7-0.9)

### TypeResolver.inferTypeFromNode() - Expression Handling

Located in: `/home/tobias/Work/personal/inflatejs/src/services/type-inference/type-resolver.ts`

**Handled Expression Types:**
- All types from TypeCollector
- `BinaryExpression`: 
  - Arithmetic (`+`, `-`, `*`, `/`, `%`, `**`) → `'number'` or `'string'`
  - Comparison (`==`, `===`, `!=`, `!==`, `>`, `<`, `>=`, `<=`) → `'boolean'`
  - Logical (`&&`, `||`) → `'boolean'`
- `AwaitExpression` → Unwraps `Promise<T>` to `T`
- `Identifier` → Lookup in typeMap
- `MemberExpression` (property access)
  - `.length` property → `'number'`
  - Constructor property → `'Function'`

### Method Return Type Inference (TypeResolver.inferMethodReturnType)

**String Methods:**
- `split` → `'string[]'`
- `indexOf`, `lastIndexOf`, `search`, `charCodeAt` → `'number'`
- All other string methods → `'string'`

**Array Methods:**
- `map`, `filter`, `slice`, `concat` → `'same array type'`
- `join` → `'string'`
- `every`, `some`, `includes` → `'boolean'`
- `indexOf`, `findIndex` → `'number'`

### Known Constructors (NewExpression)

- `Date` → `'Date'`
- `Error` → `'Error'`
- `RegExp` → `'RegExp'`
- `Map` → `'Map<any, any>'`
- `Set` → `'Set<any>'`
- `WeakMap` → `'WeakMap<any, any>'`
- `WeakSet` → `'WeakSet<any>'`
- `Promise` → `'Promise<T>'` (with T inference)
- `Array` → `'any[]'`
- `Object` → `'object'`

### UsageAnalyzer - Detected Patterns

Located in: `/home/tobias/Work/personal/inflatejs/src/services/type-inference/usage-analyzer.ts`

**String Methods Detected:**
```
charAt, charCodeAt, concat, indexOf, lastIndexOf, match, replace, search, 
slice, split, substr, substring, toLowerCase, toUpperCase, trim
```

**Array Methods Detected:**
```
concat, every, filter, find, findIndex, forEach, includes, indexOf, join, 
keys, map, pop, push, reduce, reverse, shift, slice, some, sort, splice, unshift
```

**Usage Patterns:**
- Binary operations with arithmetic operators → `'number'`
- `+` operator → `'number|string'` (ambiguous)
- Array access with numeric index → `'array'`
- Method calls → Type based on method name
- Comparisons with literals → Type matches literal

### Known Types Map (knownTypes.ts)

**Constructors:**
```
String → 'string'
Number → 'number'
Boolean → 'boolean'
Array → 'any[]'
Object → 'object'
Function → 'Function'
RegExp → 'RegExp'
Date → 'Date'
Promise → 'Promise<any>'
Map → 'Map<any, any>'
Set → 'Set<any>'
```

**Method Returns (limited):**
```
Array.prototype.map → 'any[]'
Array.prototype.filter → 'any[]'
Array.prototype.reduce → 'any'
Array.prototype.forEach → 'void'
Array.prototype.find → 'any'
Array.prototype.some → 'boolean'
Array.prototype.every → 'boolean'
Array.prototype.join → 'string'
String.prototype.split → 'string[]'
String.prototype.replace → 'string'
String.prototype.match → 'RegExpMatchArray | null'
Object.keys → 'string[]'
Object.values → 'any[]'
Object.entries → '[string, any][]'
```

---

## 2. NOT HANDLED - CRITICAL GAPS

### Literal Node Types NOT Handled

1. **TemplateLiteral** (backtick strings)
   ```javascript
   const x = `Hello ${name}`; // Returns 'any' instead of 'string'
   const y = `${1 + 2}`; // Returns 'any' instead of 'string'
   ```

2. **RegExpLiteral** (regex patterns)
   ```javascript
   const pattern = /test/g; // Returns 'any' instead of 'RegExp'
   const flags = /[a-z]+/i; // Returns 'any' instead of 'RegExp'
   ```

3. **BigIntLiteral** (ES2020 BigInt)
   ```javascript
   const big = 123n; // Returns 'any' instead of 'bigint'
   ```

### Expression Types NOT Handled

1. **ConditionalExpression** (ternary operator)
   ```javascript
   const x = condition ? 'string' : 123; // Returns 'any', should infer union or dominant type
   const y = flag ? a : b; // No type inference
   ```

2. **LogicalExpression** (&&, ||)
   ```javascript
   const x = a || b; // Returns 'any', should infer from both operands
   const y = a && b; // Returns 'any'
   const z = obj?.prop; // Not handled
   ```

3. **UpdateExpression** (++, --)
   ```javascript
   let count = 0;
   count++; // Doesn't recognize count remains 'number'
   ```

4. **UnaryExpression** (!, -, +, typeof, delete)
   ```javascript
   const isNotEmpty = !empty; // Returns 'any' instead of 'boolean'
   const positive = -x; // Loses numeric type context
   const typeOf = typeof x; // Should be 'string'
   const negative = -42; // Could be literal 'number'
   ```

5. **AssignmentExpression**
   ```javascript
   x = y = z = 10; // Chained assignments not analyzed
   x += 5; // Compound operators don't update type info
   ```

6. **SpreadElement**
   ```javascript
   const arr = [...otherArray]; // Type lost
   const obj = {...baseObj}; // Returns 'object' but loses property info
   ```

7. **ThisExpression**
   ```javascript
   class MyClass {
     method() {
       return this.value; // 'this' type unknown
     }
   }
   ```

8. **SequenceExpression**
   ```javascript
   const x = (a, b, c); // Only c's type matters, but not handled
   ```

### Statement Types NOT Handled

1. **VariableDeclarator with destructuring**
   ```javascript
   const { name, age } = person; // Returns 'any' for both
   const [first, second] = array; // Returns 'any' for both
   ```

2. **Function parameters with destructuring**
   ```javascript
   function greet({ name, age }) { } // Parameter types lost
   function process([a, b]) { } // Parameter types lost
   ```

3. **Rest parameters**
   ```javascript
   function sum(...numbers) { } // Should infer 'number[]' for numbers
   ```

4. **Default parameters**
   ```javascript
   function getValue(val = 42) { } // val should be inferred as 'number'
   ```

### Class/Object Features NOT Handled

1. **ClassDeclaration & ClassExpression**
   ```javascript
   class User { }
   const u = new User(); // Returns generic 'object' instead of 'User'
   ```

2. **Property type annotations in objects**
   ```javascript
   const config = {
     name: 'app',
     timeout: 5000,
     enabled: true
   }; // Type properties not tracked
   ```

3. **Getter/Setter return types**
   ```javascript
   class Foo {
     get value() { return this.x; } // Return type not inferred
   }
   ```

4. **Static methods/properties**
   ```javascript
   class Math {
     static PI = 3.14; // Type not inferred
   }
   ```

### Method Return Types NOT in knownTypes.ts

**Missing String Methods (common ones):**
```
charAt → 'string'
charCodeAt → 'number'  ✓ (handled in method inference but not knownTypes)
concat → 'string'
padEnd, padStart → 'string'
repeat → 'string'
substring, substr, slice → 'string'
toLocaleLowerCase, toLocaleUpperCase → 'string'
trim, trimStart, trimEnd → 'string'
startsWith, endsWith, includes → 'boolean'
```

**Missing Array Methods (common ones):**
```
at → 'T'
flat → 'T[]'
flatMap → 'R[]'
copyWithin → 'this'
fill → 'this'
includes → 'boolean' ✓ (handled)
entries → 'Iterator'
values → 'Iterator'
```

**Missing Object Methods:**
```
Object.assign → 'object'
Object.create → 'object'
Object.freeze → 'object'
Object.seal → 'object'
Object.defineProperty → 'object'
Object.getOwnPropertyNames → 'string[]'
Object.getPrototypeOf → 'object | null'
Object.hasOwnProperty → 'boolean'
JSON.parse → 'any'
JSON.stringify → 'string'
```

**Missing Global Functions:**
```
parseInt → 'number'
parseFloat → 'number'
isNaN → 'boolean'
isFinite → 'boolean'
encodeURIComponent → 'string'
decodeURIComponent → 'string'
eval → 'any'
setTimeout → 'number'
setInterval → 'number'
```

**Missing Array Constructor Arguments:**
```
new Array(5) → 'any[]' (currently not handled)
new Array(1, 2, 3) → 'number[]' (not inferred)
```

### Complex Type Scenarios NOT Handled

1. **Generics**
   ```javascript
   // No support for generic type parameters
   const arr = new Array();
   const map = new Map();
   const set = new Set();
   ```

2. **Union Types**
   ```javascript
   // Can infer 'number | string' but not from multiple branches
   let x = typeof y === 'string' ? 'yes' : 42; // Should be 'string | number'
   ```

3. **Optional Chaining**
   ```javascript
   const value = obj?.prop?.nested; // Returns 'any', should be 'T | undefined'
   ```

4. **Nullish Coalescing**
   ```javascript
   const x = a ?? b; // Type not inferred from either operand
   ```

5. **Callback/Higher-order Functions**
   ```javascript
   function process(callback) {
     return callback(5); // Parameter type 'callback' not refined
   }
   ```

6. **Type Narrowing (in if statements)**
   ```javascript
   if (typeof x === 'string') {
     // x should be narrowed to 'string', but isn't
   }
   ```

---

## 3. SPECIFIC FAILURE EXAMPLES

### Example 1: Template Literals

**Code:**
```javascript
const greeting = `Hello ${name}`;
const computed = `Result: ${x + y}`;
```

**Current Behavior:**
- Both variables inferred as `'any'` (confidence: 0.1)
- Grammar rule: Falls through to `default` case in switch

**Expected:**
- Both should be `'string'` (confidence: 1.0)

### Example 2: Regex Literals

**Code:**
```javascript
const pattern = /test/g;
const validator = /^[a-z]+$/i;
```

**Current Behavior:**
- Both inferred as `'any'`
- Not recognized as regex literals

**Expected:**
- Both should be `'RegExp'` (confidence: 1.0)

### Example 3: Destructuring Assignment

**Code:**
```javascript
const { name, age } = user;
const [first, second, ...rest] = items;
```

**Current Behavior:**
- All variables get `'any'` with confidence 0
- Destructuring patterns not analyzed

**Expected:**
- Infer types from the object/array structure

### Example 4: Unary Expressions

**Code:**
```javascript
const isEmpty = !hasItems;
const negated = -amount;
const stringType = typeof variable;
```

**Current Behavior:**
- `isEmpty`: `'any'` (should be `'boolean'`)
- `negated`: `'any'` (should be `'number'`)
- `stringType`: `'any'` (should be `'string'`)

### Example 5: Ternary/Conditional

**Code:**
```javascript
const result = isActive ? userCount : defaultValue;
const mode = isDev ? 'debug' : 'production';
```

**Current Behavior:**
- Both inferred as `'any'`
- No branch analysis

**Expected:**
- First: union or dominant type from both branches
- Second: `'string'` (both branches are string)

### Example 6: Chained Method Calls

**Code:**
```javascript
const result = str.toUpperCase().replace('A', 'B').split('');
```

**Current Behavior:**
- Partially handled (each method isolated)
- May return `'string'` for final result, but not guaranteed

**Issue:**
- Method calls on intermediate results need return type tracking

### Example 7: Async/Await

**Code:**
```javascript
async function fetchData() {
  const data = await promise;
  return data;
}
```

**Current Behavior:**
- `await` handled (unwraps Promise)
- But Promise type must be explicit in declaration

### Example 8: Spread Operator

**Code:**
```javascript
const merged = [...arr1, ...arr2];
const combined = { ...obj1, ...obj2 };
```

**Current Behavior:**
- Returns generic type (`'any[]'` or `'object'`)
- Individual array/object type not preserved

### Example 9: Optional Chaining

**Code:**
```javascript
const value = user?.profile?.name;
const method = obj?.method?.();
```

**Current Behavior:**
- Not recognized; returns `'any'`

**Should:**
- Return `T | undefined` for property access
- Track the actual property type

---

## 4. SEVERITY CLASSIFICATION

### Critical (Commonly Used)
1. **TemplateLiteral** - Very common in modern JS
2. **Destructuring** - Standard ES6+ pattern
3. **Unary Expressions** - Frequently used (!x, -x, typeof x)
4. **ConditionalExpression** - Common for defaults/alternatives

### High (Important for Real Code)
5. **Optional Chaining** - Modern pattern
6. **Nullish Coalescing** - Modern pattern
7. **Spread Operator** - Common in React/modern JS
8. **Default Parameters** - ES6+ standard

### Medium (Useful to Have)
9. **Classes** - OOP code
10. **Destructuring in parameters** - Clean APIs
11. **Rest parameters** - Variadic functions
12. **RegExp literals** - Pattern matching

### Low (Edge Cases)
13. **BigInt** - Specialized numeric code
14. **Update expressions** - Loop counters
15. **Assignment expressions** - Less common patterns
16. **Sequence expressions** - Rare

---

## 5. IMPACT ON TYPE INFERENCE

### Cascade Failures

When a construct isn't handled, it causes downstream failures:

**Scenario:**
```javascript
const text = `Name: ${user.name}`;  // TemplateLiteral not handled
const words = text.split(' ');       // text type unknown, split inference fails
const count = words.length;          // Can't infer array from text
```

**Result Chain:**
- `text` → `'any'`
- `words` → `'any'` (no method inference on `'any'`)
- `count` → `'any'` (no property inference)

### Confidence Score Impact

- Literal types: confidence 1.0
- Constructor types: confidence 0.9
- Method returns: confidence 0.9
- Inferred from usage: confidence 0.7-0.8
- **Unknown types: confidence 0.1**

When a construct isn't recognized, the entire inference chain gets confidence 0.1, making it unreliable for type propagation.

---

## 6. RECOMMENDATIONS FOR IMPROVEMENT

### Priority 1 (High Impact, Medium Effort)
1. **Add TemplateLiteral handling** → `'string'` type
2. **Add RegExpLiteral handling** → `'RegExp'` type
3. **Add UnaryExpression handling** → type-based return (!→bool, -→num, typeof→string)
4. **Add ConditionalExpression handling** → infer from both branches

### Priority 2 (Medium Impact, Medium Effort)
5. **Add BigIntLiteral** → `'bigint'` type
6. **Extend knownTypes.ts** → Add missing string/array/object methods
7. **Add GlobalFunction handling** → parseInt, parseFloat, JSON methods
8. **Add Spread operator support** → Preserve array/object types

### Priority 3 (Important for Completeness)
9. **Add destructuring support** → Extract types from patterns
10. **Add rest parameter support** → Type as array
11. **Add default parameter handling** → Infer from default value
12. **Add class support** → Track class names as types

### Priority 4 (Nice to Have)
13. **Add optional chaining** → Return `T | undefined`
14. **Add nullish coalescing** → Infer from operands
15. **Add type narrowing** → typeof/instanceof checks
16. **Add generic inference** → Track Map<K,V>, Set<T>, etc.

---

## Summary Table

| Feature | Status | Impact | Effort |
|---------|--------|--------|--------|
| Template Literals | Missing | High | Low |
| RegExp Literals | Missing | Medium | Low |
| Destructuring | Missing | High | Medium |
| Unary Expressions | Partial | Medium | Low |
| Conditional (ternary) | Missing | Medium | Low |
| Optional Chaining | Missing | Medium | Medium |
| Spread Operator | Partial | Medium | Low |
| Default Parameters | Missing | Medium | Low |
| Rest Parameters | Missing | Low | Low |
| Classes | Missing | Low | High |
| BigInt | Missing | Low | Low |
| Update Expressions | Missing | Low | Low |
| Type Narrowing | Missing | Medium | High |
| Generics | Missing | Low | High |

---

## Testing Gaps

The test suite (`src/__tests__/`) covers:
- Basic literals ✓
- Arrays/Objects ✓
- Functions ✓
- Method calls (partial) ✓
- Binary expressions (partial) ✓
- Constructor types ✓

But does NOT cover:
- Template literals
- Regex literals
- Destructuring
- Unary/Conditional expressions
- Optional chaining
- Spread operators
- Type narrowing
- Advanced scenarios

