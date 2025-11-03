/**
 * TypeScriptTypeBuilder
 * Single Responsibility: Converting type strings to TypeScript AST nodes
 */

import * as t from '@babel/types';

export class TypeScriptTypeBuilder {
  /**
   * Convert a type string (e.g., "number", "string[]", "(number) => string") to a TypeScript AST node
   */
  public buildTypeNode(typeString: string): t.TSType {
    const trimmed = typeString.trim();

    // Handle primitive types
    if (trimmed === 'number') return t.tsNumberKeyword();
    if (trimmed === 'string') return t.tsStringKeyword();
    if (trimmed === 'boolean') return t.tsBooleanKeyword();
    if (trimmed === 'any') return t.tsAnyKeyword();
    if (trimmed === 'void') return t.tsVoidKeyword();
    if (trimmed === 'null') return t.tsNullKeyword();
    if (trimmed === 'undefined') return t.tsUndefinedKeyword();
    if (trimmed === 'unknown') return t.tsUnknownKeyword();
    if (trimmed === 'never') return t.tsNeverKeyword();
    if (trimmed === 'object') return t.tsObjectKeyword();

    // Handle union types FIRST (e.g., "number | string", "number[] | string[]")
    // This must come before array type check to handle unions of arrays correctly
    if (trimmed.includes('|')) {
      const types = trimmed.split('|').map(t => this.buildTypeNode(t.trim()));
      return t.tsUnionType(types);
    }

    // Handle array types (e.g., "number[]", "string[]")
    if (trimmed.endsWith('[]')) {
      const elementType = trimmed.slice(0, -2);
      return t.tsArrayType(this.buildTypeNode(elementType));
    }

    // Handle Promise<T>
    const promiseMatch = trimmed.match(/^Promise<(.+)>$/);
    if (promiseMatch) {
      const innerType = this.buildTypeNode(promiseMatch[1]);
      return t.tsTypeReference(
        t.identifier('Promise'),
        t.tsTypeParameterInstantiation([innerType])
      );
    }

    // Handle function types (e.g., "(number, string) => boolean")
    const functionMatch = trimmed.match(/^\(([^)]*)\)\s*=>\s*(.+)$/);
    if (functionMatch) {
      const paramsStr = functionMatch[1];
      const returnTypeStr = functionMatch[2];

      // Parse parameter types
      const paramTypeStrings = paramsStr
        .split(',')
        .map(p => p.trim())
        .filter(p => p.length > 0);

      // Create parameter nodes
      const parameters = paramTypeStrings.map((paramType, index) => {
        const param = t.identifier(`arg${index}`);
        param.typeAnnotation = t.tsTypeAnnotation(this.buildTypeNode(paramType));
        return param;
      });

      // Create return type
      const returnType = t.tsTypeAnnotation(this.buildTypeNode(returnTypeStr));

      return t.tsFunctionType(null, parameters, returnType);
    }

    // Handle intersection types (e.g., "number&string")
    if (trimmed.includes('&')) {
      const types = trimmed.split('&').map(t => this.buildTypeNode(t.trim()));
      return t.tsIntersectionType(types);
    }

    // Default: treat as a type reference (for custom types, Date, etc.)
    return t.tsTypeReference(t.identifier(trimmed));
  }

  /**
   * Parse a function type string and extract parameter types and return type
   * Returns null if not a valid function type
   */
  public parseFunctionType(typeString: string): {
    paramTypes: string[];
    returnType: string;
  } | null {
    const match = typeString.trim().match(/^\(([^)]*)\)\s*=>\s*(.+)$/);
    if (!match) return null;

    const paramsStr = match[1];
    const returnType = match[2].trim();

    const paramTypes = paramsStr
      .split(',')
      .map(p => p.trim())
      .filter(p => p.length > 0);

    return { paramTypes, returnType };
  }

  /**
   * Create a TypeScript type annotation node
   */
  public createTypeAnnotation(typeString: string): t.TSTypeAnnotation {
    return t.tsTypeAnnotation(this.buildTypeNode(typeString));
  }
}
