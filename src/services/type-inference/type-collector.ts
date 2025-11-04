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
      },
      ClassDeclaration: (path) => {
        this.handleClassDeclaration(path, typeMap);
      },
      ClassMethod: (path) => {
        this.handleClassMethod(path, typeMap);
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
    } else if (t.isObjectPattern(path.node.id) || t.isArrayPattern(path.node.id)) {
      // Handle destructuring patterns
      if (path.node.init) {
        let initType = this.inferTypeFromNode(path.node.init);

        // If init is an identifier, try to look up its type in typeMap
        if (t.isIdentifier(path.node.init)) {
          const sourceType = typeMap.get(path.node.init.name);
          if (sourceType && sourceType.confidence > 0.5) {
            initType = sourceType;
          }
        }

        this.handleDestructuringPattern(path.node.id, initType, typeMap);
      } else {
        // Destructuring without init (shouldn't happen in practice)
        this.handleDestructuringPattern(path.node.id, null, typeMap);
      }
    }
  }

  /**
   * Handle destructuring patterns (object and array)
   */
  private handleDestructuringPattern(
    pattern: t.ObjectPattern | t.ArrayPattern,
    sourceType: InferredType | null,
    typeMap: TypeMap
  ): void {
    if (t.isObjectPattern(pattern)) {
      this.handleObjectPattern(pattern, sourceType, typeMap);
    } else if (t.isArrayPattern(pattern)) {
      this.handleArrayPattern(pattern, sourceType, typeMap);
    }
  }

  /**
   * Handle object destructuring patterns
   */
  private handleObjectPattern(
    pattern: t.ObjectPattern,
    sourceType: InferredType | null,
    typeMap: TypeMap
  ): void {
    // Try to get the source object type
    let sourceObjectType: { [key: string]: InferredType } | null = null;

    // If source is an identifier, try to look up its type
    if (sourceType && sourceType.typeName === 'object' && sourceType.properties) {
      sourceObjectType = sourceType.properties;
    }

    // Process each property in the pattern
    pattern.properties.forEach(prop => {
      if (t.isObjectProperty(prop)) {
        // Get the property name from the key
        let propertyName: string | null = null;
        if (t.isIdentifier(prop.key)) {
          propertyName = prop.key.name;
        } else if (t.isStringLiteral(prop.key)) {
          propertyName = prop.key.value;
        }

        // Handle the value (which could be identifier, pattern, or assignment)
        if (t.isIdentifier(prop.value)) {
          // Simple destructuring: const { x } = obj or const { x: y } = obj
          const varName = prop.value.name;

          // Try to get type from source object
          if (sourceObjectType && propertyName && sourceObjectType[propertyName]) {
            typeMap.set(varName, sourceObjectType[propertyName]);
          } else {
            // Fallback to any
            typeMap.set(varName, { typeName: 'any', confidence: 0.5 });
          }
        } else if (t.isAssignmentPattern(prop.value)) {
          // Destructuring with default: const { x = 5 } = obj
          if (t.isIdentifier(prop.value.left)) {
            const varName = prop.value.left.name;

            // Try to infer type from default value
            const defaultType = this.inferTypeFromNode(prop.value.right);
            if (defaultType) {
              typeMap.set(varName, defaultType);
            } else if (sourceObjectType && propertyName && sourceObjectType[propertyName]) {
              typeMap.set(varName, sourceObjectType[propertyName]);
            } else {
              typeMap.set(varName, { typeName: 'any', confidence: 0.5 });
            }
          }
        } else if (t.isObjectPattern(prop.value) || t.isArrayPattern(prop.value)) {
          // Nested destructuring: const { user: { name } } = data
          let nestedType: InferredType | null = null;
          if (sourceObjectType && propertyName && sourceObjectType[propertyName]) {
            nestedType = sourceObjectType[propertyName];
          }
          this.handleDestructuringPattern(prop.value, nestedType, typeMap);
        }
      } else if (t.isRestElement(prop)) {
        // Rest properties: const { x, ...rest } = obj
        if (t.isIdentifier(prop.argument)) {
          const varName = prop.argument.name;
          typeMap.set(varName, { typeName: 'object', confidence: 0.8 });
        }
      }
    });
  }

  /**
   * Handle array destructuring patterns
   */
  private handleArrayPattern(
    pattern: t.ArrayPattern,
    sourceType: InferredType | null,
    typeMap: TypeMap
  ): void {
    // Try to get the element type from source array
    let elementType: InferredType | null = null;
    if (sourceType && sourceType.typeName.endsWith('[]')) {
      const baseType = sourceType.typeName.slice(0, -2);
      elementType = { typeName: baseType, confidence: sourceType.confidence };
    }

    // Process each element in the pattern
    pattern.elements.forEach(element => {
      if (!element) {
        // Hole in array destructuring: const [x, , z] = arr
        return;
      }

      if (t.isIdentifier(element)) {
        // Simple destructuring: const [x, y] = arr
        const varName = element.name;
        if (elementType) {
          typeMap.set(varName, elementType);
        } else {
          typeMap.set(varName, { typeName: 'any', confidence: 0.5 });
        }
      } else if (t.isAssignmentPattern(element)) {
        // Destructuring with default: const [x = 5] = arr
        if (t.isIdentifier(element.left)) {
          const varName = element.left.name;

          // Try to infer type from default value
          const defaultType = this.inferTypeFromNode(element.right);
          if (defaultType) {
            typeMap.set(varName, defaultType);
          } else if (elementType) {
            typeMap.set(varName, elementType);
          } else {
            typeMap.set(varName, { typeName: 'any', confidence: 0.5 });
          }
        }
      } else if (t.isObjectPattern(element) || t.isArrayPattern(element)) {
        // Nested destructuring: const [[a, b]] = matrix
        this.handleDestructuringPattern(element, elementType, typeMap);
      } else if (t.isRestElement(element)) {
        // Rest elements: const [first, ...rest] = arr
        if (t.isIdentifier(element.argument)) {
          const varName = element.argument.name;
          if (sourceType && sourceType.typeName.endsWith('[]')) {
            // Rest should be same array type
            typeMap.set(varName, { typeName: sourceType.typeName, confidence: sourceType.confidence });
          } else {
            typeMap.set(varName, { typeName: 'any[]', confidence: 0.5 });
          }
        }
      }
    });
  }

  /**
   * Handle function declarations
   */
  private handleFunctionDeclaration(path: NodePath<t.FunctionDeclaration>, typeMap: TypeMap): void {
    if (path.node.id) {
      const funcName = path.node.id.name;
      typeMap.set(funcName, { typeName: '(...args: any[]) => any', confidence: 0.7 });

      // Add parameters
      this.handleFunctionParameters(path.node.params, typeMap);
    }
  }

  /**
   * Handle function expressions
   */
  private handleFunctionExpression(path: NodePath<t.FunctionExpression>, typeMap: TypeMap): void {
    this.handleFunctionParameters(path.node.params, typeMap);
  }

  /**
   * Handle arrow function expressions
   */
  private handleArrowFunctionExpression(
    path: NodePath<t.ArrowFunctionExpression>,
    typeMap: TypeMap
  ): void {
    this.handleFunctionParameters(path.node.params, typeMap);
  }

  /**
   * Handle function parameters (including destructuring)
   */
  private handleFunctionParameters(params: Array<t.Identifier | t.Pattern | t.RestElement | t.TSParameterProperty>, typeMap: TypeMap): void {
    params.forEach(param => {
      if (t.isIdentifier(param)) {
        typeMap.set(param.name, { typeName: 'any', confidence: 0 });
      } else if (t.isAssignmentPattern(param)) {
        // Handle default parameters
        if (t.isIdentifier(param.left)) {
          const paramName = param.left.name;
          const inferredType = this.inferTypeFromNode(param.right);
          if (inferredType) {
            typeMap.set(paramName, inferredType);
          } else {
            typeMap.set(paramName, { typeName: 'any', confidence: 0 });
          }
        } else if (t.isObjectPattern(param.left) || t.isArrayPattern(param.left)) {
          // Destructuring with default: function fn({ x = 5 } = {})
          const defaultType = this.inferTypeFromNode(param.right);
          this.handleDestructuringPattern(param.left, defaultType, typeMap);
        }
      } else if (t.isRestElement(param)) {
        // Handle rest parameters
        if (t.isIdentifier(param.argument)) {
          const paramName = param.argument.name;
          typeMap.set(paramName, { typeName: 'any[]', confidence: 0.8 });
        }
      } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
        // Destructuring parameters: function fn({ x, y })
        this.handleDestructuringPattern(param, null, typeMap);
      }
    });
  }

  /**
   * Handle class declarations
   */
  private handleClassDeclaration(path: NodePath<t.ClassDeclaration>, typeMap: TypeMap): void {
    if (path.node.id) {
      const className = path.node.id.name;
      typeMap.set(className, { typeName: 'class', confidence: 0.9 });
    }
  }

  /**
   * Handle class methods, including regular methods, static methods, getters, and setters
   */
  private handleClassMethod(path: NodePath<t.ClassMethod>, typeMap: TypeMap): void {
    if (!t.isIdentifier(path.node.key)) {
      return;
    }

    const methodName = path.node.key.name;

    // Skip constructors (they're handled separately)
    if (path.node.kind === 'constructor') {
      // Add constructor parameters to typeMap
      this.handleFunctionParameters(path.node.params, typeMap);
      return;
    }

    // Infer return type from method body
    let returnType: InferredType | null = null;

    if (path.node.kind === 'get') {
      // Getter - infer return type from return statements
      returnType = this.inferReturnTypeFromFunction(path.node);
      if (returnType) {
        typeMap.set(methodName, {
          typeName: `() => ${returnType.typeName}`,
          confidence: returnType.confidence
        });
      }
    } else if (path.node.kind === 'set') {
      // Setter - just add parameter type
      this.handleFunctionParameters(path.node.params, typeMap);
    } else {
      // Regular or static method - infer full function signature
      returnType = this.inferReturnTypeFromFunction(path.node);

      // Build parameter types and add to typeMap
      const paramTypes: string[] = [];
      path.node.params.forEach(param => {
        if (t.isIdentifier(param)) {
          paramTypes.push('any');
          typeMap.set(param.name, { typeName: 'any', confidence: 0 });
        } else if (t.isAssignmentPattern(param)) {
          if (t.isIdentifier(param.left)) {
            const paramName = param.left.name;
            const inferredType = this.inferTypeFromNode(param.right);
            if (inferredType) {
              paramTypes.push(inferredType.typeName);
              typeMap.set(paramName, inferredType);
            } else {
              paramTypes.push('any');
              typeMap.set(paramName, { typeName: 'any', confidence: 0 });
            }
          } else if (t.isObjectPattern(param.left) || t.isArrayPattern(param.left)) {
            const defaultType = this.inferTypeFromNode(param.right);
            this.handleDestructuringPattern(param.left, defaultType, typeMap);
            paramTypes.push('any'); // For signature
          }
        } else if (t.isRestElement(param) && t.isIdentifier(param.argument)) {
          const paramName = param.argument.name;
          paramTypes.push('...any[]');
          typeMap.set(paramName, { typeName: 'any[]', confidence: 0.8 });
        } else if (t.isObjectPattern(param) || t.isArrayPattern(param)) {
          this.handleDestructuringPattern(param, null, typeMap);
          paramTypes.push('any'); // For signature
        } else {
          paramTypes.push('any');
        }
      });

      const returnTypeStr = returnType ? returnType.typeName : 'void';
      const confidence = returnType ? returnType.confidence : 0.9;

      typeMap.set(methodName, {
        typeName: `(${paramTypes.join(', ')}) => ${returnTypeStr}`,
        confidence
      });
    }
  }

  /**
   * Infer return type from a function or method by analyzing return statements
   */
  private inferReturnTypeFromFunction(func: t.Function): InferredType | null {
    let returnType: InferredType | null = null;
    let hasExplicitReturn = false;

    if (!func.body || !t.isBlockStatement(func.body)) {
      // Arrow function with expression body
      if (t.isArrowFunctionExpression(func) && func.body) {
        return this.inferTypeFromNode(func.body);
      }
      return null;
    }

    // Scan for return statements
    traverse(func.body, {
      ReturnStatement: (returnPath: any) => {
        hasExplicitReturn = true;
        if (returnPath.node.argument) {
          const argType = this.inferTypeFromNode(returnPath.node.argument);
          if (argType && (!returnType || argType.confidence > returnType.confidence)) {
            returnType = argType;
          }
        }
      },
      noScope: true
    });

    // If no explicit return found, return type is void
    if (!hasExplicitReturn) {
      return { typeName: 'void', confidence: 0.9 };
    }

    return returnType;
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
        return this.inferObjectType(node);
      case 'FunctionExpression':
      case 'ArrowFunctionExpression':
        return this.inferFunctionExpressionType(node as t.FunctionExpression | t.ArrowFunctionExpression);
      case 'CallExpression':
      case 'OptionalCallExpression':
        return this.inferCallExpressionType(node as t.CallExpression);
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
      case 'OptionalMemberExpression':
        return this.inferMemberExpressionType(node as t.MemberExpression);
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

    // Collect all element types, handling spread elements
    const elementTypes: (InferredType | null)[] = [];

    for (const element of node.elements) {
      if (!element) {
        elementTypes.push(null);
        continue;
      }

      if (t.isSpreadElement(element)) {
        // Handle spread element - infer type of the spread argument
        const spreadArgType = this.inferTypeFromNode(element.argument);
        if (spreadArgType && spreadArgType.typeName.endsWith('[]')) {
          // Extract element type from array type (e.g., "number[]" -> "number")
          const elementType = spreadArgType.typeName.slice(0, -2);
          elementTypes.push({ typeName: elementType, confidence: spreadArgType.confidence });
        } else {
          elementTypes.push({ typeName: 'any', confidence: 0.3 });
        }
      } else {
        // Regular element
        const elementType = this.inferTypeFromNode(element);
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
        return {
          typeName: `${firstValidType.typeName}[]`,
          confidence: 0.9
        };
      }
    }

    return { typeName: 'any[]', confidence: 0.8 };
  }

  /**
   * Infer object type from object expression, tracking property types
   */
  private inferObjectType(node: t.ObjectExpression): InferredType {
    if (node.properties.length === 0) {
      return { typeName: 'object', confidence: 0.8 };
    }

    // Track property types for destructuring
    const properties: { [key: string]: InferredType } = {};
    let hasProperties = false;

    for (const prop of node.properties) {
      if (t.isObjectProperty(prop) && !prop.computed) {
        // Get property name
        let propertyName: string | null = null;
        if (t.isIdentifier(prop.key)) {
          propertyName = prop.key.name;
        } else if (t.isStringLiteral(prop.key)) {
          propertyName = prop.key.value;
        }

        // Infer property value type
        if (propertyName && t.isExpression(prop.value)) {
          const valueType = this.inferTypeFromNode(prop.value);
          if (valueType && valueType.confidence >= 0.7) {
            properties[propertyName] = valueType;
            hasProperties = true;
          }
        }
      }
    }

    if (hasProperties) {
      return {
        typeName: 'object',
        confidence: 0.9,
        properties
      };
    }

    return { typeName: 'object', confidence: 0.8 };
  }

  /**
   * Infer type from call expression
   */
  private inferCallExpressionType(node: t.CallExpression): InferredType {
    const isOptional = (node as any).optional || t.isOptionalMemberExpression(node.callee) || (t.isMemberExpression(node.callee) && (node.callee as any).optional);

    // Helper to wrap type with undefined if optional
    const wrapIfOptional = (baseType: InferredType): InferredType => {
      if (isOptional) {
        // For optional chaining, ensure minimum confidence of 0.7 for the union type
        const confidence = Math.max(baseType.confidence, 0.7);
        return { typeName: `${baseType.typeName} | undefined`, confidence };
      }
      return baseType;
    };

    // Handle method calls (obj.method())
    if (t.isMemberExpression(node.callee) || t.isOptionalMemberExpression(node.callee)) {
      if (t.isIdentifier(node.callee.property)) {
        const methodName = node.callee.property.name;

        // Common string methods that return string (only unambiguous ones)
        if (['toUpperCase', 'toLowerCase', 'trim', 'trimStart', 'trimEnd',
             'substring', 'substr', 'replace', 'replaceAll',
             'repeat', 'padStart', 'padEnd', 'charAt'].includes(methodName)) {
          return wrapIfOptional({ typeName: 'string', confidence: 0.9 });
        }

        // Methods that exist on both strings and arrays - return generic type with moderate confidence
        // TypeResolver will refine these based on context
        if (methodName === 'slice' || methodName === 'concat') {
          return wrapIfOptional({ typeName: 'any', confidence: 0.6 });
        }

        // String methods that return string[]
        if (methodName === 'split') {
          return wrapIfOptional({ typeName: 'string[]', confidence: 0.9 });
        }

        // String methods that return number
        if (['indexOf', 'lastIndexOf', 'search', 'charCodeAt'].includes(methodName)) {
          return wrapIfOptional({ typeName: 'number', confidence: 0.9 });
        }

        // String methods that return boolean
        if (['startsWith', 'endsWith', 'includes'].includes(methodName)) {
          return wrapIfOptional({ typeName: 'boolean', confidence: 0.9 });
        }

        // Array methods that return boolean
        if (['some', 'every', 'includes'].includes(methodName)) {
          return wrapIfOptional({ typeName: 'boolean', confidence: 0.9 });
        }

        // Array methods that return number
        if (['indexOf', 'findIndex', 'push', 'unshift'].includes(methodName)) {
          return wrapIfOptional({ typeName: 'number', confidence: 0.9 });
        }

        // Array methods that return string
        if (methodName === 'join') {
          return wrapIfOptional({ typeName: 'string', confidence: 0.9 });
        }

        // RegExp methods that return boolean
        if (methodName === 'test') {
          return wrapIfOptional({ typeName: 'boolean', confidence: 0.9 });
        }

        // RegExp methods that return RegExpExecArray | null
        if (methodName === 'exec') {
          return wrapIfOptional({ typeName: 'RegExpExecArray | null', confidence: 0.9 });
        }
      }
    }

    // Handle static method calls (e.g., Object.keys(), Array.isArray())
    if ((t.isMemberExpression(node.callee) || t.isOptionalMemberExpression(node.callee)) &&
        t.isIdentifier(node.callee.object) &&
        t.isIdentifier(node.callee.property)) {
      const objectName = node.callee.object.name;
      const methodName = node.callee.property.name;
      const fullName = `${objectName}.${methodName}`;

      if (knownTypes.has(fullName)) {
        return wrapIfOptional({
          typeName: knownTypes.get(fullName)!,
          confidence: 0.9
        });
      }
    }

    // Handle direct function calls
    if (t.isIdentifier(node.callee)) {
      const calleeName = node.callee.name;
      if (knownTypes.has(calleeName)) {
        return wrapIfOptional({
          typeName: knownTypes.get(calleeName)!,
          confidence: 0.8
        });
      }
    }

    return wrapIfOptional({ typeName: 'any', confidence: 0.3 });
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

    // If one operand is unknown (any with low confidence) and the other is known,
    // prefer the known type with moderate confidence
    if (leftType.typeName === 'any' && leftType.confidence < 0.5 && rightType.confidence >= 0.7) {
      return { typeName: rightType.typeName, confidence: 0.7 };
    }
    if (rightType.typeName === 'any' && rightType.confidence < 0.5 && leftType.confidence >= 0.7) {
      return { typeName: leftType.typeName, confidence: 0.7 };
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

      // Default to number for unknown operands (most common case in practice)
      // This assumes arithmetic operations are more common than string concatenation
      // when types are not explicitly known
      return { typeName: 'number', confidence: 0.8 };
    }

    return { typeName: 'any', confidence: 0.3 };
  }

  /**
   * Infer type from member expression (e.g., obj.property, arr.length)
   */
  private inferMemberExpressionType(node: t.MemberExpression): InferredType {
    const isOptional = t.isOptionalMemberExpression(node) || (node as any).optional;

    // Handle common properties with known return types
    if (t.isIdentifier(node.property)) {
      const propertyName = node.property.name;

      // Array/String .length property
      if (propertyName === 'length') {
        const baseType = { typeName: 'number', confidence: 0.9 };
        if (isOptional) {
          return { typeName: 'number | undefined', confidence: 0.9 };
        }
        return baseType;
      }
    }

    // Default: unable to infer
    const baseType = { typeName: 'any', confidence: 0.3 };
    if (isOptional) {
      // For optional chaining, we can confidently say the result is either any or undefined
      return { typeName: 'any | undefined', confidence: 0.7 };
    }
    return baseType;
  }

  /**
   * Infer type signature for function/arrow function expressions
   * Returns full function signature with parameter and return types
   */
  private inferFunctionExpressionType(
    node: t.FunctionExpression | t.ArrowFunctionExpression
  ): InferredType {
    // Get parameter types (basic inference for now)
    const paramTypes = node.params.map(param => {
      if (t.isIdentifier(param)) {
        return 'any';
      } else if (t.isAssignmentPattern(param)) {
        // Default parameter - try to infer from default value
        const defaultType = this.inferTypeFromNode(param.right);
        return defaultType ? defaultType.typeName : 'any';
      } else if (t.isRestElement(param)) {
        return 'any[]';
      }
      return 'any';
    });

    // Try to infer return type from the function body
    let returnType: InferredType = { typeName: 'any', confidence: 0.5 };

    if (t.isBlockStatement(node.body)) {
      // Look for return statements
      for (const stmt of node.body.body) {
        if (t.isReturnStatement(stmt) && stmt.argument) {
          const argType = this.inferTypeFromNode(stmt.argument);
          if (argType && argType.confidence > returnType.confidence) {
            returnType = argType;
          }
        }
      }
    } else {
      // Arrow function with expression body
      returnType = this.inferTypeFromNode(node.body) || returnType;
    }

    // Build function signature
    const typeStr = `(${paramTypes.join(', ')}) => ${returnType.typeName}`;
    return { typeName: typeStr, confidence: Math.min(0.8, returnType.confidence) };
  }
}
