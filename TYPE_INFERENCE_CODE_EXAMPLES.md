# Type Inference Gaps - Code Examples

## 1. Missing Literal Types

### Template Literals (Very Common)

**Current Code in TypeCollector:**
```typescript
private inferTypeFromNode(node: t.Node): InferredType | null {
  switch (node.type) {
    case 'StringLiteral':
      return { typeName: 'string', confidence: 1.0 };
    // ... other cases
    default:
      return { typeName: 'any', confidence: 0.1 };  // <- FALLS HERE
  }
}
```

**Missing Code:**
```typescript
case 'TemplateLiteral':
  return { typeName: 'string', confidence: 1.0 };
```

**Affected Code Examples:**
```javascript
const x = `Hello ${name}`;              // Currently: any, Should: string
const y = `Result: ${x + y}`;          // Currently: any, Should: string
const template = `
  <div>
    <p>${title}</p>
  </div>
`;                                       // Currently: any, Should: string
```

---

### RegExp Literals

**Missing Code:**
```typescript
case 'RegExpLiteral':
  return { typeName: 'RegExp', confidence: 1.0 };
```

**Affected Code Examples:**
```javascript
const pattern = /test/g;                // Currently: any, Should: RegExp
const validator = /^[a-z0-9]+$/i;      // Currently: any, Should: RegExp
const emailRegex = /^[\w\.-]+@[\w\.-]+\.\w+$/;  // Currently: any, Should: RegExp
```

---

### BigInt Literals (ES2020)

**Missing Code:**
```typescript
case 'BigIntLiteral':
  return { typeName: 'bigint', confidence: 1.0 };
```

**Affected Code Examples:**
```javascript
const big = 123n;                       // Currently: any, Should: bigint
const large = 999999999999999999999n;   // Currently: any, Should: bigint
const calc = BigInt('9007199254740991'); // Currently: any, Should: bigint
```

---

## 2. Missing Expression Types

### Unary Expressions (Commonly Used)

**Current Issue:**
Falls through to default case, returns `'any'`

**Missing Code in TypeResolver:**
```typescript
case 'UnaryExpression':
  return this.inferUnaryExpressionType(node as t.UnaryExpression, typeMap, depth);

private inferUnaryExpressionType(
  node: t.UnaryExpression,
  typeMap: TypeMap,
  depth: number
): InferredType {
  switch (node.operator) {
    case '!':
      // Boolean negation always returns boolean
      return { typeName: 'boolean', confidence: 0.95 };
    case '-':
    case '+':
      // Unary arithmetic operators return number
      const argType = this.inferTypeFromNode(node.argument, typeMap, depth);
      if (argType?.typeName === 'number') {
        return { typeName: 'number', confidence: 0.95 };
      }
      return { typeName: 'number', confidence: 0.7 };
    case 'typeof':
      // typeof always returns a string
      return { typeName: 'string', confidence: 1.0 };
    case '~':
      // Bitwise NOT returns number
      return { typeName: 'number', confidence: 0.95 };
    case 'delete':
      // delete always returns boolean
      return { typeName: 'boolean', confidence: 1.0 };
    case 'void':
      // void always returns undefined
      return { typeName: 'undefined', confidence: 1.0 };
    default:
      return { typeName: 'any', confidence: 0.1 };
  }
}
```

**Affected Code Examples:**
```javascript
const isEmpty = !hasItems;              // Currently: any, Should: boolean
const negated = -amount;                // Currently: any, Should: number
const typeStr = typeof variable;        // Currently: any, Should: string
const bitwise = ~flags;                 // Currently: any, Should: number
const value = void 0;                   // Currently: any, Should: undefined
```

---

### Conditional/Ternary Expressions (Common)

**Missing Code in TypeResolver:**
```typescript
case 'ConditionalExpression':
  return this.inferConditionalType(node as t.ConditionalExpression, typeMap, depth);

private inferConditionalType(
  node: t.ConditionalExpression,
  typeMap: TypeMap,
  depth: number
): InferredType {
  const consequentType = this.inferTypeFromNode(node.consequent, typeMap, depth);
  const alternateType = this.inferTypeFromNode(node.alternate, typeMap, depth);
  
  // If both branches are the same type
  if (consequentType?.typeName === alternateType?.typeName) {
    return {
      typeName: consequentType!.typeName,
      confidence: Math.min(consequentType!.confidence, alternateType!.confidence) * 0.95
    };
  }
  
  // Different types - return union (if both have high confidence)
  if (consequentType?.confidence > 0.7 && alternateType?.confidence > 0.7) {
    return {
      typeName: `${consequentType!.typeName} | ${alternateType!.typeName}`,
      confidence: 0.7
    };
  }
  
  // Default to dominant type
  const dominant = (consequentType?.confidence ?? 0) > (alternateType?.confidence ?? 0)
    ? consequentType
    : alternateType;
  return dominant || { typeName: 'any', confidence: 0.3 };
}
```

