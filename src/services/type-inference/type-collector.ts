/**
 * TypeCollector implementation
 * Single Responsibility: Collecting type information from declarations
 */

import * as t from '@babel/types';
import traverse, { NodePath } from '@babel/traverse';
import { ITypeCollector } from '../../interfaces';
import { TypeMap, InferredType } from '../../types';
import { knownTypes } from '../../known-types';

export class TypeCollector implements ITypeCollector {
  /**
   * Collect types from variable declarations and function definitions
   */
  public collectTypes(ast: t.File): TypeMap {
    const typeMap: TypeMap = new Map();

    traverse(ast, {
      VariableDeclarator: (path) => {
        this.handleVariableDeclarator(path, typeMap);
      },
      FunctionDeclaration: (path) => {
        this.handleFunctionDeclaration(path, typeMap);
      },
      FunctionExpression: (path) => {
        this.handleFunctionExpression(path, typeMap);
      },
      ArrowFunctionExpression: (path) => {
        this.handleArrowFunctionExpression(path, typeMap);
      }
    });

    return typeMap;
  }

  /**
   * Handle variable declarators
   */
  private handleVariableDeclarator(path: NodePath<t.VariableDeclarator>, typeMap: TypeMap): void {
    if (t.isIdentifier(path.node.id)) {
      const varName = path.node.id.name;
      typeMap.set(varName, { typeName: 'any', confidence: 0 });

      if (path.node.init) {
        const inferredType = this.inferTypeFromNode(path.node.init);
        if (inferredType) {
          typeMap.set(varName, inferredType);
        }
      }
    }
  }

