/**
 * UnminificationFactory
 * Responsible for creating and wiring up all dependencies
 * Implements the Factory pattern and Dependency Injection
 */

import {
  IUnminificationPipeline,
  ICodeParser,
  ICodeGenerator,
  ICodeFormatter,
  INameGenerator,
  IScopeManager,
  IASTTransformer,
  ITypeInferenceEngine,
  ITypeCollector,
  IUsageAnalyzer,
  ICallGraphBuilder,
  ITypeResolver,
  UnminificationConfig
} from '../interfaces';

import {
  CodeParser,
  CodeGenerator,
  CodeFormatter,
  NameGenerator,
  ScopeManager,
  ASTTransformer,
  TypeCollector,
  UsageAnalyzer,
  CallGraphBuilder,
  TypeResolver,
  TypeInferenceEngine
} from '../services';

import { UnminificationPipeline } from '../services/unminification-pipeline';

export class UnminificationFactory {
  /**
   * Create a complete unminification pipeline with all dependencies
   * @param config - Configuration for the pipeline
   * @returns Configured unminification pipeline
   */
  public static createPipeline(config?: Partial<UnminificationConfig>): IUnminificationPipeline {
    // Create basic services
    const parser: ICodeParser = new CodeParser();
    const generator: ICodeGenerator = new CodeGenerator();
    const formatter: ICodeFormatter = new CodeFormatter();

    // Create naming services
    const nameGenerator: INameGenerator = new NameGenerator();
    const scopeManager: IScopeManager = new ScopeManager(nameGenerator);

    // Create AST transformer
    const transformer: IASTTransformer = new ASTTransformer();

    // Create type inference engine if needed
    let typeInferenceEngine: ITypeInferenceEngine | null = null;
    if (config?.inferTypes || config?.outputTypeScript) {
      typeInferenceEngine = this.createTypeInferenceEngine(config);
    }

    // Create and return the pipeline
    return new UnminificationPipeline(
      parser,
      transformer,
      typeInferenceEngine,
      generator,
      formatter,
      nameGenerator,
      scopeManager
    );
  }

  /**
   * Create a type inference engine with all its dependencies
   */
  private static createTypeInferenceEngine(
    config?: Partial<UnminificationConfig>
  ): ITypeInferenceEngine {
    const typeCollector: ITypeCollector = new TypeCollector();
    const usageAnalyzer: IUsageAnalyzer = new UsageAnalyzer();
    const callGraphBuilder: ICallGraphBuilder = new CallGraphBuilder();

    const typeResolverConfig = {
      maxDepth: config?.maxDepth ?? 8,
      maxTime: config?.maxTime ?? 5000
    };
    const typeResolver: ITypeResolver = new TypeResolver(typeResolverConfig);

    return new TypeInferenceEngine(
      typeCollector,
      usageAnalyzer,
      callGraphBuilder,
      typeResolver
    );
  }

  /**
   * Create a simple unminification function for easy usage
   */
  public static createUnminifier(config?: Partial<UnminificationConfig>) {
    return (code: string): string => {
      const pipeline = this.createPipeline(config);
      const defaultConfig: UnminificationConfig = {
        renameVariables: true,
        inferTypes: false,
        outputTypeScript: false,
        maxDepth: 8,
        maxTime: 5000,
        ...config
      };
      return pipeline.process(code, defaultConfig);
    };
  }
}
