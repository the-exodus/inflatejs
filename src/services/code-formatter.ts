/**
 * CodeFormatter implementation
 * Single Responsibility: Formatting code with Prettier
 */

import * as prettier from 'prettier';
import { ICodeFormatter } from '../interfaces';

export class CodeFormatter implements ICodeFormatter {
  /**
   * Format code using Prettier
   * @param code - The code to format
   * @param parser - The parser to use (default: 'babel')
   * @returns Formatted code
   */
  public format(code: string, parser: string = 'babel'): string {
    try {
      // prettier.format is synchronous in the version we're using
      // Type assertion to handle version differences
      const result = prettier.format(code, {
        parser,
        semi: true,
        singleQuote: true,
        trailingComma: 'es5',
        printWidth: 80
      }) as any;

      // Handle both sync and async returns
      return typeof result === 'string' ? result : code;
    } catch (error) {
      // If formatting fails, return original code
      console.warn('Prettier formatting failed, returning original code.');
      return code;
    }
  }
}
