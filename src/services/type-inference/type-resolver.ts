/**
 * TypeResolver implementation
 * Single Responsibility: Resolving final types from all collected information
 */

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import { ITypeResolver, CallGraphResult } from '../../interfaces';
import { TypeMap, InferredType, TypeInferenceConfig } from '../../types';
import { knownTypes } from '../../known-types';

export class TypeResolver implements ITypeResolver {
  private config: TypeInferenceConfig = { maxDepth: 8, maxTime: 5000 };
  private startTime: number = 0;
  private currentAst: t.File | null = null;

  constructor(config?: Partial<TypeInferenceConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  /**
   * Resolve types using all collected information
   */
  public resolveTypes(
    typeMap: TypeMap,
    usageMap: Map<string, Set<string>>,
    callGraph: CallGraphResult
  ): TypeMap {
    this.startTime = Date.now();

    // Perform iterative type propagation
    const maxIterations = 3;
    for (let i = 0; i < maxIterations; i++) {
      const snapshot = new Map(typeMap);

      // Propagate types across variables through assignments and calls
      this.propagateTypes(typeMap, callGraph);

      // Infer types from call graph
      this.inferTypesFromCallGraph(typeMap, callGraph);

      // Resolve types from usage patterns
      this.resolveFromUsagePatterns(typeMap, usageMap);

      // Check convergence
      if (this.typeMapsEqual(snapshot, typeMap)) {
        break;
      }
    }

    return typeMap;
  }

  /**
   * Set the current AST for variable type updates
   */
  public setCurrentAst(ast: t.File): void {
    this.currentAst = ast;
  }

  /**
   * Infer types from call graph information
   */
  private inferTypesFromCallGraph(typeMap: TypeMap, callGraph: CallGraphResult): void {
    // Update parameter types from call sites
    for (const callSite of callGraph.callSites) {
      const funcInfo = callGraph.functions.get(callSite.callee);
      if (!funcInfo) continue;

      // Re-infer argument types based on current typeMap
      const currentArgTypes = callSite.path.node.arguments.map(arg => {
        if (t.isNode(arg) && !t.isSpreadElement(arg)) {
          return this.inferTypeFromNode(arg, typeMap, 0);
        }
        return null;
      });

      // Update parameter types
      currentArgTypes.forEach((argType, index) => {
        if (argType && index < funcInfo.params.length) {
          const paramName = funcInfo.params[index];
          const currentType = typeMap.get(paramName);

          if (!currentType || argType.confidence > currentType.confidence) {
            typeMap.set(paramName, argType);
          }
        }
      });
    }

    // Infer return types recursively
    const visited = new Set<string>();
    for (const [, funcInfo] of callGraph.functions.entries()) {
      this.inferFunctionReturnType(funcInfo, typeMap, callGraph, 0, visited);
    }

    // Update variable types from all assignments
    this.propagateTypes(typeMap, callGraph);
  }

  /**
   * Recursively infer function return type
   */
  private inferFunctionReturnType(
    funcInfo: any,
    typeMap: TypeMap,
    callGraph: CallGraphResult,
    depth: number,
    visited: Set<string>
  ): InferredType | null {
    // Check limits
    if (depth > this.config.maxDepth) return null;
    if (this.config.maxTime && Date.now() - this.startTime > this.config.maxTime) return null;
    if (visited.has(funcInfo.name)) return null;

    // Only use cached return type if it has high confidence
    // This allows re-evaluation in multi-pass scenarios where variable types improve
    if (funcInfo.returnType && funcInfo.returnType.confidence >= 0.9) {
      return funcInfo.returnType;
    }

    visited.add(funcInfo.name);

    let returnType: InferredType = { typeName: 'void', confidence: 0.5 };
    let hasExplicitReturn = false;

    // Traverse return statements (but don't enter nested functions)
    funcInfo.path.traverse({
      ReturnStatement: (returnPath: any) => {
        hasExplicitReturn = true;
        if (returnPath.node.argument) {
          const argType = this.inferTypeFromNodeRecursive(
            returnPath.node.argument,
            typeMap,
            callGraph,
            depth + 1,
            new Set(visited)
          );

          if (argType && argType.confidence >= returnType.confidence) {
            returnType = argType;
          }
        }
      },
      // Stop traversal at nested functions
      FunctionDeclaration: (path: any) => {
        // Skip if this is the function itself
        if (path.node !== funcInfo.path.node) {
          path.skip();
        }
      },
      FunctionExpression: (path: any) => {
        path.skip();
      },
      ArrowFunctionExpression: (path: any) => {
        path.skip();
      }
    });

    // Only update if we got a better confidence score
    if (!funcInfo.returnType || returnType.confidence > funcInfo.returnType.confidence) {
      funcInfo.returnType = returnType;

      // Update function type in typeMap
      if (typeMap.has(funcInfo.name)) {
        const paramTypes = funcInfo.params.map((p: string) => {
          const type = typeMap.get(p);
          return type ? type.typeName : 'any';
        });

        const typeStr = hasExplicitReturn
          ? `(${paramTypes.join(', ')}) => ${returnType.typeName}`
          : `(${paramTypes.join(', ')}) => void`;

        typeMap.set(funcInfo.name, {
          typeName: typeStr,
          confidence: Math.max(0.6, returnType.confidence)
        });
      }
    }

    visited.delete(funcInfo.name);
    return returnType;
  }

  /**
   * Infer type from node recursively through call graph
   */
  private inferTypeFromNodeRecursive(
    node: t.Node,
    typeMap: TypeMap,
    callGraph: CallGraphResult,
    depth: number,
    visited: Set<string>
  ): InferredType | null {
    if (depth > this.config.maxDepth) {
      return this.inferTypeFromNode(node, typeMap, depth);
    }

    if (this.config.maxTime && Date.now() - this.startTime > this.config.maxTime) {
      return this.inferTypeFromNode(node, typeMap, depth);
    }

    // Handle identifiers that refer to functions (not function calls)
    // This ensures we get the full function type, not just the return type
    if (t.isIdentifier(node)) {
      const funcInfo = callGraph.functions.get(node.name);
      if (funcInfo && !visited.has(node.name)) {
        // This is a reference to a function (not a call), so we need to ensure
        // the function has been analyzed and return its full type signature
        this.inferFunctionReturnType(
          funcInfo,
          typeMap,
          callGraph,
          depth + 1,
          visited
        );
        // Return the full function type from typeMap
        return typeMap.get(node.name) || { typeName: 'any', confidence: 0.1 };
      }
    }

    // Handle call expressions
    if (t.isCallExpression(node)) {
      // Method calls
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        const methodName = node.callee.property.name;

        // Get the object type - either from typeMap or by inferring it recursively
        let objType: InferredType | null = null;

        if (t.isIdentifier(node.callee.object)) {
          // Simple case: obj.method()
          objType = typeMap.get(node.callee.object.name) || null;
        } else {
          // Complex case: (expression).method() - e.g., arr.slice().filter()
          objType = this.inferTypeFromNode(node.callee.object, typeMap, depth + 1);
        }

        if (objType) {
          return this.inferMethodReturnType(objType.typeName, methodName, node, typeMap);
        }
      }
      // Function calls
      else if (t.isIdentifier(node.callee)) {
        const funcName = node.callee.name;

        if (knownTypes.has(funcName)) {
          return { typeName: knownTypes.get(funcName)!, confidence: 0.8 };
        }

        const funcInfo = callGraph.functions.get(funcName);
        if (funcInfo && !visited.has(funcName)) {
          const returnType = this.inferFunctionReturnType(
            funcInfo,
            typeMap,
            callGraph,
            depth + 1,
            visited
          );
          if (returnType) return returnType;
        }
      }
    }

    return this.inferTypeFromNode(node, typeMap, depth);
  }

