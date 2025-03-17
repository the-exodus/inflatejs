import * as parser from '@babel/parser';
import traverse from '@babel/traverse';
import generate from '@babel/generator';
import * as t from '@babel/types';
import { NodePath } from '@babel/traverse';

// Type inference result structure
export interface InferredType {
  // The inferred TypeScript type
  typeName: string;
  // Confidence level (0-1) of the inference
  confidence: number;
}

// Map to store inferred types for each variable/parameter
export type TypeMap = Map<string, InferredType>;

/**
 * Analyzes code patterns to infer types for variables and parameters
 */
export class TypeInferer {
  // Map variables and parameters to their inferred types
  private typeMap: TypeMap = new Map();
  // Map to keep track of how values are used in operations
  private usageMap: Map<string, Set<string>> = new Map();
  // Map containing known types for standard JS objects and methods
  private knownTypes: Map<string, string> = new Map([
    // Common JavaScript types
    ['String', 'string'],
    ['Number', 'number'],
    ['Boolean', 'boolean'],
    ['Array', 'any[]'],
    ['Object', 'object'],
    ['Function', 'Function'],
    ['RegExp', 'RegExp'],
    ['Date', 'Date'],
    ['Promise', 'Promise<any>'],
    ['Map', 'Map<any, any>'],
    ['Set', 'Set<any>'],
    // Common object methods and their return types
    ['Array.prototype.map', 'any[]'],
    ['Array.prototype.filter', 'any[]'],
    ['Array.prototype.reduce', 'any'],
    ['Array.prototype.forEach', 'void'],
    ['Array.prototype.find', 'any'],
    ['Array.prototype.some', 'boolean'],
    ['Array.prototype.every', 'boolean'],
    ['Array.prototype.join', 'string'],
    ['String.prototype.split', 'string[]'],
    ['String.prototype.replace', 'string'],
    ['String.prototype.match', 'RegExpMatchArray | null'],
    ['Object.keys', 'string[]'],
    ['Object.values', 'any[]'],
    ['Object.entries', '[string, any][]'],
  ]);

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
      // Variable declarations
      VariableDeclarator: (path: NodePath<t.VariableDeclarator>) => {
        if (t.isIdentifier(path.node.id)) {
          const varName = path.node.id.name;
          
          // Initialize as unknown type
          this.typeMap.set(varName, { typeName: 'any', confidence: 0 });
          
          // If there's an initializer, try to infer type from it
          if (path.node.init) {
            const inferredType = this.inferTypeFromNode(path.node.init);
            if (inferredType) {
              this.typeMap.set(varName, inferredType);
            }
          }
        }
      },
      
      // Function declarations
      FunctionDeclaration: (path: NodePath<t.FunctionDeclaration>) => {
        if (path.node.id) {
          const funcName = path.node.id.name;
          // Set function type with parameter and return type placeholders
          this.typeMap.set(funcName, { 
            typeName: '(...args: any[]) => any', 
            confidence: 0.7 
          });
          
          // For each parameter, set an initial type of 'any'
          path.node.params.forEach(param => {
            if (t.isIdentifier(param)) {
              this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
            }
          });

          // Try to infer function return type
          this.inferFunctionReturnType(path);
        }
      },
      
      // Function expressions
      FunctionExpression: (path: NodePath<t.FunctionExpression>) => {
        // For each parameter, set an initial type of 'any'
        path.node.params.forEach(param => {
          if (t.isIdentifier(param)) {
            this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
          }
        });

        // Try to infer function return type
        this.inferFunctionReturnType(path);
      },
      
