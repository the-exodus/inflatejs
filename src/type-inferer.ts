import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { InferredType, TypeMap, ITypeInferer, InferTypeFromNode, InferFunctionReturnType, FunctionInfo, CallSite, TypeInferenceConfig } from './types';
import { knownTypes } from './known-types';

/**
 * Analyzes code patterns to infer types for variables and parameters
 */
export class TypeInferer implements ITypeInferer {
  // Map variables and parameters to their inferred types
  private typeMap: TypeMap = new Map();
  // Map to keep track of how values are used in operations
  private usageMap: Map<string, Set<string>> = new Map();
  // Call graph: functions and their relationships
  private functionGraph: Map<string, FunctionInfo> = new Map();
  // All call sites in the program
  private callSites: CallSite[] = [];
  // Configuration for depth limiting
  private config: TypeInferenceConfig = { maxDepth: 8, maxTime: 5000 };
  // Start time for timeout detection
  private startTime: number = 0;
  // Reference to current AST being analyzed
  private currentAst: t.File | null = null;

  /**
   * Analyze the AST to infer types for variables and parameters
   */
  public inferTypes(ast: t.File): TypeMap {
    this.typeMap.clear();
    this.usageMap.clear();
    this.functionGraph.clear();
    this.callSites = [];
    this.startTime = Date.now();
    this.currentAst = ast;

    // First pass: collect variable declarations and initial values
    this.collectDeclarations(ast);

    // Second pass: build call graph
    this.buildCallGraph(ast);

    // Third pass: analyze variable usages
    this.analyzeUsages(ast);

    // Fourth pass: perform inter-procedural type inference iteratively
    // Run multiple iterations to propagate types through the call graph
    const maxIterations = 3;
    for (let i = 0; i < maxIterations; i++) {
      const typeMapSnapshot = new Map(this.typeMap);
      this.inferTypesFromCallGraph();
      this.resolveTypes();

      // Check if types have converged
      if (this.typeMapsEqual(typeMapSnapshot, this.typeMap)) {
        break;
      }
    }

    return this.typeMap;
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

  /**
   * First pass: collect variable declarations and initial values
   */
  private collectDeclarations(ast: t.File): void {
    traverse(ast, {
      VariableDeclarator: this.handleVariableDeclarator.bind(this),
      FunctionDeclaration: this.handleFunctionDeclaration.bind(this),
      FunctionExpression: this.handleFunctionExpression.bind(this),
      ArrowFunctionExpression: this.handleArrowFunctionExpression.bind(this)
    });
  }

  /**
   * Function to handle variable declarators
   */
  private handleVariableDeclarator(path: NodePath<t.VariableDeclarator>): void {
    if (t.isIdentifier(path.node.id)) {
      const varName = path.node.id.name;
      this.typeMap.set(varName, { typeName: 'any', confidence: 0 });
      if (path.node.init) {
        const inferredType = this.inferTypeFromNode(path.node.init, 0);
        if (inferredType) {
          this.typeMap.set(varName, inferredType);
        }
      }
    }
  }

  /**
   * Function to handle function declarations
   */
  private handleFunctionDeclaration(path: NodePath<t.FunctionDeclaration>): void {
    if (path.node.id) {
      const funcName = path.node.id.name;
      this.typeMap.set(funcName, { typeName: '(...args: any[]) => any', confidence: 0.7 });
      path.node.params.forEach(param => {
        if (t.isIdentifier(param)) {
          this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
        }
      });
      this.inferFunctionReturnType(path);
    }
  }

  /**
   * Function to handle function expressions
   */
  private handleFunctionExpression(path: NodePath<t.FunctionExpression>): void {
    path.node.params.forEach(param => {
      if (t.isIdentifier(param)) {
        this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
      }
    });
    this.inferFunctionReturnType(path);
  }

  /**
   * Function to handle arrow function expressions
   */
  private handleArrowFunctionExpression(path: NodePath<t.ArrowFunctionExpression>): void {
    path.node.params.forEach(param => {
      if (t.isIdentifier(param)) {
        this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
      }
    });
    this.inferFunctionReturnType(path);
  }

  /**
   * Second pass: analyze how variables are used
   */
  private analyzeUsages(ast: t.File): void {
    traverse(ast, {
      Identifier: this.handleIdentifier.bind(this),
      CallExpression: this.handleCallExpression.bind(this)
    });
  }

  /**
   * Function to handle identifier nodes
   */
  private handleIdentifier(path: NodePath<t.Identifier>): void {
    const name = path.node.name;
    if (path.isReferencedIdentifier() && this.typeMap.has(name)) {
      const parent = path.parent;
      if (t.isBinaryExpression(parent) && ['+', '-', '*', '/', '%', '**'].includes(parent.operator)) {
        // For + operator, check if the result is used in a numeric context
        if (parent.operator === '+') {
          // Check if the parent binary expression is part of a numeric operation
          const grandParent = path.parentPath?.parent;
          if (grandParent && t.isBinaryExpression(grandParent) && ['*', '/', '-', '%', '**'].includes(grandParent.operator)) {
            // If the result of + is used in numeric operation, it's likely number
            this.addUsage(name, 'number');
          } else {
            this.addUsage(name, 'number|string');
          }
        } else {
          this.addUsage(name, 'number');
        }
      }
      if (t.isMemberExpression(parent) && parent.object === path.node && t.isNumericLiteral(parent.property)) {
        this.addUsage(name, 'array');
      }
      if (t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
        const methodName = parent.property.name;
        if (this.isStringMethod(methodName)) {
          this.addUsage(name, 'string');
        } else if (this.isArrayMethod(methodName)) {
          this.addUsage(name, 'array');
        }
      }
      if (t.isBinaryExpression(parent) && ['==', '===', '!=', '!==', '>', '<', '>=', '<='].includes(parent.operator)) {
        const otherSide = parent.left === path.node ? parent.right : parent.left;
        if (t.isStringLiteral(otherSide)) {
          this.addUsage(name, 'string');
        } else if (t.isNumericLiteral(otherSide)) {
          this.addUsage(name, 'number');
        } else if (t.isBooleanLiteral(otherSide)) {
          this.addUsage(name, 'boolean');
        }
      }
    }
  }

  /**
   * Function to handle call expressions
   */
  private handleCallExpression(path: NodePath<t.CallExpression>): void {
    const callee = path.node.callee;
    if (t.isIdentifier(callee) && this.typeMap.has(callee.name)) {
      path.node.arguments.forEach((arg, index) => {
        if (t.isIdentifier(arg)) {
          const paramType = this.inferTypeFromNode(arg);
          if (paramType && paramType.confidence > 0.5) {
            if (this.typeMap.has(arg.name)) {
              const currentType = this.typeMap.get(arg.name)!;
              if (paramType.confidence > currentType.confidence) {
                this.typeMap.set(arg.name, paramType);
              }
            }
          }
        }
      });
    }
  }

  /**
   * Build call graph by finding all function definitions and call sites
   */
  private buildCallGraph(ast: t.File): void {
    // First, collect all function definitions
    traverse(ast, {
      FunctionDeclaration: (path) => {
        if (path.node.id) {
          const funcName = path.node.id.name;
          const params = path.node.params
            .filter(p => t.isIdentifier(p))
            .map(p => (p as t.Identifier).name);

          this.functionGraph.set(funcName, {
            name: funcName,
            path,
            params,
            callees: new Set(),
            callers: new Set()
          });
        }
      }
    });

    // Second, collect all call sites and build relationships
    traverse(ast, {
      CallExpression: (path) => {
        const callee = path.node.callee;
        if (t.isIdentifier(callee)) {
          const calleeName = callee.name;

          // Record argument types at this call site
          const argumentTypes = path.node.arguments.map(arg => {
            if (t.isNode(arg) && !t.isSpreadElement(arg)) {
              return this.inferTypeFromNode(arg, 0);
            }
            return null;
          });

          this.callSites.push({
            callee: calleeName,
            argumentTypes,
            path
          });

          // Update call graph relationships
          const parentFunc = this.findContainingFunction(path);
          if (parentFunc && this.functionGraph.has(parentFunc)) {
            this.functionGraph.get(parentFunc)!.callees.add(calleeName);
            if (this.functionGraph.has(calleeName)) {
              this.functionGraph.get(calleeName)!.callers.add(parentFunc);
            }
          }
        }
      }
    });
  }

  /**
   * Find the name of the function containing this path
   */
  private findContainingFunction(path: NodePath): string | null {
    let current = path.parentPath;
    while (current) {
      if (current.isFunctionDeclaration() && current.node.id) {
        return current.node.id.name;
      }
      current = current.parentPath;
    }
    return null;
  }

  /**
   * Perform inter-procedural type inference using the call graph
   */
  private inferTypesFromCallGraph(): void {
    // Infer parameter types from call sites
    for (const callSite of this.callSites) {
      const funcInfo = this.functionGraph.get(callSite.callee);
      if (!funcInfo) continue;

      // Re-infer argument types based on current typeMap state
      const currentArgTypes = callSite.path.node.arguments.map(arg => {
        if (t.isNode(arg) && !t.isSpreadElement(arg)) {
          return this.inferTypeFromNode(arg, 0);
        }
        return null;
      });

      // For each argument, try to infer the corresponding parameter type
      currentArgTypes.forEach((argType, index) => {
        if (argType && index < funcInfo.params.length) {
          const paramName = funcInfo.params[index];
          const currentType = this.typeMap.get(paramName);

          // Update if we have higher confidence or no type yet
          if (!currentType || argType.confidence > currentType.confidence) {
            this.typeMap.set(paramName, argType);
          }
        }
      });
    }

    // Infer return types by traversing the call graph
    const visited = new Set<string>();
    for (const [funcName, funcInfo] of this.functionGraph.entries()) {
      this.inferFunctionReturnTypeRecursive(funcInfo, 0, visited);
    }

    // Update variable types based on function return types
    this.updateVariableTypesFromCallExpressions();
  }

  /**
   * Update variable types based on function return types
   */
  private updateVariableTypesFromCallExpressions(): void {
    if (!this.currentAst) return;

    traverse(this.currentAst, {
      VariableDeclarator: (path) => {
        if (t.isIdentifier(path.node.id) && t.isCallExpression(path.node.init)) {
          const varName = path.node.id.name;
          const callExpr = path.node.init;

          // Handle regular function calls
          if (t.isIdentifier(callExpr.callee)) {
            const funcName = callExpr.callee.name;
            const funcInfo = this.functionGraph.get(funcName);

            if (funcInfo && funcInfo.returnType) {
              const currentType = this.typeMap.get(varName);
              // Update if we have a better return type
              if (!currentType || funcInfo.returnType.confidence > currentType.confidence) {
                this.typeMap.set(varName, funcInfo.returnType);
              }
            }
          }
          // Handle IIFEs (Immediately Invoked Function Expressions)
          else if (t.isFunctionExpression(callExpr.callee) || t.isArrowFunctionExpression(callExpr.callee)) {
            const funcExpr = callExpr.callee;
            let returnType: InferredType = { typeName: 'void', confidence: 0.5 };

            // First, infer parameter types from arguments
            const paramTypes = callExpr.arguments.map(arg => {
              if (t.isNode(arg) && !t.isSpreadElement(arg)) {
                return this.inferTypeFromNode(arg, 0);
              }
              return null;
            });

            // Set parameter types temporarily
            funcExpr.params.forEach((param, index) => {
              if (t.isIdentifier(param) && paramTypes[index]) {
                this.typeMap.set(param.name, paramTypes[index]!);
              }
            });

            // Analyze the IIFE's return statements
            if (t.isFunctionExpression(funcExpr) || t.isArrowFunctionExpression(funcExpr)) {
              if (t.isArrowFunctionExpression(funcExpr) && funcExpr.expression && funcExpr.body) {
                // Arrow function with expression body
                returnType = this.inferTypeFromNode(funcExpr.body as t.Expression, 0) || returnType;
              } else if (t.isBlockStatement(funcExpr.body)) {
                // Function with block body - check return statements
                for (const stmt of funcExpr.body.body) {
                  if (t.isReturnStatement(stmt) && stmt.argument) {
                    const argType = this.inferTypeFromNode(stmt.argument, 0);
                    if (argType && argType.confidence > returnType.confidence) {
                      returnType = argType;
                    }
                  }
                }
              }
            }

            const currentType = this.typeMap.get(varName);
            if (!currentType || returnType.confidence > currentType.confidence) {
              this.typeMap.set(varName, returnType);
            }
          }
        }
      }
    });
  }

  /**
   * Recursively infer function return types following the call graph
   */
  private inferFunctionReturnTypeRecursive(
    funcInfo: FunctionInfo,
    depth: number,
    visited: Set<string>
  ): InferredType | null {
    // Check timeout
    if (this.config.maxTime && Date.now() - this.startTime > this.config.maxTime) {
      return null;
    }

    // Check depth limit
    if (depth > this.config.maxDepth) {
      return null;
    }

    // Check for cycles
    if (visited.has(funcInfo.name)) {
      return null;
    }

    // If we already computed this function's return type, use it
    if (funcInfo.returnType) {
      return funcInfo.returnType;
    }

    visited.add(funcInfo.name);

    let returnType: InferredType = { typeName: 'void', confidence: 0.5 };
    let hasExplicitReturn = false;

    // Traverse all return statements in the function
    funcInfo.path.traverse({
      ReturnStatement: (returnPath) => {
        hasExplicitReturn = true;
        if (returnPath.node.argument) {
          const argType = this.inferTypeFromNodeRecursive(
            returnPath.node.argument,
            depth + 1,
            new Set(visited)
          );

          if (argType && argType.confidence > returnType.confidence) {
            returnType = argType;
          }
        }
      }
    });

    // Store the inferred return type
    funcInfo.returnType = returnType;

    // Update function type in typeMap
    if (this.typeMap.has(funcInfo.name)) {
      const paramTypes = funcInfo.params.map(p => {
        const type = this.typeMap.get(p);
        return type ? type.typeName : 'any';
      });

      const typeStr = hasExplicitReturn
        ? `(${paramTypes.join(', ')}) => ${returnType.typeName}`
        : `(${paramTypes.join(', ')}) => void`;

      this.typeMap.set(funcInfo.name, {
        typeName: typeStr,
        confidence: Math.max(0.6, returnType.confidence)
      });
    }

    visited.delete(funcInfo.name);
    return returnType;
  }

  /**
   * Infer type from a node, recursively following function calls
   */
  private inferTypeFromNodeRecursive(
    node: t.Node,
    depth: number,
    visited: Set<string>
  ): InferredType | null {
    // Check limits
    if (depth > this.config.maxDepth) {
      return this.inferTypeFromNode(node, depth);
    }

    if (this.config.maxTime && Date.now() - this.startTime > this.config.maxTime) {
      return this.inferTypeFromNode(node, depth);
    }

    // If it's a call expression, try to get the return type of the called function
    if (t.isCallExpression(node)) {
      // Handle member expression calls (e.g., str.toUpperCase())
      if (t.isMemberExpression(node.callee) && t.isIdentifier(node.callee.property)) {
        const methodName = node.callee.property.name;

        // Check if the object has a known type
        if (t.isIdentifier(node.callee.object)) {
          const objName = node.callee.object.name;
          const objType = this.typeMap.get(objName);

          // Infer return type based on method and object type
          if (objType) {
            if (objType.typeName === 'string' && this.isStringMethod(methodName)) {
              // Most string methods return string
              if (['split'].includes(methodName)) {
                return { typeName: 'string[]', confidence: 0.9 };
              } else if (['indexOf', 'lastIndexOf', 'search', 'charCodeAt'].includes(methodName)) {
                return { typeName: 'number', confidence: 0.9 };
              } else {
                return { typeName: 'string', confidence: 0.9 };
              }
            } else if (objType.typeName.includes('[]') && this.isArrayMethod(methodName)) {
              // Array methods
              if (['map', 'filter', 'slice', 'concat'].includes(methodName)) {
                return { typeName: objType.typeName, confidence: 0.9 };
              } else if (['join'].includes(methodName)) {
                return { typeName: 'string', confidence: 0.9 };
              } else if (['every', 'some', 'includes'].includes(methodName)) {
                return { typeName: 'boolean', confidence: 0.9 };
              } else if (['indexOf', 'findIndex'].includes(methodName)) {
                return { typeName: 'number', confidence: 0.9 };
              }
            }
          }
        }
      }
      // Handle regular function calls
      else if (t.isIdentifier(node.callee)) {
        const funcName = node.callee.name;

        // Check if it's a known type
        if (knownTypes.has(funcName)) {
          return {
            typeName: knownTypes.get(funcName)!,
            confidence: 0.8
          };
        }

        // Try to infer from function definition
        const funcInfo = this.functionGraph.get(funcName);
        if (funcInfo && !visited.has(funcName)) {
          const returnType = this.inferFunctionReturnTypeRecursive(
            funcInfo,
            depth + 1,
            visited
          );
          if (returnType) {
            return returnType;
          }
        }
      }
    }

    // Otherwise use standard inference
    return this.inferTypeFromNode(node, depth);
  }

  /**
   * Function to add usage information
   */
  private addUsage(name: string, usage: string): void {
    if (!this.usageMap.has(name)) {
      this.usageMap.set(name, new Set());
    }
    this.usageMap.get(name)!.add(usage);
  }

  /**
   * Function to check if a method is a string method
   */
  private isStringMethod(methodName: string): boolean {
    const stringMethods = ['charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 'match', 'replace', 'search', 'slice', 'split', 'substr', 'substring', 'toLowerCase', 'toUpperCase', 'trim'];
    return stringMethods.includes(methodName);
  }

  /**
   * Function to check if a method is an array method
   */
  private isArrayMethod(methodName: string): boolean {
    const arrayMethods = ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes', 'indexOf', 'join', 'keys', 'map', 'pop', 'push', 'reduce', 'reverse', 'shift', 'slice', 'some', 'sort', 'splice', 'unshift'];
    return arrayMethods.includes(methodName);
  }

  /**
   * Third pass: resolve types based on collected information
   */
  private resolveTypes(): void {
    // Iterate through all variables in usageMap to update their types
    for (const [name, usages] of this.usageMap.entries()) {
      if (this.typeMap.has(name)) {
        let inferredType: InferredType = { typeName: 'any', confidence: 0 };
        const currentType = this.typeMap.get(name)!;

        // Don't override high-confidence types from call sites
        if (currentType.confidence >= 0.95) {
          continue;
        }

        if (usages.has('number') && !usages.has('string') && !usages.has('array')) {
          inferredType = { typeName: 'number', confidence: 0.8 };
        } else if (usages.has('string') && !usages.has('array')) {
          inferredType = { typeName: 'string', confidence: 0.8 };
        } else if (usages.has('array')) {
          inferredType = { typeName: 'any[]', confidence: 0.8 };
        } else if (usages.has('boolean')) {
          inferredType = { typeName: 'boolean', confidence: 0.8 };
        } else if (usages.has('number|string')) {
          // If we have a strong type already from call sites, prefer that
          if (currentType.confidence >= 0.8 && currentType.typeName === 'number') {
            continue;
          }
          // If we only have the ambiguous + operator, check if all other evidence points to number
          if (usages.has('number') || (usages.size === 1 && currentType.typeName === 'number')) {
            inferredType = { typeName: 'number', confidence: 0.7 };
          } else {
            inferredType = { typeName: 'number | string', confidence: 0.5 };
          }
        }

        // Only update if we have a higher confidence
        if (inferredType.confidence > currentType.confidence) {
          this.typeMap.set(name, inferredType);
        }
      }
    }
  }

  /**
   * Infer the return type of a function from its contents
   */
  private inferFunctionReturnType: InferFunctionReturnType = (path, depth = 0) => {
    // Check for explicit returns
    let returnType: InferredType = { typeName: 'void', confidence: 0.5 };
    let hasExplicitReturn = false;

    // Visit all return statements
    path.traverse({
      ReturnStatement: (returnPath) => {
        hasExplicitReturn = true;
        if (returnPath.node.argument) {
          const argumentType = this.inferTypeFromNode(returnPath.node.argument, depth);
          if (argumentType && argumentType.confidence > returnType.confidence) {
            returnType = argumentType;
          }
        }
      }
    });

    // If function has a name (FunctionDeclaration), update its return type
    if (path.isFunctionDeclaration() && path.node.id) {
      const funcName = path.node.id.name;
      if (this.typeMap.has(funcName)) {
        const params = path.node.params.map(() => 'any').join(', ');
        const typeStr = hasExplicitReturn
          ? `(${params}) => ${returnType.typeName}`
          : `(${params}) => void`;

        this.typeMap.set(funcName, {
          typeName: typeStr,
          confidence: Math.max(0.6, returnType.confidence)
        });
      }
    }
  }

  /**
   * Infer type from a node based on its structure
   */
  private inferTypeFromNode: InferTypeFromNode = (node, depth = 0) => {
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
        // Try to infer array element type if all elements are the same type
        if (node.elements.length > 0) {
          // Check the first element's type
          const firstElementType = node.elements[0]
            ? this.inferTypeFromNode(node.elements[0], depth)
            : null;

          if (firstElementType && firstElementType.confidence > 0.7) {
            // Check if all other elements match this type
            const allSameType = node.elements.every(element => {
              if (!element) return true; // Skip holes
              const elementType = this.inferTypeFromNode(element, depth);
              return elementType && elementType.typeName === firstElementType.typeName;
            });

            if (allSameType) {
              return {
                typeName: `${firstElementType.typeName}[]`,
                confidence: 0.9
              };
            }
          }

          return { typeName: 'any[]', confidence: 0.8 };
        }
        return { typeName: 'any[]', confidence: 0.7 };
      case 'ObjectExpression':
        return { typeName: 'object', confidence: 0.8 };
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return { typeName: 'Function', confidence: 0.9 };
      case 'CallExpression':
        // If calling a known method/constructor, use its return type
        if (t.isIdentifier(node.callee)) {
          const calleeName = node.callee.name;
          if (knownTypes.has(calleeName)) {
            return {
              typeName: knownTypes.get(calleeName)!,
              confidence: 0.8
            };
          }
        }
        return { typeName: 'any', confidence: 0.3 };
      case 'Identifier':
        // If referring to another variable, use its type if known
        if (this.typeMap.has(node.name)) {
          return this.typeMap.get(node.name)!;
        }
        return { typeName: 'any', confidence: 0.1 };
      case 'BinaryExpression':
        // Infer type from binary operations
        if (['+', '-', '*', '/', '%', '**'].includes(node.operator)) {
          if (node.operator === '+') {
            // + can be number or string, check operands
            const leftType = this.inferTypeFromNode(node.left, depth);
            const rightType = this.inferTypeFromNode(node.right, depth);
            if (leftType?.typeName === 'string' || rightType?.typeName === 'string') {
              return { typeName: 'string', confidence: 0.8 };
            }
            return { typeName: 'number', confidence: 0.7 };
          }
          return { typeName: 'number', confidence: 0.9 };
        } else if (['==', '===', '!=', '!==', '>', '<', '>=', '<=', '&&', '||'].includes(node.operator)) {
          return { typeName: 'boolean', confidence: 0.9 };
        }
        return { typeName: 'any', confidence: 0.3 };
      default:
        return { typeName: 'any', confidence: 0.1 };
    }
  }
}
