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
    if (config.outputTypeScript && typeMap) {
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
          const comment: any = {
            type: 'CommentBlock',
            value: `*\n * @type {${funcType.typeName}}\n `
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
   */
  private convertToTypeScript(code: string, typeMap: TypeMap): string {
    // Convert JSDoc-style comments to TypeScript annotations
    let tsCode = code;

    // Convert parameter type comments to TypeScript syntax
    tsCode = tsCode.replace(
      /([a-zA-Z_$][a-zA-Z0-9_$]*)\s*\/\/\s*:\s*([a-zA-Z0-9_$\[\]|\s<>,.()=>]+)/g,
      '$1: $2'
    );

    // Clean up JSDoc function type comments (keep for now as they provide context)
    // Could be removed if full TS conversion is desired

    return tsCode;
  }
}