  /**
   * Handle function declarations
   */
  private handleFunctionDeclaration(path: NodePath<t.FunctionDeclaration>, typeMap: TypeMap): void {
    if (path.node.id) {
      const funcName = path.node.id.name;
      typeMap.set(funcName, { typeName: '(...args: any[]) => any', confidence: 0.7 });

      // Add parameters
      path.node.params.forEach(param => {
        if (t.isIdentifier(param)) {
          typeMap.set(param.name, { typeName: 'any', confidence: 0 });
        } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
          // Handle default parameters
          const paramName = param.left.name;
          const inferredType = this.inferTypeFromNode(param.right);
          if (inferredType) {
            typeMap.set(paramName, inferredType);
          } else {
            typeMap.set(paramName, { typeName: 'any', confidence: 0 });
          }
        } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
          // Handle rest parameters
          const paramName = param.argument.name;
          typeMap.set(paramName, { typeName: 'any[]', confidence: 0.8 });
        }
      });
    }
  }

  /**
   * Handle function expressions
   */
  private handleFunctionExpression(path: NodePath<t.FunctionExpression>, typeMap: TypeMap): void {
    path.node.params.forEach(param => {
      if (t.isIdentifier(param)) {
        typeMap.set(param.name, { typeName: 'any', confidence: 0 });
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        // Handle default parameters
        const paramName = param.left.name;
        const inferredType = this.inferTypeFromNode(param.right);
        if (inferredType) {
          typeMap.set(paramName, inferredType);
        } else {
          typeMap.set(paramName, { typeName: 'any', confidence: 0 });
        }
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        // Handle rest parameters
        const paramName = param.argument.name;
        typeMap.set(paramName, { typeName: 'any[]', confidence: 0.8 });
      }
    });
  }

  /**
   * Handle arrow function expressions
   */
  private handleArrowFunctionExpression(
    path: NodePath<t.ArrowFunctionExpression>,
    typeMap: TypeMap
  ): void {
    path.node.params.forEach(param => {
      if (t.isIdentifier(param)) {
        typeMap.set(param.name, { typeName: 'any', confidence: 0 });
      } else if (t.isAssignmentPattern(param) && t.isIdentifier(param.left)) {
        // Handle default parameters
        const paramName = param.left.name;
        const inferredType = this.inferTypeFromNode(param.right);
        if (inferredType) {
          typeMap.set(paramName, inferredType);
        } else {
          typeMap.set(paramName, { typeName: 'any', confidence: 0 });
        }
      } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
        // Handle rest parameters
        const paramName = param.argument.name;
        typeMap.set(paramName, { typeName: 'any[]', confidence: 0.8 });
      }
    });
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
      case 'TemplateLiteral':
        return { typeName: 'string', confidence: 1.0 };
      case 'RegExpLiteral':
        return { typeName: 'RegExp', confidence: 1.0 };
      case 'Identifier':
        // Handle special identifier literals like 'undefined'
        if (t.isIdentifier(node) && node.name === 'undefined') {
          return { typeName: 'undefined', confidence: 1.0 };
        }
        return { typeName: 'any', confidence: 0.1 };
      case 'ArrayExpression':
        return this.inferArrayType(node);
      case 'ObjectExpression':
        return { typeName: 'object', confidence: 0.8 };
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return { typeName: 'Function', confidence: 0.9 };
      case 'CallExpression':
        return this.inferCallExpressionType(node);
      case 'NewExpression':
        return this.inferNewExpressionType(node);
      case 'UnaryExpression':
        return this.inferUnaryExpressionType(node);
      case 'ConditionalExpression':
        return this.inferConditionalExpressionType(node);
      case 'LogicalExpression':
        return this.inferLogicalExpressionType(node);
      case 'BinaryExpression':
        return this.inferBinaryExpressionType(node);
      case 'MemberExpression':
        return this.inferMemberExpressionType(node);
      default:
        return { typeName: 'any', confidence: 0.1 };
    }
  }

  /**
   * Infer array type from array expression
   */
  private inferArrayType(node: t.ArrayExpression): InferredType {
    if (node.elements.length === 0) {
      return { typeName: 'any[]', confidence: 0.7 };
    }

    const firstElementType = node.elements[0]
      ? this.inferTypeFromNode(node.elements[0])
      : null;

    if (firstElementType && firstElementType.confidence > 0.7) {
      const allSameType = node.elements.every(element => {
        if (!element) return true;
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

  /**
   * Infer type from call expression
   */
  private inferCallExpressionType(node: t.CallExpression): InferredType {
    // Handle method calls (obj.method())
    if (t.isMemberExpression(node.callee)) {
      if (t.isIdentifier(node.callee.property)) {
        const methodName = node.callee.property.name;

        // Common string methods that return string (only unambiguous ones)
        if (['toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd',
             'substring', 'substr', 'replace', 'replaceAll',
             'repeat', 'padStart', 'padEnd', 'charAt'].includes(methodName)) {
          return { typeName: 'string', confidence: 0.9 };
        }

        // Methods that exist on both strings and arrays - return generic type with moderate confidence
        // TypeResolver will refine these based on context
        if (methodName === 'slice' || methodName === 'concat') {
          return { typeName: 'any', confidence: 0.6 };
        }

        // String methods that return string[]
        if (methodName === 'split') {
          return { typeName: 'string[]', confidence: 0.9 };
        }

        // String methods that return number
        if (['indexOf', 'lastIndexOf', 'search', 'charCodeAt'].includes(methodName)) {
          return { typeName: 'number', confidence: 0.9 };
        }

        // String methods that return boolean
        if (['startsWith', 'endsWith', 'includes'].includes(methodName)) {
          return { typeName: 'boolean', confidence: 0.9 };
        }

        // Array methods that return boolean
        if (['some', 'every', 'includes'].includes(methodName)) {
          return { typeName: 'boolean', confidence: 0.9 };
        }

        // Array methods that return number
        if (['indexOf', 'findIndex', 'push', 'unshift'].includes(methodName)) {
          return { typeName: 'number', confidence: 0.9 };
        }

        // Array methods that return string
        if (methodName === 'join') {
          return { typeName: 'string', confidence: 0.9 };
        }

        // RegExp methods that return boolean
        if (methodName === 'test') {
          return { typeName: 'boolean', confidence: 0.9 };
        }
      }
    }

    // Handle static method calls (e.g., Object.keys(), Array.isArray())
    if (t.isMemberExpression(node.callee) &&
        t.isIdentifier(node.callee.object) &&
        t.isIdentifier(node.callee.property)) {
      const objectName = node.callee.object.name;
      const methodName = node.callee.property.name;
      const fullName = `${objectName}.${methodName}`;

      if (knownTypes.has(fullName)) {
        return {
          typeName: knownTypes.get(fullName)!,
          confidence: 0.9
        };
      }
    }

    // Handle direct function calls
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
  }

  /**
   * Infer type from new expression (constructor calls)
   */
  private inferNewExpressionType(node: t.NewExpression): InferredType {
    if (t.isIdentifier(node.callee)) {
      const constructorName = node.callee.name;

      // Handle known constructors
      const knownConstructors: Record<string, string> = {
        'Date': 'Date',
        'Error': 'Error',
        'RegExp': 'RegExp',
        'Map': 'Map<any, any>',
        'Set': 'Set<any>',
        'WeakMap': 'WeakMap<any, any>',
        'WeakSet': 'WeakSet<any>',
        'Promise': 'Promise<any>',
        'Array': 'any[]',
        'Object': 'object'
      };

      if (knownConstructors[constructorName]) {
        return {
          typeName: knownConstructors[constructorName],
          confidence: 0.9
        };
      }

      // Unknown constructor - use the constructor name as the type
      return { typeName: constructorName, confidence: 0.7 };
    }

    return { typeName: 'object', confidence: 0.5 };
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
  private inferConditionalExpressionType(node: t.ConditionalExpression): InferredType {
    // Infer types for both branches
    const consequentType = this.inferTypeFromNode(node.consequent);
    const alternateType = this.inferTypeFromNode(node.alternate);

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
  private inferLogicalExpressionType(node: t.LogicalExpression): InferredType {
    // Infer types for both operands
    const leftType = this.inferTypeFromNode(node.left);
    const rightType = this.inferTypeFromNode(node.right);

    // If we couldn't infer either type, return any
    if (!leftType || !rightType) {
      return { typeName: 'any', confidence: 0.3 };
    }

    // Create union type or simplify if same type
    return this.createUnionType(leftType, rightType);
  }

  /**
   * Infer type from binary expression (+, -, *, /, %, etc.)
   */
  private inferBinaryExpressionType(node: t.BinaryExpression): InferredType {
    // Comparison operators always return boolean
    if (['==', '===', '!=', '!==', '<', '<=', '>', '>=', 'in', 'instanceof'].includes(node.operator)) {
      return { typeName: 'boolean', confidence: 1.0 };
    }

    // Bitwise and arithmetic operators (except +) return number
    if (['-', '*', '/', '%', '**', '&', '|', '^', '<<', '>>', '>>>'].includes(node.operator)) {
      return { typeName: 'number', confidence: 1.0 };
    }

    // The + operator is tricky - can be addition or concatenation
    if (node.operator === '+') {
      const leftType = this.inferTypeFromNode(node.left);
      const rightType = this.inferTypeFromNode(node.right);

      // If either operand is a string, result is string
      if (leftType?.typeName === 'string' || rightType?.typeName === 'string') {
        return { typeName: 'string', confidence: 0.9 };
      }

      // If both are numbers, result is number
      if (leftType?.typeName === 'number' && rightType?.typeName === 'number') {
        return { typeName: 'number', confidence: 1.0 };
      }

      // Otherwise, uncertain
      return { typeName: 'any', confidence: 0.4 };
    }

    return { typeName: 'any', confidence: 0.3 };
  }

  /**
   * Infer type from member expression (e.g., obj.property, arr.length)
   */
  private inferMemberExpressionType(node: t.MemberExpression): InferredType {
    // Handle common properties with known return types
    if (t.isIdentifier(node.property)) {
      const propertyName = node.property.name;

      // Array/String .length property
      if (propertyName === 'length') {
        return { typeName: 'number', confidence: 0.9 };
      }
    }

    // Default: unable to infer
    return { typeName: 'any', confidence: 0.3 };
  }
}
