/**
 * CodeParser implementation
 * Single Responsibility: Parsing JavaScript code into AST
 */

import * as parser from '@babel/parser';
import * as t from '@babel/types';
import { ICodeParser } from '../interfaces';

export class CodeParser implements ICodeParser {
  /**
   * Parse JavaScript code into an AST
   * @param code - The JavaScript code to parse
   * @returns Parsed AST
   */
  public parse(code: string): t.File {
    return parser.parse(code, {
      sourceType: 'module',
      plugins: []
    });
  }
}