  /**
   * Infer method return type based on object type and method name
   * @param objType - The type of the object the method is called on
   * @param methodName - The name of the method
   * @param callNode - Optional call expression node (for callback analysis)
   * @param typeMap - Optional type map (for callback analysis)
   */
  private inferMethodReturnType(
    objType: string,
    methodName: string,
    callNode?: t.CallExpression,
    typeMap?: TypeMap
  ): InferredType | null {
    if (objType === 'string') {
      // Methods that return string[]
      if (['split'].includes(methodName)) {
        return { typeName: 'string[]', confidence: 0.9 };
      }
      // Methods that return number
      if (['indexOf', 'lastIndexOf', 'search', 'charCodeAt'].includes(methodName)) {
        return { typeName: 'number', confidence: 0.9 };
      }
      // Methods that return boolean
      if (['startsWith', 'endsWith', 'includes'].includes(methodName)) {
        return { typeName: 'boolean', confidence: 0.9 };
      }
      // All other string methods return string
      return { typeName: 'string', confidence: 0.9 };
    }

    if (objType.includes('[]')) {
      // Extract element type from array type (e.g., "number[]" -> "number")
      const elementType = objType.slice(0, -2);

      // Methods that transform element types based on callback
      if (['map', 'flatMap'].includes(methodName) && callNode && typeMap && callNode.arguments.length > 0) {
        const callback = callNode.arguments[0];

        if (process.env.DEBUG_CALLBACK) {
          console.log('[DEBUG] Checking callback for method:', methodName);
          console.log('[DEBUG] Callback node type:', callback?.type);
          console.log('[DEBUG] Is ArrowFunctionExpression?', t.isArrowFunctionExpression(callback));
        }

        if (callback && (t.isFunctionExpression(callback) || t.isArrowFunctionExpression(callback))) {
          // Analyze callback return type
          const callbackReturnType = this.inferCallbackReturnType(callback, typeMap);

          if (process.env.DEBUG_CALLBACK) {
            console.log('[DEBUG] Callback return type inferred:', callbackReturnType);
          }

          if (callbackReturnType && callbackReturnType.confidence >= 0.5) {
            // map transforms to new element type
            if (methodName === 'map') {
              return {
                typeName: `${callbackReturnType.typeName}[]`,
                confidence: callbackReturnType.confidence * 0.9
              };
            }
            // flatMap also transforms, but result is flattened
            if (methodName === 'flatMap') {
              // If callback returns an array, flatten it
              if (callbackReturnType.typeName.includes('[]')) {
                return {
                  typeName: callbackReturnType.typeName,
                  confidence: callbackReturnType.confidence * 0.9
                };
              }
              // Otherwise, wrap in array
              return {
                typeName: `${callbackReturnType.typeName}[]`,
                confidence: callbackReturnType.confidence * 0.9
              };
            }
          }
        }
      }

      // Methods that return the same array type (including filter)
      if (['map', 'filter', 'slice', 'concat', 'reverse', 'sort', 'flat', 'flatMap'].includes(methodName)) {
        return { typeName: objType, confidence: 0.9 };
      }
      // Methods that return element type | undefined
      if (['pop', 'shift', 'find'].includes(methodName)) {
        return { typeName: `${elementType} | undefined`, confidence: 0.9 };
      }
      // Methods that return string
      if (['join'].includes(methodName)) {
        return { typeName: 'string', confidence: 0.9 };
      }
      // Methods that return boolean
      if (['every', 'some', 'includes'].includes(methodName)) {
        return { typeName: 'boolean', confidence: 0.9 };
      }
      // Methods that return number
      if (['indexOf', 'findIndex', 'push', 'unshift'].includes(methodName)) {
        return { typeName: 'number', confidence: 0.9 };
      }
    }

    if (objType === 'RegExp') {
      // Methods that return boolean
      if (methodName === 'test') {
        return { typeName: 'boolean', confidence: 0.9 };
      }
      // exec returns RegExpExecArray | null
      if (methodName === 'exec') {
        return { typeName: 'RegExpExecArray | null', confidence: 0.9 };
      }
    }

    return null;
  }

