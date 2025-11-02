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

    // If both branches have the same type, return that type
    if (consequentType.typeName === alternateType.typeName) {
      return {
        typeName: consequentType.typeName,
        confidence: Math.min(consequentType.confidence, alternateType.confidence) * 0.95
      };
    }

    // Different types - return any as a fallback
    // In the future, we could return union types like "string | number"
    return { typeName: 'any', confidence: 0.5 };
  }
}
