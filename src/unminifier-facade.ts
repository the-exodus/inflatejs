/**
 * Unminifier Facade
 * Provides backward compatibility with the old unminify function
 * Implements the Facade pattern to simplify the interface
 */

import { UnminificationFactory } from './factories/unminification-factory';
import { UnminificationConfig } from './interfaces';

export interface UnminifyOptions {
  renameVariables?: boolean;
  inferTypes?: boolean;
  outputTypeScript?: boolean;
  outputFormat?: 'js' | 'ts'; // For backward compatibility
}

/**
 * Unminify JavaScript code
 * This is a facade function that maintains backward compatibility
 * with the original API while using the new modular architecture
 *
 * @param code - The minified JavaScript code
 * @param options - Unminification options
 * @returns Unminified and formatted code
 */
export function unminify(code: string, options: UnminifyOptions = {}): string {
  // Support both outputTypeScript and outputFormat for backward compatibility
  const outputTypeScript = options.outputTypeScript ?? (options.outputFormat === 'ts');

  const config: UnminificationConfig = {
    renameVariables: options.renameVariables ?? true,
    inferTypes: options.inferTypes ?? false,
    outputTypeScript,
    maxDepth: 8,
    maxTime: 5000
  };

  const pipeline = UnminificationFactory.createPipeline(config);
  return pipeline.process(code, config);
}