**Affected Code Examples:**
```javascript
const mode = isDev ? 'debug' : 'production';  // Currently: any, Should: string
const timeout = isLocal ? 1000 : 5000;        // Currently: any, Should: number
const status = active ? true : false;         // Currently: any, Should: boolean
const value = x ? y : z;                      // Currently: any, Should: inferred from y/z
```

---

### Logical Expressions (&&, ||)

**Missing Code:**
```typescript
case 'LogicalExpression':
  return this.inferLogicalExpressionType(node as t.LogicalExpression, typeMap, depth);

private inferLogicalExpressionType(
  node: t.LogicalExpression,
  typeMap: TypeMap,
  depth: number
): InferredType {
  const leftType = this.inferTypeFromNode(node.left, typeMap, depth);
  const rightType = this.inferTypeFromNode(node.right, typeMap, depth);
  
  if (node.operator === '||') {
    // x || y returns x if truthy, else y
    // Return union of both types
    if (leftType?.typeName === rightType?.typeName) {
      return leftType || rightType || { typeName: 'any', confidence: 0.3 };
    }
    return {
      typeName: `${leftType?.typeName ?? 'any'} | ${rightType?.typeName ?? 'any'}`,
      confidence: 0.5
    };
  }
  
  if (node.operator === '&&') {
    // x && y returns x if falsy, else y
    // When both are truthy, returns y's type
    return rightType || { typeName: 'any', confidence: 0.3 };
  }
  
  return { typeName: 'any', confidence: 0.1 };
}
```

**Affected Code Examples:**
```javascript
const value = obj || defaultValue;          // Currently: any, Should: union
const count = list && list.length;          // Currently: any, Should: number
const enabled = config?.enabled || false;   // Currently: any, Should: boolean
```

---

## 3. Missing Methods in knownTypes.ts

### Current knownTypes.ts (30 entries):
```typescript
export const knownTypes: Map<string, string> = new Map([
  ['String', 'string'],
  ['Number', 'number'],
  // ... 28 total entries
]);
```

### What Should Be Added

**String Methods (~20 missing):**
```typescript
// String methods (standalone function calls like String.fromCharCode)
['String.fromCharCode', 'string'],
['String.fromCodePoint', 'string'],

// String.prototype methods (used via method inference but good to have)
['String.prototype.charAt', 'string'],
['String.prototype.charCodeAt', 'number'],
['String.prototype.concat', 'string'],
['String.prototype.includes', 'boolean'],
['String.prototype.startsWith', 'boolean'],
['String.prototype.endsWith', 'boolean'],
['String.prototype.indexOf', 'number'],
['String.prototype.lastIndexOf', 'number'],
['String.prototype.padEnd', 'string'],
['String.prototype.padStart', 'string'],
['String.prototype.repeat', 'string'],
['String.prototype.slice', 'string'],
['String.prototype.substring', 'string'],
['String.prototype.substr', 'string'],
['String.prototype.toLocaleLowerCase', 'string'],
['String.prototype.toLocaleUpperCase', 'string'],
['String.prototype.toLowerCase', 'string'],
['String.prototype.toUpperCase', 'string'],
['String.prototype.trim', 'string'],
['String.prototype.trimEnd', 'string'],
['String.prototype.trimStart', 'string'],
```

**Array Methods (~15 missing):**
```typescript
['Array.prototype.at', 'any'],  // Should be T but we don't track generics
['Array.prototype.copyWithin', 'any[]'],
['Array.prototype.flat', 'any[]'],
['Array.prototype.flatMap', 'any[]'],
['Array.prototype.fill', 'any[]'],
['Array.prototype.entries', 'any[]'],  // Iterator, but simplify to any[]
['Array.prototype.keys', 'any[]'],
['Array.prototype.values', 'any[]'],
['Array.prototype.includes', 'boolean'],
['Array.prototype.pop', 'any'],
['Array.prototype.push', 'number'],  // Returns length
['Array.prototype.shift', 'any'],
['Array.prototype.unshift', 'number'],  // Returns length
['Array.prototype.reverse', 'any[]'],
['Array.prototype.sort', 'any[]'],
```

**Object Methods (~10 missing):**
```typescript
['Object.assign', 'object'],
['Object.create', 'object'],
['Object.defineProperty', 'object'],
['Object.defineProperties', 'object'],
['Object.freeze', 'object'],
['Object.seal', 'object'],
['Object.getOwnPropertyDescriptor', 'any'],
['Object.getOwnPropertyDescriptors', 'object'],
['Object.getOwnPropertyNames', 'string[]'],
['Object.getOwnPropertySymbols', 'any[]'],
['Object.getPrototypeOf', 'object | null'],
['Object.setPrototypeOf', 'object'],
['Object.hasOwnProperty', 'boolean'],
['Object.propertyIsEnumerable', 'boolean'],
```

