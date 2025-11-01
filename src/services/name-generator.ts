/**
 * NameGenerator implementation
 * Single Responsibility: Generating meaningful variable names
 */

import { INameGenerator, NameContext } from '../interfaces';

export class NameGenerator implements INameGenerator {
  private usedNames: Set<string> = new Set();
  private nameCounters: Map<string, number> = new Map();

  // Base names for different contexts
  private readonly parameterNames = ['param', 'value', 'item', 'element', 'data'];
  private readonly variableNames = ['var', 'temp', 'result', 'obj', 'arr'];

  /**
   * Generate a meaningful name based on context
   * @param originalName - The original (minified) name
   * @param context - Context information for name generation
   * @returns Generated name
   */
  public generateName(originalName: string, context: NameContext): string {
    // If not a minified name, return as-is
    if (!this.isMinifiedName(originalName)) {
      return originalName;
    }

    let baseName: string;

    if (context.isParameter && context.parameterIndex !== undefined) {
      // Use parameter-specific names
      baseName = this.parameterNames[context.parameterIndex % this.parameterNames.length];
    } else {
      // Use generic variable names
      baseName = this.variableNames[0];
    }

    return this.getUniqueName(baseName);
  }

  /**
   * Reset the name generator state
   */
  public reset(): void {
    this.usedNames.clear();
    this.nameCounters.clear();
  }

  /**
   * Check if a name looks minified
   */
  private isMinifiedName(name: string): boolean {
    return /^[a-z]$|^[a-z][0-9]+$/.test(name);
  }

  /**
   * Get a unique name by adding a number suffix if needed
   */
  private getUniqueName(baseName: string): string {
    if (!this.usedNames.has(baseName)) {
      this.usedNames.add(baseName);
      return baseName;
    }

    const counter = this.nameCounters.get(baseName) || 2;
    let uniqueName = `${baseName}${counter}`;

    while (this.usedNames.has(uniqueName)) {
      this.nameCounters.set(baseName, counter + 1);
      uniqueName = `${baseName}${counter + 1}`;
    }

    this.nameCounters.set(baseName, counter + 1);
    this.usedNames.add(uniqueName);
    return uniqueName;
  }
}
