/**
 * CodeGenerator implementation
 * Single Responsibility: Generating JavaScript code from AST
 */

import generate from '@babel/generator';
import * as t from '@babel/types';
import { ICodeGenerator } from '../interfaces';

export class CodeGenerator implements ICodeGenerator {
  /**
   * Generate JavaScript code from AST
   * @param ast - The AST to generate code from
   * @returns Generated JavaScript code
   */
  public generate(ast: t.File): string {
    const output = generate(ast, {
      retainLines: false,
      comments: true
    });
    return output.code;
  }
}