**Global Functions (~15 missing):**
```typescript
['parseInt', 'number'],
['parseFloat', 'number'],
['isNaN', 'boolean'],
['isFinite', 'boolean'],
['encodeURI', 'string'],
['encodeURIComponent', 'string'],
['decodeURI', 'string'],
['decodeURIComponent', 'string'],
['eval', 'any'],
['setTimeout', 'number'],  // Returns timeout ID
['setInterval', 'number'],  // Returns interval ID
['setImmediate', 'number'],  // Node.js
['clearTimeout', 'undefined'],
['clearInterval', 'undefined'],
['clearImmediate', 'undefined'],  // Node.js
```

**JSON Methods:**
```typescript
['JSON.stringify', 'string'],
['JSON.parse', 'any'],
```

**Math Methods:**
```typescript
['Math.abs', 'number'],
['Math.ceil', 'number'],
['Math.floor', 'number'],
['Math.round', 'number'],
['Math.max', 'number'],
['Math.min', 'number'],
['Math.pow', 'number'],
['Math.sqrt', 'number'],
['Math.random', 'number'],
```

---

## 4. Missing AST Node Handlers

### UpdateExpression (++, --)

**Missing Code:**
```typescript
// In TypeResolver.inferTypeFromNode()
case 'UpdateExpression':
  // ++x, --x, x++, x-- all result in a number
  // (or the original type if not numeric)
  return this.inferTypeFromNode(
    (node as t.UpdateExpression).argument,
    typeMap,
    depth
  );
```

**Affected Code Examples:**
```javascript
let count = 0;
count++;  // count should remain 'number'
let i = x;
i++;      // i should retain its type
```

---

### Assignment Expression

**Missing Code:**
```typescript
// Compound assignments that preserve type
case 'AssignmentExpression':
  const assignExpr = node as t.AssignmentExpression;
  if (['+', '-', '*', '/', '%', '**'].includes(assignExpr.operator)) {
    return this.inferTypeFromNode(assignExpr.right, typeMap, depth);
  }
  // ... handle other operators
  break;
```

**Affected Code Examples:**
```javascript
let x = 5;
x += 10;   // x should remain 'number'
let s = 'hello';
s += ' world';  // s should remain 'string'
```

---

### Default Parameters

**Issue:** Parameters with defaults not getting type from default value

**Needed in TypeCollector:**
```typescript
private handleFunctionDeclaration(path: NodePath<t.FunctionDeclaration>, typeMap: TypeMap): void {
  if (path.node.id) {
    const funcName = path.node.id.name;
    // ...
  }
  
  // Handle parameters with defaults
  path.node.params.forEach(param => {
    if (t.isIdentifier(param)) {
      typeMap.set(param.name, { typeName: 'any', confidence: 0 });
    } else if (t.isAssignmentPattern(param)) {  // <- MISSING
      // Parameter has a default value
      if (t.isIdentifier(param.left)) {
        const defaultType = this.inferTypeFromNode(param.right);
        if (defaultType) {
          typeMap.set(param.left.name, defaultType);
        }
      }
    }
  });
}
```

**Affected Code Examples:**
```javascript
function getValue(val = 42) {
  // val should be 'number', currently 'any'
}

function greet(name = 'World') {
  // name should be 'string', currently 'any'
}
```

---

### Rest Parameters

**Needed in TypeCollector:**
```typescript
// Similar to default parameters, but with RestElement
if (t.isRestElement(param)) {
  if (t.isIdentifier(param.argument)) {
    typeMap.set(param.argument.name, { typeName: 'any[]', confidence: 0.7 });
  }
}
```

**Affected Code Examples:**
```javascript
function sum(...numbers) {
  // numbers should be 'any[]', currently 'any'
}

function combine(first, second, ...rest) {
  // rest should be 'any[]', currently 'any'
}
```

---

## 5. Cascade Failure Example

**Code:**
```javascript
function processData(input) {
  const trimmed = input.trim();
  const parts = trimmed.split('|');
  const count = parts.length;
  return count > 0 ? parts[0] : '';
}
```

**Current Inference Chain:**
1. `input` parameter → `any` (no info)
2. `trimmed = input.trim()` → `any` (input is any, method on any returns any)
3. `parts = trimmed.split()` → `any` (trimmed is any, can't infer method)
4. `count = parts.length` → `any` (parts is any, no property inference)
5. Return `count > 0 ? parts[0] : ''` → `any` (count is any, conditional on any)

**Total Loss:** Every variable is `any` despite having inferable types.

**With Missing Features Fixed:**
1. If we can infer `input` type from usage as `string` → `string`
2. `trimmed = input.trim()` → `string` (string method)
3. `parts = trimmed.split()` → `string[]` (split returns string[])
4. `count = parts.length` → `number` (length property)
5. Return → `string` (both branches are string)

**Impact:** 5 variables go from `any` to proper types!

