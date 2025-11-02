/**
 * ScopeManager implementation
 * Single Responsibility: Managing variable names across scopes
 */

import { IScopeManager, INameGenerator, NameContext } from '../interfaces';

export class ScopeManager implements IScopeManager {
  // Map of scope ID -> (original name -> renamed name)
  private scopeMappings: Map<string, Map<string, string>> = new Map();

  constructor(private nameGenerator: INameGenerator) {}

  /**
   * Get or create a mapping for a variable in a scope
   * @param name - Original variable name
   * @param scopeId - Unique identifier for the scope
   * @param context - Context for name generation
   * @returns The mapped name (existing or newly generated)
   */
  public getOrCreateMapping(name: string, scopeId: string, context: NameContext): string {
    if (!this.scopeMappings.has(scopeId)) {
      this.scopeMappings.set(scopeId, new Map());
    }

    const scopeMap = this.scopeMappings.get(scopeId)!;

    if (scopeMap.has(name)) {
      return scopeMap.get(name)!;
    }

    const newName = this.nameGenerator.generateName(name, context);
    scopeMap.set(name, newName);
    return newName;
  }

  /**
   * Check if a mapping exists for a variable in a scope
   */
  public hasMapping(name: string, scopeId: string): boolean {
    return this.scopeMappings.get(scopeId)?.has(name) ?? false;
  }

  /**
   * Get an existing mapping for a variable in a scope
   */
  public getMapping(name: string, scopeId: string): string | undefined {
    return this.scopeMappings.get(scopeId)?.get(name);
  }

  /**
   * Get all rename mappings across all scopes
   * Returns a map of originalName -> renamedName
   */
  public getAllRenameMappings(): Map<string, string> {
    const allMappings = new Map<string, string>();

    for (const scopeMap of this.scopeMappings.values()) {
      for (const [originalName, renamedName] of scopeMap.entries()) {
        // Store the mapping - note that the same original name might exist in multiple scopes
        // In that case, we'll use the most recent mapping (which should be fine for our purposes)
        allMappings.set(originalName, renamedName);
      }
    }

    return allMappings;
  }

  /**
   * Clear all scope mappings
   */
  public clear(): void {
    this.scopeMappings.clear();
  }
}
