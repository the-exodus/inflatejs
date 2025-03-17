import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { InferredType, TypeMap, ITypeInferer, InferTypeFromNode, InferFunctionReturnType } from './types';
import { knownTypes } from './known-types';

/**
 * Analyzes code patterns to infer types for variables and parameters
 */
export class TypeInferer implements ITypeInferer {
  // Map variables and parameters to their inferred types
  private typeMap: TypeMap = new Map();
  // Map to keep track of how values are used in operations
  private usageMap: Map<string, Set<string>> = new Map();

  /**
   * Analyze the AST to infer types for variables and parameters
   */
  public inferTypes(ast: t.File): TypeMap {
    this.typeMap.clear();
    this.usageMap.clear();

    // First pass: collect variable declarations and initial values
    this.collectDeclarations(ast);
    
    // Second pass: analyze variable usages
    this.analyzeUsages(ast);
    
    // Third pass: resolve types based on collected information
    this.resolveTypes();
    
    return this.typeMap;
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
        const inferredType = this.inferTypeFromNode(path.node.init);
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
        this.addUsage(name, parent.operator === '+' ? 'number|string' : 'number');
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
        
        if (usages.has('number') && !usages.has('string') && !usages.has('array')) {
          inferredType = { typeName: 'number', confidence: 0.8 };
        } else if (usages.has('string') && !usages.has('array')) {
          inferredType = { typeName: 'string', confidence: 0.8 };
        } else if (usages.has('array')) {
          inferredType = { typeName: 'any[]', confidence: 0.8 };
        } else if (usages.has('boolean')) {
          inferredType = { typeName: 'boolean', confidence: 0.8 };
        } else if (usages.has('number|string')) {
          // If we only have the ambiguous + operator, default to any
          inferredType = { typeName: 'number | string', confidence: 0.5 };
        }
        
        // Only update if we have a higher confidence
        const currentType = this.typeMap.get(name)!;
        if (inferredType.confidence > currentType.confidence) {
          this.typeMap.set(name, inferredType);
        }
      }
    }
  }

  /**
   * Infer the return type of a function from its contents
   */
  private inferFunctionReturnType: InferFunctionReturnType = (path) => {
    // Check for explicit returns
    let returnType: InferredType = { typeName: 'void', confidence: 0.5 };
    let hasExplicitReturn = false;

    // Visit all return statements
    path.traverse({
      ReturnStatement: (returnPath) => {
        hasExplicitReturn = true;
        if (returnPath.node.argument) {
          const argumentType = this.inferTypeFromNode(returnPath.node.argument);
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
  private inferTypeFromNode: InferTypeFromNode = (node) => {
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
            ? this.inferTypeFromNode(node.elements[0])
            : null;
            
          if (firstElementType && firstElementType.confidence > 0.7) {
            // Check if all other elements match this type
            const allSameType = node.elements.every(element => {
              if (!element) return true; // Skip holes
              const elementType = this.inferTypeFromNode(element);
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
      default:
        return { typeName: 'any', confidence: 0.1 };
    }
  }
}