  /**
   * Infer the return type of a callback function by analyzing its body
   * @param callback - The callback function (FunctionExpression or ArrowFunctionExpression)
   * @param typeMap - Type map for resolving variable types
   */
  private inferCallbackReturnType(
    callback: t.FunctionExpression | t.ArrowFunctionExpression,
    typeMap: TypeMap
  ): InferredType | null {
    // Arrow function with expression body (e.g., x => x * 2)
    if (t.isArrowFunctionExpression(callback) && !t.isBlockStatement(callback.body)) {
      return this.inferTypeFromNode(callback.body as t.Expression, typeMap, 0);
    }

    // Block statement body - look for return statements
    if (t.isBlockStatement(callback.body)) {
      let returnType: InferredType | null = null;

      for (const stmt of callback.body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument) {
          const argType = this.inferTypeFromNode(stmt.argument, typeMap, 0);
          if (argType && (!returnType || argType.confidence > returnType.confidence)) {
            returnType = argType;
          }
        }
      }

      return returnType;
    }

    return null;
  }

  /**
   * Infer the type of a property access (not a method call)
   */
  private inferPropertyType(objType: InferredType | string, propertyName: string): InferredType | null {
    // Extract typeName string from InferredType if needed
    const typeName = typeof objType === 'string' ? objType : objType.typeName;

    // Check object shape properties first (for object literal shapes)
    if (typeof objType !== 'string' && objType.properties && objType.properties[propertyName]) {
      return objType.properties[propertyName];
    }

    // Handle .length property
    if (propertyName === 'length') {
      if (typeName === 'string' || typeName.includes('[]')) {
        return { typeName: 'number', confidence: 1.0 };
      }
    }

    // Handle common properties
    if (typeName === 'string') {
      // String properties that return string
      if (['constructor'].includes(propertyName)) {
        return { typeName: 'Function', confidence: 0.8 };
      }
    }

    if (typeName.includes('[]')) {
      // Array properties
      if (['constructor'].includes(propertyName)) {
        return { typeName: 'Function', confidence: 0.8 };
      }
    }

    return null;
  }

  /**
   * Basic type inference from node
   */
  private inferTypeFromNode(node: t.Node, typeMap: TypeMap, depth: number): InferredType | null {
    switch (node.type) {
      case 'StringLiteral':
        return { typeName: 'string', confidence: 1.0 };
      case 'NumericLiteral':
        return { typeName: 'number', confidence: 1.0 };
      case 'BooleanLiteral':
        return { typeName: 'boolean', confidence: 1.0 };
      case 'NullLiteral':
        return { typeName: 'null', confidence: 1.0 };
      case 'TemplateLiteral':
        return { typeName: 'string', confidence: 1.0 };
      case 'RegExpLiteral':
        return { typeName: 'RegExp', confidence: 1.0 };
      case 'ArrayExpression':
        return this.inferArrayType(node, typeMap, depth);
      case 'ObjectExpression':
        return { typeName: 'object', confidence: 0.8 };
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.inferFunctionExpressionType(node as any, typeMap, depth);
      case 'CallExpression':
      case 'OptionalCallExpression':
        return this.inferCallType(node as t.CallExpression, typeMap);
      case 'MemberExpression':
      case 'OptionalMemberExpression':
        return this.inferMemberExpressionType(node as t.MemberExpression, typeMap, depth);
      case 'AwaitExpression':
        return this.inferAwaitType(node as t.AwaitExpression, typeMap, depth);
      case 'NewExpression':
        return this.inferNewExpressionType(node as t.NewExpression, typeMap, depth);
      case 'Identifier':
        // Handle special identifier literals like 'undefined'
        if (t.isIdentifier(node) && node.name === 'undefined') {
          return { typeName: 'undefined', confidence: 1.0 };
        }
        return typeMap.get(node.name) || { typeName: 'any', confidence: 0.1 };
      case 'BinaryExpression':
        return this.inferBinaryExpressionType(node, typeMap, depth);
      case 'UnaryExpression':
        return this.inferUnaryExpressionType(node as t.UnaryExpression);
      case 'ConditionalExpression':
        return this.inferConditionalExpressionType(node as t.ConditionalExpression, typeMap, depth);
      case 'LogicalExpression':
        return this.inferLogicalExpressionType(node as t.LogicalExpression, typeMap, depth);
      default:
        return { typeName: 'any', confidence: 0.1 };
    }
  }

  /**
   * Infer array type
   */
  private inferArrayType(node: t.ArrayExpression, typeMap: TypeMap, depth: number): InferredType {
    if (node.elements.length === 0) return { typeName: 'any[]', confidence: 0.7 };

    // Collect all element types, handling spread elements
    const elementTypes: (InferredType | null)[] = [];

    for (const element of node.elements) {
      if (!element) {
        elementTypes.push(null);
        continue;
      }

      if (t.isSpreadElement(element)) {
        // Handle spread element - can look up in typeMap
        let spreadArgType: InferredType | null = null;

        if (t.isIdentifier(element.argument)) {
          // Look up the spread variable in typeMap
          spreadArgType = typeMap.get(element.argument.name) || null;
        } else {
          // Infer from the expression
          spreadArgType = this.inferTypeFromNode(element.argument, typeMap, depth);
        }

        if (spreadArgType && spreadArgType.typeName.endsWith('[]')) {
          // Extract element type from array type (e.g., "number[]" -> "number")
          const elementType = spreadArgType.typeName.slice(0, -2);
          elementTypes.push({ typeName: elementType, confidence: spreadArgType.confidence });
        } else {
          elementTypes.push({ typeName: 'any', confidence: 0.3 });
        }
      } else {
        // Regular element
        const elementType = this.inferTypeFromNode(element, typeMap, depth);
        elementTypes.push(elementType);
      }
    }

    // Find the first valid type
    const firstValidType = elementTypes.find(t => t && t.confidence > 0.7);

    if (firstValidType) {
      // Check if all elements have the same type
      const allSameType = elementTypes.every(elementType => {
        if (!elementType) return true;
        return elementType.typeName === firstValidType.typeName;
      });

      if (allSameType) {
        return { typeName: `${firstValidType.typeName}[]`, confidence: 0.9 };
      }
    }

    return { typeName: 'any[]', confidence: 0.8 };
  }

  /**
   * Infer type from call expression
   */
  private inferCallType(node: t.CallExpression, typeMap: TypeMap): InferredType {
    let baseType: InferredType;
    const isOptional = (node as any).optional || t.isOptionalMemberExpression(node.callee) || (t.isMemberExpression(node.callee) && (node.callee as any).optional);

    // Handle instance method calls (e.g., text.slice(), arr.map())
    if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
      const methodName = node.callee.property.name;

      // Get the object type - either from typeMap or by inferring it recursively
      let objType: InferredType | null = null;

      if (t.isIdentifier(node.callee.object)) {
        // Simple case: obj.method()
        objType = typeMap.get(node.callee.object.name) || null;
      } else {
        // Complex case: (expression).method() - e.g., arr.slice().filter()
        objType = this.inferTypeFromNode(node.callee.object, typeMap, 0);
      }

      if (objType) {
        const methodReturnType = this.inferMethodReturnType(objType.typeName, methodName, node, typeMap);
        if (methodReturnType) {
          baseType = methodReturnType;
          // If optional chaining, create union with undefined
          if (isOptional) {
            const confidence = Math.max(baseType.confidence, 0.7);
            return { typeName: `${baseType.typeName} | undefined`, confidence };
          }
          return baseType;
        }
      }

      // Check if this is a static method call (e.g., Object.keys())
      if (t.isIdentifier(node.callee.object)) {
        const objectName = node.callee.object.name;
        const fullName = `${objectName}.${methodName}`;

        if (knownTypes.has(fullName)) {
          baseType = {
            typeName: knownTypes.get(fullName)!,
            confidence: 0.9
          };
          // If optional chaining, create union with undefined
          if (isOptional) {
            return { typeName: `${baseType.typeName} | undefined`, confidence: 0.9 };
          }
          return baseType;
        }
      }
    }

    // Handle direct function calls
    if (t.isIdentifier(node.callee) && knownTypes.has(node.callee.name)) {
      baseType = { typeName: knownTypes.get(node.callee.name)!, confidence: 0.8 };
      // If optional chaining, create union with undefined
      if (isOptional) {
        return { typeName: `${baseType.typeName} | undefined`, confidence: 0.8 };
      }
      return baseType;
    }

    baseType = { typeName: 'any', confidence: 0.3 };
    // If optional chaining, create union with undefined
    if (isOptional) {
      return { typeName: 'any | undefined', confidence: 0.7 };
    }
    return baseType;
  }

  /**
   * Infer type from binary expression
   */
  private inferBinaryExpressionType(
    node: t.BinaryExpression,
    typeMap: TypeMap,
    depth: number
  ): InferredType {
    if (['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
      if (node.operator === '+') {
        const leftType = this.inferTypeFromNode(node.left, typeMap, depth);
        const rightType = this.inferTypeFromNode(node.right, typeMap, depth);
        if (leftType?.typeName === 'string' || rightType?.typeName === 'string') {
          return { typeName: 'string', confidence: 0.8 };
        }
        return { typeName: 'number', confidence: 0.7 };
      }
      return { typeName: 'number', confidence: 0.9 };
    }

    if (['==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||'].includes(node.operator)) {
      return { typeName: 'boolean', confidence: 0.9 };
    }

    return { typeName: 'any', confidence: 0.3 };
  }

  /**
   * Infer type from unary expression
   */
  private inferUnaryExpressionType(node: t.UnaryExpression): InferredType {
    switch (node.operator) {
      case '!':
        // Logical NOT always returns boolean
        return { typeName: 'boolean', confidence: 1.0 };

      case 'typeof':
        // typeof always returns string
        return { typeName: 'string', confidence: 1.0 };

      case '+':
      case '-':
      case '~':
        // Unary +, -, and bitwise NOT return number
        return { typeName: 'number', confidence: 1.0 };

      case 'void':
        // void always returns undefined
        return { typeName: 'undefined', confidence: 1.0 };

      case 'delete':
        // delete returns boolean
        return { typeName: 'boolean', confidence: 1.0 };

      default:
        return { typeName: 'any', confidence: 0.3 };
    }
  }

  /**
   * Infer type from member expression (property access)
   */
  private inferMemberExpressionType(node: t.MemberExpression, typeMap: TypeMap, depth: number): InferredType {
    // Infer the base object type
    const objectType = this.inferTypeFromNode(node.object, typeMap, depth);

    // Handle known properties
    if (t.isIdentifier(node.property)) {
      const propertyName = node.property.name;

      // Check object shape properties first (for object literal shapes)
      if (objectType && objectType.properties && objectType.properties[propertyName]) {
        const propType = objectType.properties[propertyName];
        // If optional chaining, add undefined to union
        if ((node as any).optional) {
          return {
            typeName: `${propType.typeName} | undefined`,
            confidence: propType.confidence * 0.9
          };
        }
        return propType;
      }

      // Handle .length property
      if (propertyName === 'length') {
        const baseType = { typeName: 'number', confidence: 0.9 };
        // If optional chaining, add undefined to union
        if ((node as any).optional) {
          return { typeName: 'number | undefined', confidence: 0.9 };
        }
        return baseType;
      }
    }

    // Try to infer property type from context
    // For now, we'll use 'any' for unknown properties
    const baseType = { typeName: 'any', confidence: 0.3 };

    // If optional chaining, create union with undefined
    // We directly construct the union to avoid confidence threshold issues
    if ((node as any).optional) {
      return { typeName: 'any | undefined', confidence: 0.7 };
    }

    return baseType;
  }

  /**
   * Create a union type from two inferred types
   * Handles simplification, deduplication, and nested unions
   */
  private createUnionType(type1: InferredType, type2: InferredType): InferredType {
    // If either type has low confidence (<0.7), fall back to any
    if (type1.confidence < 0.7 || type2.confidence < 0.7) {
      return { typeName: 'any', confidence: 0.5 };
    }

    // If both types are the same, simplify (string | string -> string)
    if (type1.typeName === type2.typeName) {
      return {
        typeName: type1.typeName,
        confidence: Math.min(type1.confidence, type2.confidence) * 0.95
      };
    }

    // Split existing union types to flatten nested unions
    const types1 = type1.typeName.includes('|')
      ? type1.typeName.split('|').map(t => t.trim())
      : [type1.typeName];
    const types2 = type2.typeName.includes('|')
      ? type2.typeName.split('|').map(t => t.trim())
      : [type2.typeName];

    // Combine and deduplicate
    const allTypes = [...types1, ...types2];
    const uniqueTypes = Array.from(new Set(allTypes));

    // Limit complexity: if more than 4 types, fall back to any
    if (uniqueTypes.length > 4) {
      return { typeName: 'any', confidence: 0.5 };
    }

    // Create union type string
    const unionTypeName = uniqueTypes.join(' | ');
    const confidence = Math.min(type1.confidence, type2.confidence) * 0.9;

    return { typeName: unionTypeName, confidence };
  }

  /**
   * Infer type from conditional (ternary) expression
   */
  private inferConditionalExpressionType(
    node: t.ConditionalExpression,
    typeMap: TypeMap,
    depth: number
  ): InferredType {
    // Infer types for both branches
    const consequentType = this.inferTypeFromNode(node.consequent, typeMap, depth);
    const alternateType = this.inferTypeFromNode(node.alternate, typeMap, depth);

    // If we couldn't infer either type, return any
    if (!consequentType || !alternateType) {
      return { typeName: 'any', confidence: 0.3 };
    }

    // Create union type or simplify if same type
    return this.createUnionType(consequentType, alternateType);
  }

  /**
   * Infer type from logical expression (||, &&, ??)
   */
  private inferLogicalExpressionType(
    node: t.LogicalExpression,
    typeMap: TypeMap,
    depth: number
  ): InferredType {
    // Infer types for both operands
    const leftType = this.inferTypeFromNode(node.left, typeMap, depth);
    const rightType = this.inferTypeFromNode(node.right, typeMap, depth);

    // If we couldn't infer either type, return any
    if (!leftType || !rightType) {
      return { typeName: 'any', confidence: 0.3 };
    }

    // Create union type or simplify if same type
    return this.createUnionType(leftType, rightType);
  }

  /**
   * Propagate types across variables through assignments, calls, and operations
   * This is called iteratively to refine types across multiple passes
   */
  private propagateTypes(typeMap: TypeMap, callGraph: CallGraphResult): void {
    if (!this.currentAst) return;

    traverse(this.currentAst, {
      VariableDeclarator: (path) => {
        if (!t.isIdentifier(path.node.id) || !path.node.init) return;

        const varName = path.node.id.name;
        const init = path.node.init;
        let inferredType: InferredType | null = null;

        // Case 1: Variable assigned from another variable (const a = b)
        if (t.isIdentifier(init)) {
          const sourceType = typeMap.get(init.name);
          if (sourceType) {
            inferredType = { ...sourceType, confidence: sourceType.confidence * 0.9 };
          }
        }
        // Case 2: Variable assigned from function call (const a = func())
        else if (t.isCallExpression(init)) {
          // Method calls (obj.method())
          if (t.isMemberExpression(init.callee) && t.isIdentifier(init.callee.property)) {
            const methodName = init.callee.property.name;

            // Get the object type - either from typeMap or by inferring it recursively
            let objType: InferredType | null = null;

            if (t.isIdentifier(init.callee.object)) {
              // Simple case: obj.method()
              objType = typeMap.get(init.callee.object.name) || null;
            } else {
              // Complex case: (expression).method() - e.g., arr.slice().filter()
              objType = this.inferTypeFromNode(init.callee.object, typeMap, 0);
            }

            if (objType) {
              inferredType = this.inferMethodReturnType(objType.typeName, methodName, init, typeMap);
            }
          }
          // Function calls (func())
          else if (t.isIdentifier(init.callee)) {
            const funcInfo = callGraph.functions.get(init.callee.name);
            if (funcInfo?.returnType) {
              inferredType = funcInfo.returnType;
            }
          }
          // Handle IIFEs
          else if (t.isFunctionExpression(init.callee) || t.isArrowFunctionExpression(init.callee)) {
            inferredType = this.inferIIFEReturnType(init, typeMap);
          }
        }
        // Case 3: Variable assigned from await expression (const a = await promise)
        else if (t.isAwaitExpression(init)) {
          const awaitedType = this.inferTypeFromNode(init.argument, typeMap, 0);
          if (awaitedType) {
            // Unwrap Promise<T> to T
            const promiseMatch = awaitedType.typeName.match(/^Promise<(.+)>$/);
            if (promiseMatch) {
              inferredType = {
                typeName: promiseMatch[1],
                confidence: awaitedType.confidence * 0.95
              };
            } else {
              // If not a Promise type, use as-is
              inferredType = awaitedType;
            }
          }
        }
        // Case 4: Variable assigned from binary expression (const s = "a" + b)
        else if (t.isBinaryExpression(init)) {
          inferredType = this.inferBinaryExpressionType(init, typeMap, 0);
        }
        // Case 5: Variable assigned from member expression (const x = obj.prop)
        else if (t.isMemberExpression(init)) {
          if (t.isIdentifier(init.object) && t.isIdentifier(init.property)) {
            const objType = typeMap.get(init.object.name);
            if (objType) {
              // This is property access, not a method call
              // Pass full InferredType to enable object shape property access
              inferredType = this.inferPropertyType(objType, init.property.name);
            }
          }
        }
        // Case 6: Any other expression type
        else {
          inferredType = this.inferTypeFromNode(init, typeMap, 0);
        }

        // Update type map if we inferred a better type
        if (inferredType) {
          const currentType = typeMap.get(varName);
          if (!currentType || inferredType.confidence > currentType.confidence) {
            typeMap.set(varName, inferredType);
          }
        }
      }
    });
  }

  /**
   * Infer return type from IIFE
   */
  private inferIIFEReturnType(callExpr: t.CallExpression, typeMap: TypeMap): InferredType {
    const funcExpr = callExpr.callee as t.FunctionExpression | t.ArrowFunctionExpression;
    let returnType: InferredType = { typeName: 'void', confidence: 0.5 };

    // Infer parameter types from arguments
    const paramTypes = callExpr.arguments.map(arg => {
      if (t.isNode(arg) && !t.isSpreadElement(arg)) {
        return this.inferTypeFromNode(arg, typeMap, 0);
      }
      return null;
    });

    // Set parameter types
    funcExpr.params.forEach((param, index) => {
      if (t.isIdentifier(param) && paramTypes[index]) {
        typeMap.set(param.name, paramTypes[index]!);
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left) && paramTypes[index]) {
        // Handle default parameters
        typeMap.set(param.left.name, paramTypes[index]!);
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        // Handle rest parameters - always any[]
        typeMap.set(param.argument.name, { typeName: 'any[]', confidence: 0.8 });
      }
    });

    // Analyze return statements
    if (t.isArrowFunctionExpression(funcExpr) && funcExpr.expression && funcExpr.body) {
      returnType = this.inferTypeFromNode(funcExpr.body as t.Expression, typeMap, 0) || returnType;
    } else if (t.isBlockStatement(funcExpr.body)) {
      for (const stmt of funcExpr.body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument) {
          const argType = this.inferTypeFromNode(stmt.argument, typeMap, 0);
          if (argType && argType.confidence > returnType.confidence) {
            returnType = argType;
          }
        }
      }
    }

    return returnType;
  }

  /**
   * Resolve types from usage patterns
   */
  private resolveFromUsagePatterns(typeMap: TypeMap, usageMap: Map<string, Set<string>>): void {
    for (const [name, usages] of usageMap.entries()) {
      if (!typeMap.has(name)) continue;

      const currentType = typeMap.get(name)!;
      if (currentType.confidence >= 0.95) continue;

      let inferredType: InferredType | null = null;

      if (usages.has('number') && !usages.has('string') && !usages.has('array')) {
        inferredType = { typeName: 'number', confidence: 0.8 };
      } else if (usages.has('string') && !usages.has('array')) {
        inferredType = { typeName: 'string', confidence: 0.8 };
      } else if (usages.has('array')) {
        inferredType = { typeName: 'any[]', confidence: 0.8 };
      } else if (usages.has('boolean')) {
        inferredType = { typeName: 'boolean', confidence: 0.8 };
      } else if (usages.has('number|string')) {
        if (currentType.confidence >= 0.8 && currentType.typeName === 'number') {
          continue;
        }
        if (usages.has('number') || (usages.size === 1 && currentType.typeName === 'number')) {
          inferredType = { typeName: 'number', confidence: 0.7 };
        } else {
          inferredType = { typeName: 'number | string', confidence: 0.5 };
        }
      }

      if (inferredType && inferredType.confidence > currentType.confidence) {
        typeMap.set(name, inferredType);
      }
    }
  }

  /**
   * Infer type from await expression (unwrap Promise)
   */
  private inferAwaitType(node: t.AwaitExpression, typeMap: TypeMap, depth: number): InferredType | null {
    const argType = this.inferTypeFromNode(node.argument, typeMap, depth);
    if (!argType) return { typeName: 'any', confidence: 0.1 };

    // Unwrap Promise<T> to T
    const promiseMatch = argType.typeName.match(/^Promise<(.+)>$/);
    if (promiseMatch) {
      return { typeName: promiseMatch[1], confidence: argType.confidence * 0.9 };
    }

    // If it's not a Promise type, return as-is (might be 'any' or unknown)
    return argType;
  }

  /**
   * Infer type from new expression (e.g., new Promise, new Date)
   */
  private inferNewExpressionType(node: t.NewExpression, typeMap: TypeMap, depth: number): InferredType {
    // Check if this is a Promise constructor
    if (t.isIdentifier(node.callee) && node.callee.name === 'Promise') {
      // new Promise((resolve, reject) => { ... })
      const executor = node.arguments[0];

      if (executor && (t.isFunctionExpression(executor) || t.isArrowFunctionExpression(executor))) {
        // Try to infer the type passed to resolve
        const resolveParam = executor.params[0];

        if (resolveParam && t.isIdentifier(resolveParam)) {
          const resolveName = resolveParam.name;
          let resolvedType: InferredType = { typeName: 'any', confidence: 0.5 };

          // Traverse the executor function to find calls to resolve
          traverse(executor, {
            CallExpression: (callPath: any) => {
              if (t.isIdentifier(callPath.node.callee) &&
                  callPath.node.callee.name === resolveName &&
                  callPath.node.arguments.length > 0) {
                // Found a call to resolve(value)
                const arg = callPath.node.arguments[0];
                const argType = this.inferTypeFromNode(arg, typeMap, depth + 1);
                if (argType && argType.confidence > resolvedType.confidence) {
                  resolvedType = argType;
                }
              }
            },
            noScope: true
          });

          return {
            typeName: `Promise<${resolvedType.typeName}>`,
            confidence: Math.max(0.7, resolvedType.confidence * 0.9)
          };
        }
      }

      // Fallback for Promise constructor
      return { typeName: 'Promise<any>', confidence: 0.6 };
    }

    // Handle other known constructors
    if (t.isIdentifier(node.callee)) {
      const constructorName = node.callee.name;

      // Known constructors
      const knownConstructors: Record<string, string> = {
        'Date': 'Date',
        'Error': 'Error',
        'RegExp': 'RegExp',
        'Map': 'Map<any, any>',
        'Set': 'Set<any>',
        'WeakMap': 'WeakMap<any, any>',
        'WeakSet': 'WeakSet<any>'
      };

      if (knownConstructors[constructorName]) {
        return { typeName: knownConstructors[constructorName], confidence: 0.9 };
      }

      // Unknown constructor - return the constructor name as type
      return { typeName: constructorName, confidence: 0.7 };
    }

    return { typeName: 'object', confidence: 0.5 };
  }

  /**
   * Infer type from function expression
   * Returns the function type itself, not what it returns
   */
  private inferFunctionExpressionType(
    node: t.FunctionExpression | t.ArrowFunctionExpression,
    typeMap: TypeMap,
    depth: number
  ): InferredType {
    // Get parameter types
    const paramTypes = node.params.map(param => {
      if (t.isIdentifier(param)) {
        const type = typeMap.get(param.name);
        return type ? type.typeName : 'any';
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        // Handle default parameters
        const type = typeMap.get(param.left.name);
        return type ? type.typeName : 'any';
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        // Handle rest parameters
        const type = typeMap.get(param.argument.name);
        return type ? type.typeName : 'any[]';
      }
      return 'any';
    });

    // Try to infer return type from the function body
    let returnType: InferredType = { typeName: 'any', confidence: 0.5 };

    if (t.isBlockStatement(node.body)) {
      // Look for return statements
      for (const stmt of node.body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument) {
          const argType = this.inferTypeFromNode(stmt.argument, typeMap, depth + 1);
          if (argType && argType.confidence > returnType.confidence) {
            returnType = argType;
          }
        }
      }
    } else {
      // Arrow function with expression body
      returnType = this.inferTypeFromNode(node.body, typeMap, depth + 1) || returnType;
    }

    const typeStr = `(${paramTypes.join(', ')}) => ${returnType.typeName}`;
    return { typeName: typeStr, confidence: 0.8 };
  }

  /**
   * Check if two type maps are equal
   */
  private typeMapsEqual(map1: TypeMap, map2: TypeMap): boolean {
    if (map1.size !== map2.size) return false;

    for (const [key, value1] of map1.entries()) {
      const value2 = map2.get(key);
      if (!value2 || value1.typeName !== value2.typeName || value1.confidence !== value2.confidence) {
        return false;
      }
    }

    return true;
  }
}
