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
    if (funcInfo.returnType) return funcInfo.returnType;

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
        if (t.isIdentifier(node.callee.object)) {
          const objType = typeMap.get(node.callee.object.name);
          if (objType) {
            return this.inferMethodReturnType(objType.typeName, methodName);
          }
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
   */
  private inferMethodReturnType(objType: string, methodName: string): InferredType | null {
    if (objType === 'string') {
      if (['split'].includes(methodName)) return { typeName: 'string[]', confidence: 0.9 };
      if (['indexOf', 'lastIndexOf', 'search', 'charCodeAt'].includes(methodName)) {
        return { typeName: 'number', confidence: 0.9 };
      }
      return { typeName: 'string', confidence: 0.9 };
    }

    if (objType.includes('[]')) {
      if (['map', 'filter', 'slice', 'concat'].includes(methodName)) {
        return { typeName: objType, confidence: 0.9 };
      }
      if (['join'].includes(methodName)) return { typeName: 'string', confidence: 0.9 };
      if (['every', 'some', 'includes'].includes(methodName)) {
        return { typeName: 'boolean', confidence: 0.9 };
      }
      if (['indexOf', 'findIndex'].includes(methodName)) {
        return { typeName: 'number', confidence: 0.9 };
      }
    }

    return null;
  }

  /**
   * Infer the type of a property access (not a method call)
   */
  private inferPropertyType(objType: string, propertyName: string): InferredType | null {
    // Handle .length property
    if (propertyName === 'length') {
      if (objType === 'string' || objType.includes('[]')) {
        return { typeName: 'number', confidence: 1.0 };
      }
    }

    // Handle common properties
    if (objType === 'string') {
      // String properties that return string
      if (['constructor'].includes(propertyName)) {
        return { typeName: 'Function', confidence: 0.8 };
      }
    }

    if (objType.includes('[]')) {
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
      case 'ArrayExpression':
        return this.inferArrayType(node, typeMap, depth);
      case 'ObjectExpression':
        return { typeName: 'object', confidence: 0.8 };
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.inferFunctionExpressionType(node as any, typeMap, depth);
      case 'CallExpression':
        return this.inferCallType(node, typeMap);
      case 'AwaitExpression':
        return this.inferAwaitType(node as t.AwaitExpression, typeMap, depth);
      case 'NewExpression':
        return this.inferNewExpressionType(node as t.NewExpression, typeMap, depth);
      case 'Identifier':
        return typeMap.get(node.name) || { typeName: 'any', confidence: 0.1 };
      case 'BinaryExpression':
        return this.inferBinaryExpressionType(node, typeMap, depth);
      default:
        return { typeName: 'any', confidence: 0.1 };
    }
  }

  /**
   * Infer array type
   */
  private inferArrayType(node: t.ArrayExpression, typeMap: TypeMap, depth: number): InferredType {
    if (node.elements.length === 0) return { typeName: 'any[]', confidence: 0.7 };

    const firstElement = node.elements[0];
    if (!firstElement) return { typeName: 'any[]', confidence: 0.7 };

    const firstType = this.inferTypeFromNode(firstElement, typeMap, depth);
    if (!firstType || firstType.confidence < 0.7) return { typeName: 'any[]', confidence: 0.8 };

    const allSameType = node.elements.every(el => {
      if (!el) return true;
      const elType = this.inferTypeFromNode(el, typeMap, depth);
      return elType && elType.typeName === firstType.typeName;
    });

    return allSameType
      ? { typeName: `${firstType.typeName}[]`, confidence: 0.9 }
      : { typeName: 'any[]', confidence: 0.8 };
  }

  /**
   * Infer type from call expression
   */
  private inferCallType(node: t.CallExpression, typeMap: TypeMap): InferredType {
    if (t.isIdentifier(node.callee) && knownTypes.has(node.callee.name)) {
      return { typeName: knownTypes.get(node.callee.name)!, confidence: 0.8 };
    }
    return { typeName: 'any', confidence: 0.3 };
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
          if (t.isMemberExpression(init.callee)) {
            if (t.isIdentifier(init.callee.object) && t.isIdentifier(init.callee.property)) {
              const objType = typeMap.get(init.callee.object.name);
              if (objType) {
                inferredType = this.inferMethodReturnType(objType.typeName, init.callee.property.name);
              }
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
              inferredType = this.inferPropertyType(objType.typeName, init.property.name);
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
