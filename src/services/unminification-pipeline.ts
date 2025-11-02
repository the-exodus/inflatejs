/**
 * UnminificationPipeline implementation
 * Single Responsibility: Orchestrating the unminification process
 * Dependency Inversion: Depends on abstractions, not concrete implementations
 */

import * as t from '@babel/types';
import traverse from '@babel/traverse';
import {
  IUnminificationPipeline,
  ICodeParser,
  ICodeGenerator,
  ICodeFormatter,
  INameGenerator,
  IScopeManager,
  IASTTransformer,
  ITypeInferenceEngine,
  UnminificationConfig
} from '../interfaces';
import { TypeMap } from '../types';

export class UnminificationPipeline implements IUnminificationPipeline {
  constructor(
    private parser: ICodeParser,
    private transformer: IASTTransformer,
    private typeInferenceEngine: ITypeInferenceEngine | null,
    private generator: ICodeGenerator,
    private formatter: ICodeFormatter,
    private nameGenerator: INameGenerator,
    private scopeManager: IScopeManager
  ) {}

  /**
   * Process code through the complete unminification pipeline
   * @param code - The minified code to process
   * @param config - Configuration options
   * @returns Unminified code
   */
  public process(code: string, config: UnminificationConfig): string {
    // Step 1: Parse code into AST
    const ast = this.parser.parse(code);

    // Step 2: Infer types if requested
    let typeMap: TypeMap | null = null;
    if (config.inferTypes && this.typeInferenceEngine) {
      typeMap = this.typeInferenceEngine.inferTypes(ast);
    }

    // Step 3: Transform AST (rename variables, expand syntax)
    this.transformer.transform(ast, {
      renameVariables: config.renameVariables,
      scopeManager: this.scopeManager,
      nameGenerator: this.nameGenerator
    });

    // Step 4: Add type annotations if requested
    if (typeMap && (config.inferTypes || config.outputTypeScript)) {
      this.addTypeAnnotations(ast, typeMap);
    }

    // Step 5: Generate code from AST
    let generatedCode = this.generator.generate(ast);

    // Step 6: Convert to TypeScript if requested
    if (config.outputTypeScript) {
      generatedCode = this.convertToTypeScript(generatedCode, typeMap);
    }

    // Step 7: Format the code
    const parser = config.outputTypeScript ? 'typescript' : 'babel';
    const formattedCode = this.formatter.format(generatedCode, parser);

    return formattedCode;
  }