      // Arrow function expressions
      ArrowFunctionExpression: (path: NodePath<t.ArrowFunctionExpression>) => {
        // For each parameter, set an initial type of 'any'
        path.node.params.forEach(param => {
          if (t.isIdentifier(param)) {
            this.typeMap.set(param.name, { typeName: 'any', confidence: 0 });
          }
        });

        // Try to infer function return type
        this.inferFunctionReturnType(path);
      }
    });
  }

  /**
   * Second pass: analyze how variables are used
   */
  private analyzeUsages(ast: t.File): void {
    traverse(ast, {
      // Variable references
      Identifier: (path: NodePath<t.Identifier>) => {
        const name = path.node.name;
        
        // Skip if this isn't a reference or if we don't have this variable in our map
        if (path.isReferencedIdentifier() && this.typeMap.has(name)) {
          // Check parent to analyze usage
          const parent = path.parent;

          // Check binary operations for number inference
          if (t.isBinaryExpression(parent) && 
              (['+', '-', '*', '/', '%', '**'].includes(parent.operator))) {
            if (!this.usageMap.has(name)) {
              this.usageMap.set(name, new Set());
            }
            
            // If it's a mathematical operation, likely a number
            if (['-', '*', '/', '%', '**'].includes(parent.operator)) {
              this.usageMap.get(name)!.add('number');
            } 
            // Addition could be number or string
            else if (parent.operator === '+') {
              this.usageMap.get(name)!.add('number|string');
            }
          }
          
          // Check for array access
          if (t.isMemberExpression(parent) && parent.object === path.node && t.isNumericLiteral(parent.property)) {
            if (!this.usageMap.has(name)) {
              this.usageMap.set(name, new Set());
            }
            this.usageMap.get(name)!.add('array');
          }
          
          // Check for method calls that can indicate types
          if (t.isMemberExpression(parent) && t.isIdentifier(parent.property)) {
            const methodName = parent.property.name;
            
            // String methods
            const stringMethods = ['charAt', 'charCodeAt', 'concat', 'indexOf', 'lastIndexOf', 
              'match', 'replace', 'search', 'slice', 'split', 'substr', 'substring', 
              'toLowerCase', 'toUpperCase', 'trim'];
              
            // Array methods  
            const arrayMethods = ['concat', 'every', 'filter', 'find', 'findIndex', 'forEach', 'includes', 
              'indexOf', 'join', 'keys', 'map', 'pop', 'push', 'reduce', 'reverse', 'shift', 
              'slice', 'some', 'sort', 'splice', 'unshift'];
            
            if (stringMethods.includes(methodName)) {
              if (!this.usageMap.has(name)) {
                this.usageMap.set(name, new Set());
              }
              this.usageMap.get(name)!.add('string');
            } else if (arrayMethods.includes(methodName)) {
              if (!this.usageMap.has(name)) {
                this.usageMap.set(name, new Set());
              }
              this.usageMap.get(name)!.add('array');
            }
          }
          
          // Check for comparison with literals
          if (t.isBinaryExpression(parent) && 
              ['==', '===', '!=', '!==', '>', '<', '>=', '<='].includes(parent.operator)) {
            const otherSide = parent.left === path.node ? parent.right : parent.left;
            
            if (t.isStringLiteral(otherSide)) {
              if (!this.usageMap.has(name)) {
                this.usageMap.set(name, new Set());
              }
              this.usageMap.get(name)!.add('string');
            } else if (t.isNumericLiteral(otherSide)) {
              if (!this.usageMap.has(name)) {
                this.usageMap.set(name, new Set());
              }
              this.usageMap.get(name)!.add('number');
            } else if (t.isBooleanLiteral(otherSide)) {
              if (!this.usageMap.has(name)) {
                this.usageMap.set(name, new Set());
              }
              this.usageMap.get(name)!.add('boolean');
            }
          }
        }
      },
      
      // Check function calls to infer parameter types
      CallExpression: (path: NodePath<t.CallExpression>) => {
        const callee = path.node.callee;
        
        // Handle direct function identifier calls
        if (t.isIdentifier(callee) && this.typeMap.has(callee.name)) {
          // Get arguments and infer parameter types
          path.node.arguments.forEach((arg, index) => {
            if (t.isIdentifier(arg)) {
              const paramType = this.inferTypeFromNode(arg);
              
              if (paramType && paramType.confidence > 0.5) {
                // Mark this variable as likely being of this type
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
    });
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
  private inferFunctionReturnType(path: NodePath<t.Function>): void {
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
  private inferTypeFromNode(node: t.Node): InferredType | null {
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
          if (this.knownTypes.has(calleeName)) {
            return { 
              typeName: this.knownTypes.get(calleeName)!, 
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