  /**
   * Add type annotations to the AST as JSDoc comments
   */
  private addTypeAnnotations(ast: any, typeMap: TypeMap): void {
    traverse(ast, {
      FunctionDeclaration: (path: any) => {
        if (!path.node.id) return;

        const funcName = path.node.id.name;
        const funcType = typeMap.get(funcName);

        if (funcType && funcType.confidence >= 0.7) {
          // Wrap return type in Promise<> for async functions
          let typeAnnotation = funcType.typeName;
          if (path.node.async && typeAnnotation) {
            // Parse the function type signature and wrap the return type
            const match = typeAnnotation.match(/^(\([^)]*\))\s*=>\s*(.+)$/);
            if (match) {
              const params = match[1];
              const returnType = match[2].trim();
              // Only wrap if not already a Promise
              if (!returnType.startsWith('Promise<')) {
                typeAnnotation = `${params} => Promise<${returnType}>`;
              }
            }
          }

          const comment: any = {
            type: 'CommentBlock',
            value: `*\n * @type {${typeAnnotation}}\n `
          };

          if (!path.node.leadingComments) {
            path.node.leadingComments = [];
          }
          path.node.leadingComments.push(comment);
        }

        // Add parameter type comments
        path.node.params.forEach((param: any) => {
          if (t.isIdentifier(param)) {
            const paramType = typeMap.get(param.name);
            if (paramType && paramType.confidence >= 0.7) {
              const paramComment: any = {
                type: 'CommentLine',
                value: ` : ${paramType.typeName}`
              };

              if (!param.trailingComments) {
                param.trailingComments = [];
              }
              param.trailingComments.push(paramComment);
            }
          }
        });
      }
    });
  }

  /**
   * Convert JSDoc type annotations to TypeScript syntax
   * Also adds explicit 'any' types to untyped parameters
   */
  private convertToTypeScript(code: string, typeMap: TypeMap | null): string {
    let tsCode = code;

    // Convert JSDoc @type annotations to native TypeScript syntax
    // Pattern: /**\n * @type {(paramType, ...) => returnType}\n */\nfunction name(param, ...)
    // Handle Promise<T> and other generic types by matching more carefully
    tsCode = tsCode.replace(
      /\/\*\*\s*\n\s*\*\s*@type\s*\{(\([^)]*\))\s*=>\s*([^}]+(?:<[^>]+>)?)\}\s*\n\s*\*\/\s*\n\s*(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g,
      (match, paramTypesStr, returnType, asyncKeyword, functionName, paramsStr) => {
        // Parse parameter types from JSDoc
        const paramTypes = paramTypesStr
          .slice(1, -1) // Remove outer parentheses
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);

        // Parse parameter names from function signature
        const paramNames = paramsStr
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);

        // Build TypeScript parameter list
        let tsParams = '';
        for (let i = 0; i < paramNames.length; i++) {
          if (i > 0) tsParams += ', ';
          const paramType = paramTypes[i] || 'any';
          tsParams += `${paramNames[i]}: ${paramType}`;
        }

        // Build TypeScript function signature
        const async = asyncKeyword || '';
        return `${async}function ${functionName}(${tsParams}): ${returnType.trim()}`;
      }
    );

    // Also handle nested functions with indentation (including Promise<> types)
    tsCode = tsCode.replace(
      /\/\*\*\s*\n\s+\*\s*@type\s*\{(\([^)]*\))\s*=>\s*([^}]+(?:<[^>]+>)?)\}\s*\n\s+\*\/\s*\n\s+(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)/g,
      (match, paramTypesStr, returnType, asyncKeyword, functionName, paramsStr) => {
        const paramTypes = paramTypesStr
          .slice(1, -1)
          .split(',')
          .map((t: string) => t.trim())
          .filter((t: string) => t.length > 0);

        const paramNames = paramsStr
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);

        let tsParams = '';
        for (let i = 0; i < paramNames.length; i++) {
          if (i > 0) tsParams += ', ';
          const paramType = paramTypes[i] || 'any';
          tsParams += `${paramNames[i]}: ${paramType}`;
        }

        const async = asyncKeyword || '';
        // Preserve indentation
        const indent = match.match(/\n(\s+)function/)?.[1] || '  ';
        return `${indent}${async}function ${functionName}(${tsParams}): ${returnType.trim()}`;
      }
    );

    // Add explicit 'any' type to function parameters that don't have type annotations
    // Match functions without preceding JSDoc comments
    tsCode = tsCode.replace(
      /^(\s*)(async\s+)?function\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)(?!\s*:\s*)/gm,
      (match, indent, asyncKeyword, functionName, paramsStr) => {
        // Skip if parameters are already typed
        if (paramsStr.includes(':')) {
          return match;
        }

        const params = paramsStr
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);

        if (params.length === 0) {
          return match;
        }

        // Add explicit 'any' type to all parameters
        const typedParams = params.map((p: string) => `${p}: any`).join(', ');
        const async = asyncKeyword || '';
        return `${indent}${async}function ${functionName}(${typedParams})`;
      }
    );

    // Handle single-parameter arrow functions without parentheses
    tsCode = tsCode.replace(
      /([^a-zA-Z_$])([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=>\s*\{/g,
      (match, before, param) => {
        return `${before}(${param}: any) => {`;
      }
    );

    // Handle arrow functions with parentheses
    // Only match arrow functions that have clear, untyped parameters
    tsCode = tsCode.replace(
      /\(([a-zA-Z_$][a-zA-Z0-9_$]*(?:\s*,\s*[a-zA-Z_$][a-zA-Z0-9_$]*)*)\)\s*=>\s*\{/g,
      (match, paramsStr) => {
        // Skip if already typed
        if (paramsStr.includes(':')) {
          return match;
        }

        const params = paramsStr.split(',').map((p: string) => p.trim());
        const typedParams = params.map((p: string) => `${p}: any`).join(', ');
        return `(${typedParams}) => {`;
      }
    );


    // Handle class methods without type annotations
    // Be careful not to match for loop increments or other expressions
    tsCode = tsCode.replace(
      /^(\s+)([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\(([^)]*)\)\s*\{/gm,
      (match, indent, methodName, paramsStr) => {
        // Skip if already typed
        if (paramsStr.includes(':')) {
          return match;
        }

        // Skip if it's a control structure keyword
        const controlKeywords = ['if', 'while', 'for', 'switch', 'catch', 'with'];
        if (controlKeywords.includes(methodName)) {
          return match;
        }

        const params = paramsStr
          .split(',')
          .map((p: string) => p.trim())
          .filter((p: string) => p.length > 0);

        if (params.length === 0) {
          return match;
        }

        const typedParams = params.map((p: string) => `${p}: any`).join(', ');
        return `${indent}${methodName}(${typedParams}) {`;
      }
    );

    // Handle class constructors and add property declarations
    tsCode = tsCode.replace(
      /class\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\{(\s*)constructor\s*\(([^)]*)\)\s*\{([^}]*this\.(\w+)[^}]*)\}/g,
      (match, className, spacing, constructorParams, constructorBody) => {
        // Extract all property assignments from constructor
        const propertyPattern = /this\.(\w+)\s*=/g;
        const properties = new Set<string>();
        let propMatch;
        while ((propMatch = propertyPattern.exec(constructorBody)) !== null) {
          properties.add(propMatch[1]);
        }

        // Type constructor parameters
        let typedParams = constructorParams;
        if (constructorParams && !constructorParams.includes(':')) {
          const params = constructorParams.split(',').map((p: string) => p.trim());
          typedParams = params.map((p: string) => `${p}: any`).join(', ');
        }

        // Build property declarations
        const propertyDeclarations = Array.from(properties)
          .map((prop: string) => `${spacing}${prop}: any;`)
          .join('\n');

        return `class ${className} {${propertyDeclarations ? '\n' + propertyDeclarations : ''}${spacing}constructor(${typedParams}) {${constructorBody}}`;
      }
    );

    // Add type annotations to variable declarations when we have type information
    if (typeMap) {
      // Match: const/let/var variableName = ...
      tsCode = tsCode.replace(
        /^(\s*)(const|let|var)\s+([a-zA-Z_$][a-zA-Z0-9_$]*)\s*=/gm,
        (match, indent, keyword, varName) => {
          const varType = typeMap.get(varName);
          // Only add annotation if we have a type with good confidence and it's not 'any'
          if (varType && varType.confidence >= 0.7 && varType.typeName !== 'any') {
            return `${indent}${keyword} ${varName}: ${varType.typeName} =`;
          }
          return match;
        }
      );
    }

    // Final cleanup: Remove any erroneous `: any` after increment/decrement operators
    tsCode = tsCode.replace(/(\+\+|--)\s*:\s*any/g, '$1');

    return tsCode;
  }
}
